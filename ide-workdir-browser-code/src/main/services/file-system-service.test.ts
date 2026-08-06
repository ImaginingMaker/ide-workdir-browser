import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '@shared/contracts'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { FileSystemService, isFileAccessDeniedError } from './file-system-service'
import type { SettingsService } from './settings-service'

it.each(['EACCES', 'EPERM'])('recognizes %s as a denied folder permission', (code) => {
  expect(isFileAccessDeniedError(Object.assign(new Error(code), { code }))).toBe(true)
})

describe('FileSystemService', () => {
  let root: string
  let externalRoot: string
  let cursorRoot: string
  let settings: AppSettings
  let service: FileSystemService

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'workdir-browser-'))
    externalRoot = await mkdtemp(join(tmpdir(), 'workdir-browser-external-'))
    cursorRoot = await mkdtemp(join(tmpdir(), 'workdir-browser-cursor-'))
    await mkdir(join(root, 'folder'))
    await writeFile(join(root, 'README.md'), '# Test')
    await writeFile(join(root, '.hidden'), 'secret')
    await writeFile(join(root, 'folder', 'index.ts'), 'export const value = 1')
    await writeFile(join(externalRoot, 'linked.md'), '# Linked')
    await symlink(externalRoot, join(root, 'linked-directory'))
    await symlink(externalRoot, join(root, 'folder', 'nested-linked-directory'))
    await symlink(join(externalRoot, 'linked.md'), join(root, 'folder', 'linked-file.md'))
    settings = {
      ...structuredClone(DEFAULT_SETTINGS),
      agents: [
        { ...DEFAULT_SETTINGS.agents[0], workdir: root },
        { ...DEFAULT_SETTINGS.agents[2], workdir: cursorRoot }
      ]
    }
    service = new FileSystemService({ get: () => settings } as SettingsService)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
    await rm(externalRoot, { recursive: true, force: true })
    await rm(cursorRoot, { recursive: true, force: true })
  })

  it('lists directories while filtering hidden files', async () => {
    const listing = await service.readDirectory('codex', root)

    expect(listing.items.map((item) => item.name)).toEqual([
      'folder',
      'linked-directory',
      'README.md'
    ])
    expect(listing.parentPath).toBeNull()
  })

  it('returns file metadata directly even when the item is hidden from directory listings', async () => {
    const item = await service.getFileItem('codex', join(root, '.hidden'))

    expect(item).toMatchObject({
      name: '.hidden',
      path: join(root, '.hidden'),
      type: 'file',
      isHidden: true
    })
  })

  it('allows directory symlinks whose targets are outside the workspace', async () => {
    const rootListing = await service.readDirectory('codex', root)
    const linkedDirectory = rootListing.items.find((item) => item.name === 'linked-directory')

    expect(linkedDirectory).toMatchObject({
      type: 'symlink',
      symlinkTargetType: 'directory'
    })
    const linkedListing = await service.readDirectory('codex', linkedDirectory!.path)
    expect(linkedListing.items.map((item) => item.name)).toEqual(['linked.md'])
    await expect(
      service.preview('codex', join(root, 'linked-directory', 'linked.md'))
    ).resolves.toMatchObject({ kind: 'markdown', content: '# Linked' })
  })

  it('allows file and directory symlinks at any depth in the workspace', async () => {
    const folderListing = await service.readDirectory('codex', join(root, 'folder'))
    const linkedDirectory = folderListing.items.find(
      (item) => item.name === 'nested-linked-directory'
    )
    const linkedFile = folderListing.items.find((item) => item.name === 'linked-file.md')

    expect(linkedDirectory).toMatchObject({
      type: 'symlink',
      symlinkTargetType: 'directory'
    })
    expect(linkedFile).toMatchObject({
      type: 'symlink',
      symlinkTargetType: 'file'
    })
    await expect(service.readDirectory('codex', linkedDirectory!.path)).resolves.toMatchObject({
      path: join(root, 'folder', 'nested-linked-directory')
    })
    await expect(service.preview('codex', linkedFile!.path)).resolves.toMatchObject({
      kind: 'markdown',
      content: '# Linked'
    })
    await expect(service.resolveSafePath('codex', linkedFile!.path)).resolves.toBe(linkedFile!.path)
  })

  it('previews markdown', async () => {
    const preview = await service.preview('codex', join(root, 'README.md'))

    expect(preview).toMatchObject({ kind: 'markdown', content: '# Test' })
  })

  it('previews JSON as UTF-8 text', async () => {
    await writeFile(join(root, 'settings.json'), '{"enabled":true}')

    await expect(service.preview('codex', join(root, 'settings.json'))).resolves.toMatchObject({
      kind: 'text',
      content: '{"enabled":true}',
      encoding: 'UTF-8'
    })
  })

  it('keeps known text extensions out of binary hex preview when bytes are imperfect', async () => {
    await writeFile(join(root, 'settings.json'), Buffer.from([0x7b, 0xff, 0x7d]))

    await expect(service.preview('codex', join(root, 'settings.json'))).resolves.toMatchObject({
      kind: 'text',
      content: '{�}',
      encoding: 'UTF-8',
      message: '文件包含非标准 UTF-8 字节，已使用替换字符显示'
    })
  })

  it('does not preview macOS .DS_Store metadata as extensionless text', async () => {
    await writeFile(join(root, '.DS_Store'), Buffer.from([0, 0, 0, 1, 0x42, 0x75, 0x64, 0x31]))

    await expect(service.preview('codex', join(root, '.DS_Store'))).resolves.toEqual({
      kind: 'unsupported',
      message: 'macOS 系统元数据文件不支持预览'
    })
  })

  it('previews JSONC and common image formats', async () => {
    await writeFile(join(root, 'settings.jsonc'), '{// note\n"enabled":true}')
    await writeFile(join(root, 'preview.avif'), Buffer.from([0, 1, 2, 3]))

    await expect(service.preview('codex', join(root, 'settings.jsonc'))).resolves.toMatchObject({
      kind: 'text',
      content: '{// note\n"enabled":true}',
      encoding: 'UTF-8'
    })
    await expect(service.preview('codex', join(root, 'preview.avif'))).resolves.toMatchObject({
      kind: 'image',
      dataUrl: 'data:image/avif;base64,AAECAw=='
    })
  })

  it('returns thumbnails for image files only', async () => {
    await writeFile(join(root, 'preview.png'), Buffer.from([0, 1, 2, 3]))

    await expect(service.thumbnail('codex', join(root, 'preview.png'))).resolves.toBe(
      'data:image/png;base64,AAECAw=='
    )
    await expect(service.thumbnail('codex', join(root, 'README.md'))).resolves.toBeNull()
    await expect(service.thumbnail('codex', join(root, 'folder'))).resolves.toBeNull()
  })

  it('preflights Finder drops and reports target conflicts', async () => {
    await writeFile(join(externalRoot, 'README.md'), '# Incoming')
    await writeFile(join(externalRoot, 'notes.txt'), 'notes')

    const preflight = await service.preflightDropCopy({
      agentId: 'codex',
      targetDirectory: root,
      sourcePaths: [join(externalRoot, 'README.md'), join(externalRoot, 'notes.txt')],
      conflictStrategy: 'keep-both'
    })

    expect(preflight).toMatchObject({
      targetDirectory: root,
      sourceCount: 2,
      itemCount: 2,
      conflicts: [{ name: 'README.md', targetPath: join(root, 'README.md') }],
      errors: []
    })
    expect(preflight.totalBytes).toBeGreaterThan(0)
  })

  it('keeps both conflicting dropped files and supports undo', async () => {
    await writeFile(join(externalRoot, 'README.md'), '# Incoming')

    const result = await service.copyDroppedItems({
      agentId: 'codex',
      targetDirectory: root,
      sourcePaths: [join(externalRoot, 'README.md')],
      conflictStrategy: 'keep-both'
    })

    expect(result).toMatchObject({ copied: 1, renamed: 1, replaced: 0, errors: [] })
    await expect(readFile(join(root, 'README copy.md'), 'utf8')).resolves.toBe('# Incoming')

    await expect(service.undoFileOperation('codex', result.operationId)).resolves.toMatchObject({
      restored: 1,
      errors: []
    })
    await expect(readFile(join(root, 'README copy.md'), 'utf8')).rejects.toThrow()
    await expect(readFile(join(root, 'README.md'), 'utf8')).resolves.toBe('# Test')
  })

  it('replaces conflicting dropped files and restores originals on undo', async () => {
    await writeFile(join(externalRoot, 'README.md'), '# Replacement')

    const result = await service.copyDroppedItems({
      agentId: 'codex',
      targetDirectory: root,
      sourcePaths: [join(externalRoot, 'README.md')],
      conflictStrategy: 'replace'
    })

    expect(result).toMatchObject({ copied: 1, replaced: 1, errors: [] })
    await expect(readFile(join(root, 'README.md'), 'utf8')).resolves.toBe('# Replacement')

    await expect(service.undoFileOperation('codex', result.operationId)).resolves.toMatchObject({
      restored: 2,
      errors: []
    })
    await expect(readFile(join(root, 'README.md'), 'utf8')).resolves.toBe('# Test')
  })

  it('copies an internal selection from one agent workdir to another', async () => {
    const preflight = await service.preflightDropCopy({
      agentId: 'cursor',
      sourceAgentId: 'codex',
      operation: 'copy',
      targetDirectory: cursorRoot,
      sourcePaths: [join(root, 'folder')],
      conflictStrategy: 'keep-both'
    })

    expect(preflight).toMatchObject({
      targetDirectory: cursorRoot,
      sourceCount: 1,
      conflicts: [],
      errors: []
    })

    const result = await service.copyDroppedItems({
      agentId: 'cursor',
      sourceAgentId: 'codex',
      operation: 'copy',
      targetDirectory: cursorRoot,
      sourcePaths: [join(root, 'folder')],
      conflictStrategy: 'keep-both'
    })

    expect(result).toMatchObject({ copied: 1, moved: 0, errors: [] })
    await expect(readFile(join(cursorRoot, 'folder', 'index.ts'), 'utf8')).resolves.toBe(
      'export const value = 1'
    )
    await expect(readFile(join(root, 'folder', 'index.ts'), 'utf8')).resolves.toBe(
      'export const value = 1'
    )
  })

  it('cuts an internal selection across agents and can undo the move', async () => {
    const result = await service.copyDroppedItems({
      agentId: 'cursor',
      sourceAgentId: 'codex',
      operation: 'cut',
      targetDirectory: cursorRoot,
      sourcePaths: [join(root, 'folder')],
      conflictStrategy: 'keep-both'
    })

    expect(result).toMatchObject({ copied: 0, moved: 1, errors: [] })
    await expect(readFile(join(cursorRoot, 'folder', 'index.ts'), 'utf8')).resolves.toBe(
      'export const value = 1'
    )
    await expect(readFile(join(root, 'folder', 'index.ts'), 'utf8')).rejects.toThrow()

    await expect(service.undoFileOperation('cursor', result.operationId)).resolves.toMatchObject({
      restored: 1,
      errors: []
    })
    await expect(readFile(join(root, 'folder', 'index.ts'), 'utf8')).resolves.toBe(
      'export const value = 1'
    )
    await expect(readFile(join(cursorRoot, 'folder', 'index.ts'), 'utf8')).rejects.toThrow()
  })

  it('moves a workspace item to the macOS trash through the injected native action', async () => {
    const trashItem = vi.fn().mockResolvedValue(undefined)
    const trashService = new FileSystemService(
      { get: () => settings } as SettingsService,
      undefined,
      undefined,
      trashItem
    )

    await trashService.trashItem('codex', join(root, 'README.md'))

    expect(trashItem).toHaveBeenCalledWith(join(root, 'README.md'))
  })

  it('rejects trashing the Agent workspace root', async () => {
    const trashItem = vi.fn().mockResolvedValue(undefined)
    const trashService = new FileSystemService(
      { get: () => settings } as SettingsService,
      undefined,
      undefined,
      trashItem
    )

    await expect(trashService.trashItem('codex', root)).rejects.toThrow(
      '不能将 Agent 工作目录根目录移到废纸篓'
    )
    expect(trashItem).not.toHaveBeenCalled()
  })

  it('trashes a symlink entry without following it to the external target', async () => {
    const trashItem = vi.fn().mockResolvedValue(undefined)
    const trashService = new FileSystemService(
      { get: () => settings } as SettingsService,
      undefined,
      undefined,
      trashItem
    )
    const symlinkPath = join(root, 'linked-directory')

    await trashService.trashItem('codex', symlinkPath)

    expect(trashItem).toHaveBeenCalledWith(symlinkPath)
  })

  it('rejects trashing external real files through a symlink directory path', async () => {
    const trashItem = vi.fn().mockResolvedValue(undefined)
    const trashService = new FileSystemService(
      { get: () => settings } as SettingsService,
      undefined,
      undefined,
      trashItem
    )

    await expect(
      trashService.trashItem('codex', join(root, 'linked-directory', 'linked.md'))
    ).rejects.toThrow('不能通过符号链接目录移到废纸篓外部目标')
    expect(trashItem).not.toHaveBeenCalled()
  })

  it('searches recursively and rejects an escaped current path', async () => {
    const response = await service.search({
      query: 'index',
      scope: 'agent',
      currentPath: root,
      activeAgentId: 'codex',
      showHiddenFiles: false
    })

    expect(response.results[0].item.name).toBe('index.ts')
    await expect(
      service.search({
        query: 'secret',
        scope: 'current-dir',
        currentPath: tmpdir(),
        activeAgentId: 'codex',
        showHiddenFiles: false
      })
    ).rejects.toThrow('拒绝访问工作目录之外的路径')
  })

  it('deduplicates real directories when following symlink cycles during search', async () => {
    await symlink(root, join(root, 'folder', 'loop-to-root'))
    settings.followSymlinks = true
    settings.maxSearchResults = 20

    const response = await service.search({
      query: 'README',
      scope: 'agent',
      currentPath: root,
      activeAgentId: 'codex',
      showHiddenFiles: false
    })

    expect(response.results.map((result) => result.item.path)).toEqual([join(root, 'README.md')])
    expect(response.truncated).toBe(false)
  })

  it('marks search results truncated when the max result limit stops a directory scan', async () => {
    const manyMatches = join(root, 'many-matches')
    await mkdir(manyMatches)
    await writeFile(join(manyMatches, 'match-1.txt'), '1')
    await writeFile(join(manyMatches, 'match-2.txt'), '2')
    await writeFile(join(manyMatches, 'match-3.txt'), '3')
    settings.maxSearchResults = 2

    const response = await service.search({
      query: 'match',
      scope: 'current-dir',
      currentPath: manyMatches,
      activeAgentId: 'codex',
      showHiddenFiles: false
    })

    expect(response.results).toHaveLength(2)
    expect(response.truncated).toBe(true)
  })
})
