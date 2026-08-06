import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkdirApi } from '@shared/contracts'
import { IPC_CHANNELS, IPC_EVENTS } from '@shared/defaults'

const mocks = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(() => Promise.resolve()),
  on: vi.fn(),
  removeListener: vi.fn(),
  getPathForFile: vi.fn()
}))

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mocks.exposeInMainWorld },
  ipcRenderer: {
    invoke: mocks.invoke,
    on: mocks.on,
    removeListener: mocks.removeListener
  },
  webUtils: { getPathForFile: mocks.getPathForFile }
}))

describe('preload workdir API', () => {
  let api: WorkdirApi

  beforeAll(async () => {
    await import('./index')
    api = mocks.exposeInMainWorld.mock.calls[0][1] as WorkdirApi
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes only the typed workdir API', () => {
    expect(mocks.exposeInMainWorld).toHaveBeenCalledTimes(0)
    expect(Object.keys(api).sort()).toEqual(
      [
        'openFileAccessSettings',
        'getSettings',
        'updateSettings',
        'resetSettings',
        'getAgents',
        'chooseDirectory',
        'getDroppedFilePath',
        'readDirectory',
        'search',
        'thumbnail',
        'getFileItem',
        'preview',
        'preflightDropCopy',
        'copyDroppedItems',
        'undoFileOperation',
        'trashItem',
        'revealInFinder',
        'openExternal',
        'copyText',
        'performTextEdit',
        'onCommand'
      ].sort()
    )
  })

  it('maps API calls and arguments to their fixed IPC channels', async () => {
    const settingsPatch = { theme: 'dark' as const }
    const searchRequest = {
      query: 'guide',
      scope: 'agent' as const,
      currentPath: '/workspace',
      activeAgentId: 'codex',
      showHiddenFiles: false
    }
    const copyRequest = {
      agentId: 'codex',
      sourcePaths: ['/tmp/guide.md'],
      targetDirectory: '/workspace',
      conflictStrategy: 'keep-both' as const
    }

    await Promise.all([
      api.openFileAccessSettings(),
      api.getSettings(),
      api.updateSettings(settingsPatch),
      api.resetSettings(),
      api.getAgents(),
      api.chooseDirectory(),
      api.readDirectory('codex', '/workspace'),
      api.search(searchRequest),
      api.thumbnail('codex', '/workspace/cover.png'),
      api.getFileItem('codex', '/workspace/guide.md'),
      api.preview('codex', '/workspace/guide.md'),
      api.preflightDropCopy(copyRequest),
      api.copyDroppedItems(copyRequest),
      api.undoFileOperation('codex', 'operation-1'),
      api.trashItem('codex', '/workspace/guide.md'),
      api.revealInFinder('codex', '/workspace/guide.md'),
      api.openExternal('codex', '/workspace/guide.md'),
      api.copyText('/workspace/guide.md'),
      api.performTextEdit('select-all')
    ])

    expect(mocks.invoke.mock.calls).toEqual([
      [IPC_CHANNELS.fileAccessOpenSettings],
      [IPC_CHANNELS.settingsGet],
      [IPC_CHANNELS.settingsUpdate, settingsPatch],
      [IPC_CHANNELS.settingsReset],
      [IPC_CHANNELS.agentsGet],
      [IPC_CHANNELS.directoryChoose],
      [IPC_CHANNELS.directoryRead, 'codex', '/workspace'],
      [IPC_CHANNELS.search, searchRequest],
      [IPC_CHANNELS.thumbnail, 'codex', '/workspace/cover.png'],
      [IPC_CHANNELS.fileItemGet, 'codex', '/workspace/guide.md'],
      [IPC_CHANNELS.preview, 'codex', '/workspace/guide.md'],
      [IPC_CHANNELS.dropCopyPreflight, copyRequest],
      [IPC_CHANNELS.dropCopyExecute, copyRequest],
      [IPC_CHANNELS.fileOperationUndo, 'codex', 'operation-1'],
      [IPC_CHANNELS.trashItem, 'codex', '/workspace/guide.md'],
      [IPC_CHANNELS.revealInFinder, 'codex', '/workspace/guide.md'],
      [IPC_CHANNELS.openExternal, 'codex', '/workspace/guide.md'],
      [IPC_CHANNELS.copyText, '/workspace/guide.md'],
      [IPC_CHANNELS.textEdit, 'select-all']
    ])
  })

  it('returns dropped paths without exposing webUtils to the renderer', () => {
    const file = new File(['content'], 'guide.md')
    mocks.getPathForFile.mockReturnValueOnce('/tmp/guide.md').mockReturnValueOnce('')

    expect(api.getDroppedFilePath(file)).toBe('/tmp/guide.md')
    expect(api.getDroppedFilePath(file)).toBeNull()

    mocks.getPathForFile.mockImplementationOnce(() => {
      throw new Error('unsupported object')
    })
    expect(api.getDroppedFilePath({ path: '/untrusted' })).toBeNull()
  })

  it('subscribes to typed app commands and removes the exact listener', () => {
    const listener = vi.fn()

    const unsubscribe = api.onCommand(listener)
    const handler = mocks.on.mock.calls[0][1]
    handler({}, 'refresh')

    expect(mocks.on).toHaveBeenCalledWith(IPC_EVENTS.appCommand, handler)
    expect(listener).toHaveBeenCalledWith('refresh')

    unsubscribe()
    expect(mocks.removeListener).toHaveBeenCalledWith(IPC_EVENTS.appCommand, handler)
  })
})
