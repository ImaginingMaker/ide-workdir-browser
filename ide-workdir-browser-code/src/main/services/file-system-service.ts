import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import {
  access,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  stat
} from 'node:fs/promises'
import { constants } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, isAbsolute, join, parse, relative, resolve } from 'node:path'
import type {
  DropCopyPreflight,
  DropCopyRequest,
  DropCopyResult,
  DirectoryListing,
  FileOperationUndoResult,
  FileItem,
  PreviewResponse,
  AgentConfig,
  ResolvedAgent,
  SearchRequest,
  SearchResponse
} from '@shared/contracts'
import {
  imageMimeForExtension,
  isKnownTextExtension,
  isMarkdownExtension
} from '@shared/file-types'
import type { SettingsService } from './settings-service'
import { PathPolicy } from './path-policy'
import { isDirectoryLike } from '@shared/file-item'

const TEXT_LIMIT = 2 * 1024 * 1024
const IMAGE_LIMIT = 10 * 1024 * 1024
const BINARY_LIMIT = 512 * 1024
const THUMBNAIL_SIZE = { width: 96, height: 96 }
const THUMBNAIL_SOURCE_LIMIT = 50 * 1024 * 1024
const THUMBNAIL_FALLBACK_LIMIT = 1024 * 1024
const UNSUPPORTED_PREVIEW_FILENAMES: ReadonlySet<string> = new Set(['.DS_Store'])

export const isFileAccessDeniedError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException).code
  return code === 'EACCES' || code === 'EPERM'
}

const decodeUtf8Text = (buffer: Buffer): { content: string; message?: string } => {
  try {
    return {
      content: new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    }
  } catch {
    return {
      content: new TextDecoder('utf-8').decode(buffer),
      message: '文件包含非标准 UTF-8 字节，已使用替换字符显示'
    }
  }
}

interface NativeThumbnailImage {
  isEmpty(): boolean
  toDataURL(): string
}

interface NativeImageModule {
  createThumbnailFromPath(
    path: string,
    size: { width: number; height: number }
  ): Promise<NativeThumbnailImage>
}

type ImageThumbnailGenerator = (
  filePath: string,
  mimeType: string,
  size: number
) => Promise<string | null>
type TrashItemAction = (filePath: string) => Promise<void>

const loadNativeImage = async (): Promise<NativeImageModule | null> => {
  const electronModule: unknown = await import('electron').catch(() => null)
  if (!electronModule || typeof electronModule !== 'object') return null

  const candidate = (electronModule as { nativeImage?: unknown }).nativeImage
  if (!candidate || typeof candidate !== 'object') return null
  if (
    typeof (candidate as { createThumbnailFromPath?: unknown }).createThumbnailFromPath !==
    'function'
  ) {
    return null
  }

  return candidate as NativeImageModule
}

const createImageThumbnailDataUrl: ImageThumbnailGenerator = async (filePath, mimeType, size) => {
  if (size <= THUMBNAIL_SOURCE_LIMIT) {
    try {
      const nativeImage = await loadNativeImage()
      const thumbnail = await nativeImage?.createThumbnailFromPath(filePath, THUMBNAIL_SIZE)
      if (thumbnail && !thumbnail.isEmpty()) return thumbnail.toDataURL()
    } catch {
      // Native thumbnailing can fail for malformed files; small files fall back below.
    }
  }

  if (size > THUMBNAIL_FALLBACK_LIMIT) return null

  try {
    const buffer = await readFile(filePath)
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

const trashItemWithShell: TrashItemAction = async (filePath) => {
  const electronModule: unknown = await import('electron')
  const shell = (electronModule as { shell?: { trashItem?: unknown } }).shell
  const trashItem = shell?.trashItem
  if (typeof trashItem !== 'function') {
    throw new Error('当前 Electron 运行时不支持移到废纸篓')
  }
  await (trashItem as TrashItemAction)(filePath)
}

interface SourceSummary {
  itemCount: number
  totalBytes: number
}

interface ReplacementBackup {
  targetPath: string
  backupPath: string
}

interface MovedPath {
  sourceRoot: string
  sourcePath: string
  targetPath: string
}

interface FileOperationRecord {
  agentId: string
  root: string
  backupRoot: string
  createdPaths: string[]
  movedPaths: MovedPath[]
  replacedBackups: ReplacementBackup[]
}

export class FileSystemService {
  private readonly operations = new Map<string, FileOperationRecord>()

  constructor(
    private readonly settings: SettingsService,
    private readonly paths = new PathPolicy(),
    private readonly imageThumbnailGenerator = createImageThumbnailDataUrl,
    private readonly trashItemAction = trashItemWithShell
  ) {}

  async getAgents(): Promise<ResolvedAgent[]> {
    return Promise.all(
      this.settings.get().agents.map(async (agent) => {
        const resolvedWorkdir = this.paths.resolveAgentRoot(agent)
        let status: ResolvedAgent['status'] = 'connected'
        try {
          await access(resolvedWorkdir, constants.R_OK)
        } catch (error) {
          status = isFileAccessDeniedError(error) ? 'permission-required' : 'unavailable'
        }
        return { ...agent, resolvedWorkdir, status }
      })
    )
  }

  async readDirectory(agentId: string, requestedPath: string): Promise<DirectoryListing> {
    const settings = this.settings.get()
    const agent = this.findAgent(agentId)
    const root = this.paths.resolveAgentRoot(agent)
    const directoryPath = await this.secureExistingPath(root, requestedPath)
    const entries = await readdir(directoryPath, { withFileTypes: true })
    const visibleEntries = settings.showHiddenFiles
      ? entries
      : entries.filter((entry) => !entry.name.startsWith('.'))
    const limitedEntries = visibleEntries.slice(0, settings.paginationThreshold)
    const items = await Promise.all(
      limitedEntries.map((entry) => this.toFileItem(directoryPath, entry.name))
    )

    items.sort((left, right) => {
      if (isDirectoryLike(left) && !isDirectoryLike(right)) return -1
      if (!isDirectoryLike(left) && isDirectoryLike(right)) return 1
      return left.name.localeCompare(right.name, 'zh-CN', { numeric: true })
    })

    return {
      path: directoryPath,
      parentPath: directoryPath === root ? null : dirname(directoryPath),
      items,
      truncated: visibleEntries.length > limitedEntries.length
    }
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const settings = this.settings.get()
    const enabledAgents = settings.agents.filter((agent) => agent.enabled)
    const activeAgent = this.findAgent(request.activeAgentId)
    const activeRoot = this.paths.resolveAgentRoot(activeAgent)
    const roots =
      request.scope === 'all'
        ? enabledAgents.map((agent) => ({
            agentId: agent.id,
            path: this.paths.resolveAgentRoot(agent)
          }))
        : [
            {
              agentId: request.activeAgentId,
              path:
                request.scope === 'current-dir'
                  ? await this.secureExistingPath(activeRoot, request.currentPath)
                  : activeRoot
            }
          ]
    const query = request.query.trim().toLocaleLowerCase()
    if (!query) return { results: [], scannedCount: 0, truncated: false }

    const results: SearchResponse['results'] = []
    let scannedCount = 0
    let truncated = false
    const deadline = Date.now() + settings.readTimeout * 1000
    const queue = roots.map((root) => ({ ...root }))
    const visitedDirectories = new Set<string>()

    while (queue.length > 0 && results.length < settings.maxSearchResults) {
      if (Date.now() > deadline) {
        truncated = true
        break
      }
      const current = queue.shift()
      if (!current) break
      if (!(await this.rememberVisitedDirectory(current.path, visitedDirectories))) continue
      let entries
      try {
        entries = await readdir(current.path, { withFileTypes: true })
      } catch {
        continue
      }

      for (const [entryIndex, entry] of entries.entries()) {
        if (!request.showHiddenFiles && entry.name.startsWith('.')) continue
        scannedCount += 1
        const item = await this.toFileItem(current.path, entry.name)
        if (entry.name.toLocaleLowerCase().includes(query)) {
          results.push({ agentId: current.agentId, item })
          if (results.length >= settings.maxSearchResults) {
            truncated = queue.length > 0 || entryIndex < entries.length - 1
            break
          }
        }
        if (
          (entry.isDirectory() && !entry.isSymbolicLink()) ||
          (settings.followSymlinks && isDirectoryLike(item))
        ) {
          queue.push({ agentId: current.agentId, path: item.path })
        }
      }
    }

    return {
      results,
      scannedCount,
      truncated: truncated || queue.length > 0
    }
  }

  async thumbnail(agentId: string, requestedPath: string): Promise<string | null> {
    const agent = this.findAgent(agentId)
    const root = this.paths.resolveAgentRoot(agent)
    const filePath = await this.secureExistingPath(root, requestedPath)
    const metadata = await stat(filePath)
    if (!metadata.isFile()) return null

    const mimeType = imageMimeForExtension(extname(filePath).toLowerCase())
    if (!mimeType) return null

    return this.imageThumbnailGenerator(filePath, mimeType, metadata.size)
  }

  async getFileItem(agentId: string, requestedPath: string): Promise<FileItem> {
    const agent = this.findAgent(agentId)
    const root = this.paths.resolveAgentRoot(agent)
    const filePath = await this.secureExistingPath(root, requestedPath)
    return this.toFileItem(dirname(filePath), basename(filePath))
  }

  async preview(agentId: string, requestedPath: string): Promise<PreviewResponse> {
    const agent = this.findAgent(agentId)
    const root = this.paths.resolveAgentRoot(agent)
    const filePath = await this.secureExistingPath(root, requestedPath)
    const metadata = await stat(filePath)
    if (!metadata.isFile()) return { kind: 'unsupported', message: '请选择文件进行预览' }
    if (UNSUPPORTED_PREVIEW_FILENAMES.has(basename(filePath))) {
      return { kind: 'unsupported', message: 'macOS 系统元数据文件不支持预览' }
    }

    const extension = extname(filePath).toLowerCase()
    const imageMime = imageMimeForExtension(extension)
    const limit = imageMime
      ? IMAGE_LIMIT
      : isKnownTextExtension(extension)
        ? TEXT_LIMIT
        : BINARY_LIMIT

    if (metadata.size > limit) {
      return { kind: 'too-large', message: '文件超过应用内预览限制，请使用外部编辑器打开' }
    }

    const buffer = await readFile(filePath)
    if (imageMime) {
      return { kind: 'image', dataUrl: `data:${imageMime};base64,${buffer.toString('base64')}` }
    }

    if (isKnownTextExtension(extension)) {
      const decoded = decodeUtf8Text(buffer)
      return {
        kind: isMarkdownExtension(extension) ? 'markdown' : 'text',
        content: decoded.content,
        encoding: 'UTF-8',
        message: decoded.message
      }
    }

    return { kind: 'binary', content: this.toHex(buffer), encoding: 'binary' }
  }

  async preflightDropCopy(request: DropCopyRequest): Promise<DropCopyPreflight> {
    const { root, targetDirectory } = await this.secureWritableDirectory(
      request.agentId,
      request.targetDirectory
    )
    const sourcePaths = this.normalizeSourcePaths(request.sourcePaths)
    const conflicts: DropCopyPreflight['conflicts'] = []
    const errors: string[] = []
    let itemCount = 0
    let totalBytes = 0

    for (const sourcePath of sourcePaths) {
      try {
        const safeSourcePath = await this.secureTransferSource(request, sourcePath)
        if (this.isPathInsideOrEqual(safeSourcePath, targetDirectory)) {
          throw new Error('不能将文件夹复制到它自身或其子目录中')
        }
        const summary = await this.summarizeSource(safeSourcePath)
        itemCount += summary.itemCount
        totalBytes += summary.totalBytes
        const targetPath = this.paths.assertWithinRoot(
          root,
          join(targetDirectory, basename(safeSourcePath))
        )
        if (request.operation === 'cut' && resolve(safeSourcePath) === resolve(targetPath)) continue
        if (await this.pathExists(targetPath)) {
          conflicts.push({
            name: basename(safeSourcePath),
            sourcePath: safeSourcePath,
            targetPath
          })
        }
      } catch (error) {
        errors.push(`${basename(sourcePath)}：${(error as Error).message}`)
      }
    }

    return {
      targetDirectory,
      sourceCount: sourcePaths.length,
      itemCount,
      totalBytes,
      conflicts,
      errors
    }
  }

  async copyDroppedItems(request: DropCopyRequest): Promise<DropCopyResult> {
    const { root, targetDirectory } = await this.secureWritableDirectory(
      request.agentId,
      request.targetDirectory
    )
    const sourcePaths = this.normalizeSourcePaths(request.sourcePaths)
    const sourceRoot = request.sourceAgentId
      ? this.paths.resolveAgentRoot(this.findAgent(request.sourceAgentId))
      : null
    const operationId = randomUUID()
    const backupRoot = await mkdtemp(join(tmpdir(), 'workdir-browser-operation-'))
    const record: FileOperationRecord = {
      agentId: request.agentId,
      root,
      backupRoot,
      createdPaths: [],
      movedPaths: [],
      replacedBackups: []
    }
    const result: DropCopyResult = {
      operationId,
      copied: 0,
      moved: 0,
      skipped: 0,
      replaced: 0,
      renamed: 0,
      errors: []
    }

    for (const sourcePath of sourcePaths) {
      let destinationPath = ''
      let backup: ReplacementBackup | null = null
      try {
        const safeSourcePath = await this.secureTransferSource(request, sourcePath)
        const metadata = await lstat(safeSourcePath)
        if (this.isPathInsideOrEqual(safeSourcePath, targetDirectory)) {
          throw new Error('不能将文件夹复制到它自身或其子目录中')
        }

        destinationPath = this.paths.assertWithinRoot(
          root,
          join(targetDirectory, basename(safeSourcePath))
        )
        if (request.operation === 'cut' && resolve(safeSourcePath) === resolve(destinationPath)) {
          result.skipped += 1
          continue
        }
        const destinationExists = await this.pathExists(destinationPath)
        if (destinationExists) {
          if (request.conflictStrategy === 'skip') {
            result.skipped += 1
            continue
          }
          if (request.conflictStrategy === 'keep-both') {
            destinationPath = await this.createUniqueDestination(destinationPath, metadata)
            result.renamed += 1
          } else {
            if (resolve(safeSourcePath) === resolve(destinationPath)) {
              throw new Error('源文件和目标文件相同，无法替换')
            }
            backup = {
              targetPath: destinationPath,
              backupPath: join(
                backupRoot,
                'replaced',
                `${record.replacedBackups.length}-${basename(safeSourcePath)}`
              )
            }
            await this.copyPath(destinationPath, backup.backupPath)
            await rm(destinationPath, { recursive: true, force: true })
          }
        }

        await this.copyPath(safeSourcePath, destinationPath)
        if (request.operation === 'cut') {
          if (!sourceRoot) throw new Error('剪切操作缺少来源 Agent')
          await rm(safeSourcePath, { recursive: true, force: false })
          record.movedPaths.push({
            sourceRoot,
            sourcePath: safeSourcePath,
            targetPath: destinationPath
          })
          result.moved += 1
        } else {
          record.createdPaths.push(destinationPath)
          result.copied += 1
        }
        if (backup) {
          record.replacedBackups.push(backup)
          result.replaced += 1
        }
      } catch (error) {
        result.errors.push(`${basename(sourcePath)}：${(error as Error).message}`)
        if (destinationPath && !backup) {
          await rm(destinationPath, { recursive: true, force: true }).catch(() => undefined)
        }
        if (backup) {
          await rm(destinationPath, { recursive: true, force: true }).catch(() => undefined)
          try {
            await this.copyPath(backup.backupPath, backup.targetPath)
            await rm(backup.backupPath, { recursive: true, force: true })
          } catch (restoreError) {
            result.errors.push(
              `${basename(sourcePath)} 恢复失败：${(restoreError as Error).message}`
            )
            record.replacedBackups.push(backup)
          }
        }
      }
    }

    if (
      record.createdPaths.length > 0 ||
      record.movedPaths.length > 0 ||
      record.replacedBackups.length > 0
    ) {
      this.operations.set(operationId, record)
    } else {
      await rm(backupRoot, { recursive: true, force: true })
    }

    return result
  }

  async undoFileOperation(agentId: string, operationId: string): Promise<FileOperationUndoResult> {
    const record = this.operations.get(operationId)
    if (!record || record.agentId !== agentId) throw new Error('找不到可撤销的文件操作')

    const errors: string[] = []
    let restored = 0
    for (const createdPath of [...record.createdPaths].sort(
      (left, right) => right.length - left.length
    )) {
      try {
        await rm(this.paths.assertWithinRoot(record.root, createdPath), {
          recursive: true,
          force: true
        })
        restored += 1
      } catch (error) {
        errors.push(`${basename(createdPath)} 删除失败：${(error as Error).message}`)
      }
    }

    for (const movedPath of record.movedPaths) {
      try {
        const safeSourcePath = this.paths.assertWithinRoot(
          movedPath.sourceRoot,
          movedPath.sourcePath
        )
        const safeTargetPath = this.paths.assertWithinRoot(record.root, movedPath.targetPath)
        await this.copyPath(safeTargetPath, safeSourcePath)
        await rm(safeTargetPath, { recursive: true, force: true })
        restored += 1
      } catch (error) {
        errors.push(`${basename(movedPath.sourcePath)} 移回失败：${(error as Error).message}`)
      }
    }

    for (const backup of record.replacedBackups) {
      try {
        await this.copyPath(
          backup.backupPath,
          this.paths.assertWithinRoot(record.root, backup.targetPath)
        )
        restored += 1
      } catch (error) {
        errors.push(`${basename(backup.targetPath)} 恢复失败：${(error as Error).message}`)
      }
    }

    await rm(record.backupRoot, { recursive: true, force: true })
    this.operations.delete(operationId)

    return { operationId, restored, errors }
  }

  async trashItem(agentId: string, requestedPath: string): Promise<void> {
    const agent = this.findAgent(agentId)
    const root = this.paths.resolveAgentRoot(agent)
    const targetPath = await this.secureTrashablePath(root, requestedPath)
    await this.trashItemAction(targetPath)
  }

  async resolveSafePath(agentId: string, requestedPath: string): Promise<string> {
    const agent = this.findAgent(agentId)
    return this.secureExistingPath(this.paths.resolveAgentRoot(agent), requestedPath)
  }

  private findAgent(agentId: string): AgentConfig {
    const agent = this.settings.get().agents.find((candidate) => candidate.id === agentId)
    if (!agent || !agent.enabled) throw new Error('工作区不存在或已禁用')
    return agent
  }

  private async secureExistingPath(root: string, requestedPath: string): Promise<string> {
    const target = this.paths.assertWithinRoot(root, requestedPath)
    await access(target, constants.R_OK)
    return target
  }

  private async secureTransferSource(
    request: DropCopyRequest,
    requestedPath: string
  ): Promise<string> {
    if (!request.sourceAgentId) {
      const sourcePath = resolve(requestedPath)
      await access(sourcePath, constants.R_OK)
      return sourcePath
    }

    const sourceRoot = this.paths.resolveAgentRoot(this.findAgent(request.sourceAgentId))
    return this.secureExistingPath(sourceRoot, requestedPath)
  }

  private async secureWritableDirectory(
    agentId: string,
    requestedPath: string
  ): Promise<{ root: string; targetDirectory: string }> {
    const agent = this.findAgent(agentId)
    const root = this.paths.resolveAgentRoot(agent)
    const targetDirectory = this.paths.assertWithinRoot(root, requestedPath)
    const metadata = await stat(targetDirectory)
    if (!metadata.isDirectory()) throw new Error('拖入目标必须是文件夹')
    await access(targetDirectory, constants.R_OK | constants.W_OK)
    return { root, targetDirectory }
  }

  private async secureTrashablePath(root: string, requestedPath: string): Promise<string> {
    const targetPath = this.paths.assertWithinRoot(root, requestedPath)
    if (resolve(targetPath) === resolve(root)) {
      throw new Error('不能将 Agent 工作目录根目录移到废纸篓')
    }

    const [metadata, rootRealPath] = await Promise.all([lstat(targetPath), realpath(root)])
    const parentPath = dirname(targetPath)
    const parentRealPath = await realpath(parentPath)
    if (!this.isPathInsideOrEqual(rootRealPath, parentRealPath)) {
      throw new Error('不能通过符号链接目录移到废纸篓外部目标')
    }

    if (!metadata.isSymbolicLink()) {
      const targetRealPath = await realpath(targetPath)
      if (!this.isPathInsideOrEqual(rootRealPath, targetRealPath)) {
        throw new Error('不能通过符号链接目录移到废纸篓外部目标')
      }
    }

    await access(parentPath, constants.R_OK | constants.W_OK)
    return targetPath
  }

  private normalizeSourcePaths(sourcePaths: string[]): string[] {
    return [
      ...new Set(
        sourcePaths
          .filter((sourcePath) => sourcePath.length > 0)
          .map((sourcePath) => resolve(sourcePath))
      )
    ]
  }

  private async summarizeSource(sourcePath: string): Promise<SourceSummary> {
    const metadata = await lstat(sourcePath)
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      return { itemCount: 1, totalBytes: metadata.size }
    }

    const entries = await readdir(sourcePath)
    const childSummaries = await Promise.all(
      entries.map((entry) => this.summarizeSource(join(sourcePath, entry)))
    )
    return childSummaries.reduce<SourceSummary>(
      (summary, child) => ({
        itemCount: summary.itemCount + child.itemCount,
        totalBytes: summary.totalBytes + child.totalBytes
      }),
      { itemCount: 1, totalBytes: 0 }
    )
  }

  private async createUniqueDestination(
    targetPath: string,
    metadata: Awaited<ReturnType<typeof lstat>>
  ): Promise<string> {
    const parsed = parse(targetPath)
    const isDirectory = metadata.isDirectory() && !metadata.isSymbolicLink()
    const baseName = isDirectory || !parsed.ext ? basename(targetPath) : parsed.name
    const extension = isDirectory ? '' : parsed.ext
    for (let index = 1; index < 1000; index += 1) {
      const suffix = index === 1 ? ' copy' : ` copy ${index}`
      const candidate = join(parsed.dir, `${baseName}${suffix}${extension}`)
      if (!(await this.pathExists(candidate))) return candidate
    }
    throw new Error('无法生成不冲突的目标文件名')
  }

  private async copyPath(sourcePath: string, targetPath: string): Promise<void> {
    await this.runCommand('/bin/mkdir', ['-p', dirname(targetPath)])
    await this.runCommand('/usr/bin/ditto', [sourcePath, targetPath])
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    await new Promise<void>((resolveCommand, rejectCommand) => {
      const child = spawn(command, args, { stdio: 'ignore' })
      child.on('error', rejectCommand)
      child.on('close', (code) => {
        if (code === 0) {
          resolveCommand()
        } else {
          rejectCommand(new Error(`${basename(command)} 退出码 ${code ?? 'unknown'}`))
        }
      })
    })
  }

  private async rememberVisitedDirectory(
    directoryPath: string,
    visitedDirectories: Set<string>
  ): Promise<boolean> {
    const visitKey = await realpath(directoryPath).catch(() => resolve(directoryPath))
    if (visitedDirectories.has(visitKey)) return false
    visitedDirectories.add(visitKey)
    return true
  }

  private isPathInsideOrEqual(parentPath: string, childPath: string): boolean {
    const relativePath = relative(resolve(parentPath), resolve(childPath))
    return (
      relativePath === '' ||
      (!!relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath))
    )
  }

  private async toFileItem(directoryPath: string, name: string): Promise<FileItem> {
    const path = this.paths.assertWithinRoot(directoryPath, name)
    const metadata = await lstat(path)
    const extension = extname(name).toLowerCase()
    let symlinkTarget: string | undefined
    let symlinkTargetType: FileItem['symlinkTargetType']
    if (metadata.isSymbolicLink()) {
      try {
        symlinkTarget = await readlink(path)
        const targetMetadata = await stat(path)
        symlinkTargetType = targetMetadata.isDirectory() ? 'directory' : 'file'
      } catch {
        symlinkTarget = undefined
        symlinkTargetType = undefined
      }
    }

    return {
      name,
      path,
      type: metadata.isSymbolicLink() ? 'symlink' : metadata.isDirectory() ? 'directory' : 'file',
      size: metadata.size,
      mimeType: imageMimeForExtension(extension) ?? 'application/octet-stream',
      modifiedAt: metadata.mtimeMs,
      createdAt: metadata.birthtimeMs,
      isHidden: basename(name).startsWith('.'),
      isReadable: true,
      extension,
      symlinkTarget,
      symlinkTargetType
    }
  }

  private toHex(buffer: Buffer): string {
    const rows: string[] = []
    for (let offset = 0; offset < buffer.length; offset += 16) {
      const chunk = buffer.subarray(offset, offset + 16)
      const hex = [...chunk].map((byte) => byte.toString(16).padStart(2, '0')).join(' ')
      const text = [...chunk]
        .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'))
        .join('')
      rows.push(`${offset.toString(16).padStart(8, '0')}  ${hex.padEnd(47)}  ${text}`)
    }
    return rows.join('\n')
  }
}
