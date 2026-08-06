import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '@shared/defaults'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  openExternal: vi.fn(),
  showOpenDialog: vi.fn(() => Promise.resolve({ canceled: true, filePaths: [] as string[] })),
  showItemInFolder: vi.fn(),
  openPath: vi.fn(() => Promise.resolve('')),
  readText: vi.fn(() => ''),
  writeText: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle },
  dialog: { showOpenDialog: mocks.showOpenDialog },
  shell: {
    showItemInFolder: mocks.showItemInFolder,
    openPath: mocks.openPath,
    openExternal: mocks.openExternal
  },
  clipboard: { readText: mocks.readText, writeText: mocks.writeText }
}))

import { registerIpcHandlers } from './register-handlers'

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    mocks.openPath.mockResolvedValue('')
  })

  it('registers every typed preload channel', () => {
    registerIpcHandlers({
      settings: { get: vi.fn(), update: vi.fn(), reset: vi.fn() },
      files: {
        getAgents: vi.fn(),
        readDirectory: vi.fn(),
        search: vi.fn(),
        thumbnail: vi.fn(),
        getFileItem: vi.fn(),
        preview: vi.fn(),
        resolveSafePath: vi.fn()
      }
    } as never)

    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(Object.values(IPC_CHANNELS))
  })

  it('opens only the fixed Files and Folders system settings pane', async () => {
    registerIpcHandlers({
      settings: {} as never,
      files: {} as never
    })
    const openHandler = mocks.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.fileAccessOpenSettings
    )?.[1]

    await openHandler()

    expect(mocks.openExternal).toHaveBeenCalledWith(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders'
    )
  })

  it('delegates direct file metadata reads to the file service', () => {
    const getFileItem = vi.fn()
    registerIpcHandlers({
      settings: {} as never,
      files: { getFileItem } as never
    })
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.fileItemGet
    )?.[1]

    handler({}, 'codex', '/workspace/wiki/guide.md')

    expect(getFileItem).toHaveBeenCalledWith('codex', '/workspace/wiki/guide.md')
  })

  it('delegates a full settings reset to the settings service', () => {
    const reset = vi.fn()
    registerIpcHandlers({
      settings: { get: vi.fn(), update: vi.fn(), reset },
      files: {} as never
    } as never)
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.settingsReset
    )?.[1]

    handler()

    expect(reset).toHaveBeenCalledOnce()
  })

  it('delegates typed settings and file requests without changing their arguments', async () => {
    const settings = {
      get: vi.fn(() => ({ theme: 'auto' })),
      update: vi.fn((patch) => patch),
      reset: vi.fn()
    }
    const files = {
      getAgents: vi.fn(() => ['codex']),
      readDirectory: vi.fn(),
      search: vi.fn(),
      thumbnail: vi.fn(),
      getFileItem: vi.fn(),
      preview: vi.fn(),
      preflightDropCopy: vi.fn(),
      copyDroppedItems: vi.fn(),
      undoFileOperation: vi.fn(),
      trashItem: vi.fn(),
      resolveSafePath: vi.fn((_, path: string) => Promise.resolve(`/safe${path}`))
    }
    registerIpcHandlers({ settings, files } as never)
    const handlers = Object.fromEntries(
      mocks.handle.mock.calls.map(([channel, handler]) => [channel, handler])
    )
    const searchRequest = {
      query: 'guide',
      scope: 'agent',
      currentPath: '/workspace',
      activeAgentId: 'codex',
      showHiddenFiles: false
    }
    const copyRequest = {
      agentId: 'codex',
      sourcePaths: ['/tmp/guide.md'],
      targetDirectory: '/workspace',
      conflictStrategy: 'keep-both'
    }

    expect(handlers[IPC_CHANNELS.settingsGet]()).toEqual({ theme: 'auto' })
    expect(handlers[IPC_CHANNELS.settingsUpdate]({}, { theme: 'dark' })).toEqual({ theme: 'dark' })
    expect(handlers[IPC_CHANNELS.agentsGet]()).toEqual(['codex'])
    handlers[IPC_CHANNELS.directoryRead]({}, 'codex', '/workspace')
    handlers[IPC_CHANNELS.search]({}, searchRequest)
    handlers[IPC_CHANNELS.thumbnail]({}, 'codex', '/workspace/cover.png')
    handlers[IPC_CHANNELS.preview]({}, 'codex', '/workspace/guide.md')
    handlers[IPC_CHANNELS.dropCopyPreflight]({}, copyRequest)
    handlers[IPC_CHANNELS.dropCopyExecute]({}, copyRequest)
    handlers[IPC_CHANNELS.fileOperationUndo]({}, 'codex', 'operation-1')
    handlers[IPC_CHANNELS.trashItem]({}, 'codex', '/workspace/guide.md')
    handlers[IPC_CHANNELS.copyText]({}, 'copied text')
    await handlers[IPC_CHANNELS.revealInFinder]({}, 'codex', '/workspace/guide.md')
    await handlers[IPC_CHANNELS.openExternal]({}, 'codex', '/workspace/guide.md')

    expect(files.readDirectory).toHaveBeenCalledWith('codex', '/workspace')
    expect(files.search).toHaveBeenCalledWith(searchRequest)
    expect(files.thumbnail).toHaveBeenCalledWith('codex', '/workspace/cover.png')
    expect(files.preview).toHaveBeenCalledWith('codex', '/workspace/guide.md')
    expect(files.preflightDropCopy).toHaveBeenCalledWith(copyRequest)
    expect(files.copyDroppedItems).toHaveBeenCalledWith(copyRequest)
    expect(files.undoFileOperation).toHaveBeenCalledWith('codex', 'operation-1')
    expect(files.trashItem).toHaveBeenCalledWith('codex', '/workspace/guide.md')
    expect(mocks.writeText).toHaveBeenCalledWith('copied text')
    expect(files.resolveSafePath).toHaveBeenCalledTimes(2)
    expect(mocks.showItemInFolder).toHaveBeenCalledWith('/safe/workspace/guide.md')
    expect(mocks.openPath).toHaveBeenCalledWith('/safe/workspace/guide.md')
  })

  it('returns the selected directory and handles cancellation', async () => {
    registerIpcHandlers({
      settings: {} as never,
      files: {} as never
    })
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.directoryChoose
    )?.[1]

    await expect(handler()).resolves.toBeNull()
    mocks.showOpenDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: ['/Users/test/.codex']
    })
    await expect(handler()).resolves.toBe('/Users/test/.codex')
    expect(mocks.showOpenDialog).toHaveBeenCalledWith({
      title: '选择 IDE 工作目录',
      properties: ['openDirectory', 'createDirectory']
    })
  })

  it('rejects an operating system error when a validated file cannot be opened', async () => {
    const resolveSafePath = vi.fn(() => Promise.resolve('/safe/guide.md'))
    mocks.openPath.mockResolvedValueOnce('No application can open this file')
    registerIpcHandlers({
      settings: {} as never,
      files: { resolveSafePath } as never
    })
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.openExternal
    )?.[1]

    await expect(handler({}, 'codex', '/workspace/guide.md')).rejects.toThrow(
      'No application can open this file'
    )
    expect(resolveSafePath).toHaveBeenCalledWith('codex', '/workspace/guide.md')
  })

  it.each([
    ['copy', 'copy'],
    ['cut', 'cut'],
    ['paste', 'paste'],
    ['select-all', 'selectAll']
  ] as const)(
    'delegates the %s text edit operation to the requesting renderer',
    (operation, method) => {
      registerIpcHandlers({
        settings: { get: vi.fn(), update: vi.fn() },
        files: {} as never
      } as never)
      const handler = mocks.handle.mock.calls.find(
        ([channel]) => channel === IPC_CHANNELS.textEdit
      )?.[1]
      const sender = {
        copy: vi.fn(),
        cut: vi.fn(),
        paste: vi.fn(),
        selectAll: vi.fn(),
        isDestroyed: vi.fn(() => false)
      }

      handler({ sender }, operation)

      expect(sender[method]).toHaveBeenCalledOnce()
    }
  )

  it('rejects unsupported text edit operations', () => {
    registerIpcHandlers({
      settings: { get: vi.fn(), update: vi.fn() },
      files: {} as never
    } as never)
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === IPC_CHANNELS.textEdit
    )?.[1]

    expect(() => handler({ sender: { isDestroyed: vi.fn(() => false) } }, 'delete')).toThrow(
      '不支持的文本编辑操作'
    )
  })
})
