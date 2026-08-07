import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type {
  DirectoryListing,
  PreviewResponse,
  ResolvedAgent,
  SearchResponse,
  WorkdirApi
} from '@shared/contracts'
import { agentFixture, fileFixture, folderFixture } from '../../../test/fixtures'
import { notify, useNotificationStore } from '../features/notifications/notification-store'
import { useAppStore } from './app-store'

const createDeferred = <T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
} => {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

describe('app store', () => {
  const api: WorkdirApi = {
    openFileAccessSettings: vi.fn(),
    checkForUpdates: vi.fn(),
    getSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
    updateSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
    resetSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
    getAgents: vi.fn().mockResolvedValue([agentFixture]),
    chooseDirectory: vi.fn(),
    getDroppedFilePath: vi.fn(),
    readDirectory: vi.fn().mockResolvedValue({
      path: agentFixture.resolvedWorkdir,
      parentPath: null,
      items: [folderFixture],
      truncated: false
    }),
    search: vi.fn(),
    thumbnail: vi.fn(),
    getFileItem: vi.fn(),
    preflightDropCopy: vi.fn(),
    copyDroppedItems: vi.fn(),
    undoFileOperation: vi.fn(),
    trashItem: vi.fn(),
    preview: vi.fn().mockResolvedValue({ kind: 'markdown', content: '# Project' }),
    revealInFinder: vi.fn(),
    openExternal: vi.fn(),
    copyText: vi.fn(),
    performTextEdit: vi.fn(),
    onCommand: vi.fn().mockReturnValue(vi.fn())
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'workdir', { configurable: true, value: api })
    useAppStore.setState({
      ready: false,
      loading: false,
      settingsSaveStatus: 'saved',
      settings: DEFAULT_SETTINGS,
      activeAgentId: '',
      agents: [],
      workspaces: {},
      sessions: {},
      listing: null,
      directoryError: null,
      selectedItem: null,
      fileClipboard: null,
      preview: null,
      search: null
    })
    notify.clear()
  })

  it('initializes agent-scoped state and loads its directory', async () => {
    await useAppStore.getState().initialize()

    const state = useAppStore.getState()
    expect(state.activeAgentId).toBe('codex')
    expect(state.workspaces.codex.currentPath).toBe(agentFixture.resolvedWorkdir)
    expect(state.listing?.items).toEqual([folderFixture])
    expect(state.ready).toBe(true)
  })

  it('finishes initialization with an actionable notification when settings cannot load', async () => {
    vi.mocked(api.getSettings).mockRejectedValueOnce(new Error('settings unavailable'))

    await useAppStore.getState().initialize()

    expect(useAppStore.getState()).toMatchObject({ ready: true, loading: false })
    expect(useNotificationStore.getState().notifications.at(-1)).toMatchObject({
      variant: 'error',
      message: '应用初始化失败，请重新启动后再试。'
    })
  })

  it('refreshes the active agent current directory and clears search results', async () => {
    await useAppStore.getState().initialize()
    const currentPath = `${agentFixture.resolvedWorkdir}/nested`
    const refreshedListing: DirectoryListing = {
      path: currentPath,
      parentPath: agentFixture.resolvedWorkdir,
      items: [fileFixture],
      truncated: false
    }
    useAppStore.setState((state) => ({
      workspaces: {
        ...state.workspaces,
        codex: {
          ...state.workspaces.codex,
          currentPath
        }
      },
      search: { results: [], scannedCount: 1, truncated: false }
    }))
    vi.mocked(api.readDirectory).mockResolvedValueOnce(refreshedListing)

    await useAppStore.getState().refresh()

    expect(api.readDirectory).toHaveBeenLastCalledWith('codex', currentPath)
    expect(useAppStore.getState()).toMatchObject({
      listing: refreshedListing,
      search: null,
      loading: false,
      directoryError: null
    })
  })

  it('ignores a stale refresh failure after a newer refresh succeeds', async () => {
    await useAppStore.getState().initialize()
    const staleRequest = createDeferred<DirectoryListing>()
    const latestRequest = createDeferred<DirectoryListing>()
    const latestListing: DirectoryListing = {
      path: agentFixture.resolvedWorkdir,
      parentPath: null,
      items: [fileFixture],
      truncated: false
    }
    vi.mocked(api.readDirectory)
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(latestRequest.promise)

    const staleRefresh = useAppStore.getState().refresh()
    const latestRefresh = useAppStore.getState().refresh()
    latestRequest.resolve(latestListing)
    await latestRefresh
    staleRequest.reject(new Error('stale refresh failed'))
    await staleRefresh

    expect(useAppStore.getState()).toMatchObject({
      listing: latestListing,
      loading: false,
      directoryError: null
    })
  })

  it('ignores a stale refresh result after a newer refresh succeeds', async () => {
    await useAppStore.getState().initialize()
    const staleRequest = createDeferred<DirectoryListing>()
    const latestRequest = createDeferred<DirectoryListing>()
    const staleListing: DirectoryListing = {
      path: agentFixture.resolvedWorkdir,
      parentPath: null,
      items: [folderFixture],
      truncated: false
    }
    const latestListing: DirectoryListing = {
      ...staleListing,
      items: [fileFixture]
    }
    vi.mocked(api.readDirectory)
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(latestRequest.promise)

    const staleRefresh = useAppStore.getState().refresh()
    const latestRefresh = useAppStore.getState().refresh()
    latestRequest.resolve(latestListing)
    await latestRefresh
    staleRequest.resolve(staleListing)
    await staleRefresh

    expect(useAppStore.getState()).toMatchObject({
      listing: latestListing,
      loading: false,
      directoryError: null
    })
  })

  it('clears stale selection state before a failed navigation completes', async () => {
    await useAppStore.getState().initialize()
    useAppStore.setState((state) => ({
      selectedItem: fileFixture,
      preview: { kind: 'text', content: 'stale' },
      workspaces: {
        ...state.workspaces,
        codex: {
          ...state.workspaces.codex,
          selection: [fileFixture.path]
        }
      }
    }))
    vi.mocked(api.readDirectory).mockRejectedValueOnce(new Error('ENOENT'))

    await useAppStore.getState().navigate(`${agentFixture.resolvedWorkdir}/missing`)

    expect(useAppStore.getState()).toMatchObject({
      selectedItem: null,
      preview: null,
      listing: null
    })
    expect(useAppStore.getState().workspaces.codex.selection).toEqual([])
  })

  it('keeps only the latest search response and invalidates searches when cleared', async () => {
    await useAppStore.getState().initialize()
    const staleRequest = createDeferred<SearchResponse>()
    const latestRequest = createDeferred<SearchResponse>()
    const clearedRequest = createDeferred<SearchResponse>()
    const staleResponse: SearchResponse = {
      results: [{ agentId: 'codex', item: folderFixture }],
      scannedCount: 1,
      truncated: false
    }
    const latestResponse: SearchResponse = {
      results: [{ agentId: 'codex', item: fileFixture }],
      scannedCount: 2,
      truncated: false
    }
    vi.mocked(api.search)
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(latestRequest.promise)
      .mockReturnValueOnce(clearedRequest.promise)

    const staleSearch = useAppStore.getState().runSearch('old')
    const latestSearch = useAppStore.getState().runSearch('latest')
    latestRequest.resolve(latestResponse)
    await latestSearch
    staleRequest.resolve(staleResponse)
    await staleSearch

    expect(useAppStore.getState().search).toEqual(latestResponse)
    expect(useAppStore.getState().workspaces.codex.searchQuery).toBe('latest')

    const clearedSearch = useAppStore.getState().runSearch('clear-me')
    useAppStore.getState().clearSearch()
    clearedRequest.resolve(staleResponse)
    await clearedSearch

    expect(useAppStore.getState().search).toBeNull()
    expect(useAppStore.getState().loading).toBe(false)
  })

  it('signals the active nested column instead of refreshing the root listing', async () => {
    await useAppStore.getState().initialize()
    vi.mocked(api.readDirectory).mockClear()
    useAppStore.setState((state) => ({
      workspaces: {
        ...state.workspaces,
        codex: {
          ...state.workspaces.codex,
          viewMode: 'column',
          columnActivePath: `${agentFixture.resolvedWorkdir}/projects`
        }
      }
    }))

    await useAppStore.getState().refresh()

    expect(api.readDirectory).not.toHaveBeenCalled()
    expect(useAppStore.getState().workspaces.codex.columnRefreshVersion).toBe(1)
  })

  it('rebuilds a workspace when its configured root changes', async () => {
    await useAppStore.getState().initialize()
    const movedAgent = { ...agentFixture, workdir: '/tmp/codex', resolvedWorkdir: '/tmp/codex' }
    vi.mocked(api.updateSettings).mockResolvedValueOnce({
      ...DEFAULT_SETTINGS,
      agents: [{ ...DEFAULT_SETTINGS.agents[0], workdir: '/tmp/codex' }]
    })
    vi.mocked(api.getAgents).mockResolvedValueOnce([movedAgent])
    vi.mocked(api.readDirectory).mockResolvedValueOnce({
      path: '/tmp/codex',
      parentPath: null,
      items: [],
      truncated: false
    })

    await useAppStore
      .getState()
      .updateSettings({ agents: [{ ...DEFAULT_SETTINGS.agents[0], workdir: '/tmp/codex' }] })

    expect(useAppStore.getState().workspaces.codex.currentPath).toBe('/tmp/codex')
  })

  it('serializes settings updates so a slow Agent update cannot overwrite newer settings', async () => {
    await useAppStore.getState().initialize()
    vi.mocked(api.getAgents).mockClear()
    vi.mocked(api.updateSettings).mockClear()
    const movedAgent: ResolvedAgent = {
      ...agentFixture,
      workdir: '/tmp/codex',
      resolvedWorkdir: '/tmp/codex'
    }
    const agentSettings = {
      ...DEFAULT_SETTINGS,
      agents: [{ ...DEFAULT_SETTINGS.agents[0], workdir: '/tmp/codex' }]
    }
    const agentsRequest = createDeferred<ResolvedAgent[]>()
    vi.mocked(api.updateSettings)
      .mockResolvedValueOnce(agentSettings)
      .mockResolvedValueOnce({ ...agentSettings, theme: 'dark' })
    vi.mocked(api.getAgents).mockReturnValueOnce(agentsRequest.promise)
    vi.mocked(api.readDirectory).mockResolvedValue({
      path: '/tmp/codex',
      parentPath: null,
      items: [],
      truncated: false
    })

    const agentUpdate = useAppStore.getState().updateSettings({
      agents: agentSettings.agents
    })
    await vi.waitFor(() => expect(api.getAgents).toHaveBeenCalledOnce())
    const themeUpdate = useAppStore.getState().updateSettings({ theme: 'dark' })

    expect(api.updateSettings).toHaveBeenCalledOnce()
    expect(useAppStore.getState().settingsSaveStatus).toBe('saving')

    agentsRequest.resolve([movedAgent])
    await expect(agentUpdate).resolves.toBe(true)
    await expect(themeUpdate).resolves.toBe(true)

    expect(api.updateSettings).toHaveBeenCalledTimes(2)
    expect(useAppStore.getState()).toMatchObject({
      settings: { theme: 'dark' },
      settingsSaveStatus: 'saved'
    })
  })

  it('returns a failed result and exposes the settings save error state', async () => {
    vi.mocked(api.updateSettings).mockRejectedValueOnce(new Error('disk full'))

    await expect(useAppStore.getState().updateSettings({ theme: 'dark' })).resolves.toBe(false)

    expect(useAppStore.getState().settingsSaveStatus).toBe('error')
    expect(useNotificationStore.getState().notifications.at(-1)).toMatchObject({
      variant: 'error'
    })
  })

  it('resets settings and clears browsing state tied to previous Agent configuration', async () => {
    await useAppStore.getState().initialize()
    useAppStore.setState((state) => ({
      settings: { ...state.settings, theme: 'dark' },
      sessions: {
        codex: {
          listing: state.listing,
          directoryError: null,
          selectedItem: folderFixture,
          preview: null,
          search: null
        }
      },
      fileClipboard: {
        operation: 'copy',
        sourceAgentId: 'codex',
        sourcePaths: [folderFixture.path],
        createdAt: 1
      }
    }))

    const result = await useAppStore.getState().resetSettings()

    expect(result).toBe(true)
    expect(api.resetSettings).toHaveBeenCalledOnce()
    expect(useAppStore.getState()).toMatchObject({
      settings: DEFAULT_SETTINGS,
      activeAgentId: 'codex',
      sessions: {},
      fileClipboard: null
    })
    expect(useAppStore.getState().workspaces.codex.currentPath).toBe(agentFixture.resolvedWorkdir)
    expect(useNotificationStore.getState().notifications.at(-1)).toMatchObject({
      message: '已还原所有默认设置。',
      variant: 'success'
    })
  })

  it('preserves current settings and reports an error when reset persistence fails', async () => {
    const currentSettings = { ...DEFAULT_SETTINGS, theme: 'dark' as const }
    useAppStore.setState({ settings: currentSettings })
    vi.mocked(api.resetSettings).mockRejectedValueOnce(new Error('disk full'))

    await expect(useAppStore.getState().resetSettings()).resolves.toBe(false)

    expect(useAppStore.getState()).toMatchObject({
      settings: currentSettings,
      settingsSaveStatus: 'error'
    })
    expect(useNotificationStore.getState().notifications.at(-1)).toMatchObject({
      variant: 'error'
    })
  })

  it('navigates into a directory symlink instead of previewing it', async () => {
    await useAppStore.getState().initialize()
    const linkedDirectory = {
      ...folderFixture,
      name: 'linked',
      path: `${agentFixture.resolvedWorkdir}/linked`,
      type: 'symlink' as const,
      symlinkTargetType: 'directory' as const
    }
    vi.mocked(api.readDirectory).mockResolvedValueOnce({
      path: linkedDirectory.path,
      parentPath: agentFixture.resolvedWorkdir,
      items: [],
      truncated: false
    })

    await useAppStore.getState().openItem(linkedDirectory)

    expect(api.readDirectory).toHaveBeenLastCalledWith('codex', linkedDirectory.path)
    expect(api.preview).not.toHaveBeenCalled()
  })

  it('loads inspector previews for selected text files but not directories', async () => {
    await useAppStore.getState().initialize()

    await useAppStore.getState().selectItem(fileFixture)

    expect(api.preview).toHaveBeenCalledWith('codex', fileFixture.path)
    expect(useAppStore.getState().preview).toEqual({ kind: 'markdown', content: '# Project' })

    await useAppStore.getState().selectItem(folderFixture)

    expect(api.preview).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().preview).toBeNull()
  })

  it('does not report a stale preview failure after another file is selected', async () => {
    await useAppStore.getState().initialize()
    const staleRequest = createDeferred<PreviewResponse>()
    const latestPreview: PreviewResponse = { kind: 'text', content: 'latest' }
    const latestFile = {
      ...fileFixture,
      name: 'latest.txt',
      path: `${agentFixture.resolvedWorkdir}/latest.txt`,
      extension: '.txt'
    }
    vi.mocked(api.preview)
      .mockReturnValueOnce(staleRequest.promise)
      .mockResolvedValueOnce(latestPreview)

    const staleSelection = useAppStore.getState().selectItem(fileFixture)
    await useAppStore.getState().selectItem(latestFile)
    staleRequest.reject(new Error('stale failure'))
    await staleSelection

    expect(useAppStore.getState().selectedItem).toEqual(latestFile)
    expect(useAppStore.getState().preview).toEqual(latestPreview)
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('opens documents once and restores each agent workspace', async () => {
    const claudeAgent = {
      ...agentFixture,
      id: 'claude',
      name: 'Claude Code',
      workdir: '~/.claude',
      resolvedWorkdir: '/Users/test/.claude',
      isDefault: false
    }
    const claudeFile = {
      ...fileFixture,
      name: 'settings.json',
      path: '/Users/test/.claude/settings.json',
      extension: '.json'
    }
    vi.mocked(api.getAgents).mockResolvedValueOnce([agentFixture, claudeAgent])
    vi.mocked(api.readDirectory)
      .mockResolvedValueOnce({
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [fileFixture],
        truncated: false
      })
      .mockResolvedValueOnce({
        path: claudeAgent.resolvedWorkdir,
        parentPath: null,
        items: [claudeFile],
        truncated: false
      })

    await useAppStore.getState().initialize()
    useAppStore.getState().setSearchQuery('codex-query')
    await useAppStore.getState().openItem(fileFixture)
    await useAppStore.getState().openItem(fileFixture)

    expect(useAppStore.getState().workspaces.codex.openTabs).toHaveLength(1)
    expect(useAppStore.getState().workspaces.codex.activeTabId).toBe(fileFixture.path)

    await useAppStore.getState().selectAgent('claude')
    useAppStore.getState().setSearchQuery('claude-query')
    await useAppStore.getState().openItem(claudeFile)
    expect(useAppStore.getState().workspaces.claude.activeTabId).toBe(claudeFile.path)

    await useAppStore.getState().selectAgent('codex')
    const restored = useAppStore.getState()
    expect(restored.workspaces.codex.activeTabId).toBe(fileFixture.path)
    expect(restored.workspaces.codex.searchQuery).toBe('codex-query')
    expect(restored.selectedItem).toEqual(fileFixture)
    expect(api.readDirectory).toHaveBeenCalledTimes(2)
  })

  it('opens image previews in document tabs', async () => {
    await useAppStore.getState().initialize()
    const image = {
      ...fileFixture,
      name: 'preview.png',
      path: `${agentFixture.resolvedWorkdir}/preview.png`,
      mimeType: 'image/png',
      extension: '.png'
    }
    vi.mocked(api.preview).mockResolvedValueOnce({
      kind: 'image',
      dataUrl: 'data:image/png;base64,AA=='
    })

    await useAppStore.getState().openItem(image)

    const state = useAppStore.getState()
    expect(state.workspaces.codex.openTabs).toHaveLength(1)
    expect(state.workspaces.codex.activeTabId).toBe(image.path)
    expect(state.workspaces.codex.openTabs[0].preview?.kind).toBe('image')
  })

  it('opens linked documents by path and reuses an existing tab', async () => {
    await useAppStore.getState().initialize()
    const linkedDocument = {
      ...fileFixture,
      name: 'guide.md',
      path: `${agentFixture.resolvedWorkdir}/wiki/guide.md`,
      isHidden: true
    }
    vi.mocked(api.getFileItem).mockResolvedValueOnce(linkedDocument)

    await useAppStore.getState().openLinkedDocument(linkedDocument.path)
    await useAppStore.getState().openLinkedDocument(linkedDocument.path)

    expect(api.getFileItem).toHaveBeenCalledOnce()
    expect(api.getFileItem).toHaveBeenCalledWith('codex', linkedDocument.path)
    expect(api.preview).toHaveBeenCalledWith('codex', linkedDocument.path)
    expect(useAppStore.getState().workspaces.codex.openTabs).toEqual([
      expect.objectContaining({
        filePath: linkedDocument.path,
        preview: { kind: 'markdown', content: '# Project' }
      })
    ])
  })

  it('ignores a preview from a closed tab after the same path is reopened', async () => {
    await useAppStore.getState().initialize()
    const staleRequest = createDeferred<PreviewResponse>()
    const latestRequest = createDeferred<PreviewResponse>()
    vi.mocked(api.preview)
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(latestRequest.promise)

    const staleOpen = useAppStore.getState().openItem(fileFixture)
    useAppStore.getState().closeTab(fileFixture.path)
    const latestOpen = useAppStore.getState().openItem(fileFixture)
    latestRequest.resolve({ kind: 'text', content: 'latest' })
    await latestOpen
    staleRequest.resolve({ kind: 'text', content: 'stale' })
    await staleOpen

    const [tab] = useAppStore.getState().workspaces.codex.openTabs
    expect(tab.preview).toEqual({ kind: 'text', content: 'latest' })
    expect(useAppStore.getState().preview).toEqual({ kind: 'text', content: 'latest' })
  })

  it('keeps the active document as the inspector target after a directory refresh', async () => {
    await useAppStore.getState().initialize()
    const secondFile = {
      ...fileFixture,
      name: 'second.txt',
      path: `${agentFixture.resolvedWorkdir}/second.txt`,
      extension: '.txt'
    }
    vi.mocked(api.preview)
      .mockResolvedValueOnce({ kind: 'text', content: 'first' })
      .mockResolvedValueOnce({ kind: 'text', content: 'second' })
    vi.mocked(api.readDirectory).mockResolvedValueOnce({
      path: agentFixture.resolvedWorkdir,
      parentPath: null,
      items: [fileFixture, secondFile],
      truncated: false
    })

    await useAppStore.getState().openItem(fileFixture)
    const firstTabId = useAppStore.getState().workspaces.codex.activeTabId
    await useAppStore.getState().openItem(secondFile)
    useAppStore.getState().activateTab(firstTabId)
    await useAppStore.getState().refresh()

    expect(useAppStore.getState().selectedItem).toEqual(fileFixture)
    expect(useAppStore.getState().preview).toEqual({ kind: 'text', content: 'first' })
  })

  it('keeps the selected JSON preview after closing its final document tab', async () => {
    await useAppStore.getState().initialize()
    const jsonFile = {
      ...fileFixture,
      name: 'settings.json',
      path: `${agentFixture.resolvedWorkdir}/settings.json`,
      extension: '.json'
    }
    const jsonPreview = { kind: 'text' as const, content: '{"enabled":true}' }
    vi.mocked(api.preview).mockResolvedValueOnce(jsonPreview)

    await useAppStore.getState().openItem(jsonFile)
    useAppStore.getState().closeTab(jsonFile.path)

    const state = useAppStore.getState()
    expect(state.workspaces.codex.openTabs).toEqual([])
    expect(state.workspaces.codex.activeTabId).toBeNull()
    expect(state.selectedItem).toEqual(jsonFile)
    expect(state.preview).toEqual(jsonPreview)
  })

  it('executes global view and selected-file commands', async () => {
    await useAppStore.getState().initialize()
    await useAppStore.getState().executeCommand('view-column')
    expect(useAppStore.getState().workspaces.codex.viewMode).toBe('column')

    useAppStore.setState({ selectedItem: folderFixture })
    await useAppStore.getState().executeCommand('reveal-selected')
    await useAppStore.getState().executeCommand('copy-path')
    expect(api.revealInFinder).toHaveBeenCalledWith('codex', folderFixture.path)
    expect(api.copyText).toHaveBeenCalledWith(folderFixture.path)
  })

  it('keeps cross-agent file clipboard as in-memory path descriptors', async () => {
    await useAppStore.getState().initialize()
    useAppStore.setState({ selectedItem: folderFixture })

    await useAppStore.getState().executeCommand('copy-selected')
    expect(useAppStore.getState().fileClipboard).toMatchObject({
      operation: 'copy',
      sourceAgentId: 'codex',
      sourcePaths: [folderFixture.path]
    })

    await useAppStore.getState().executeCommand('cut-selected')
    expect(useAppStore.getState().fileClipboard).toMatchObject({
      operation: 'cut',
      sourceAgentId: 'codex',
      sourcePaths: [folderFixture.path]
    })
  })

  it('dispatches paste requests for the browser surface', async () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent')
    await useAppStore.getState().executeCommand('paste')

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workdir:paste-request' })
    )
  })

  it('dispatches trash requests only when a browser item is selected', async () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent')

    await useAppStore.getState().executeCommand('trash-selected')
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workdir:trash-selected-request' })
    )

    useAppStore.setState({ selectedItem: folderFixture })
    await useAppStore.getState().executeCommand('trash-selected')

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workdir:trash-selected-request' })
    )
  })

  it('keeps the directory error after its transient notification is dismissed', async () => {
    await useAppStore.getState().initialize()
    vi.mocked(api.readDirectory).mockRejectedValueOnce(
      new Error('ENOENT: no such file or directory')
    )

    await useAppStore.getState().refresh()
    const [notification] = useNotificationStore.getState().notifications
    notify.dismiss(notification.id)

    expect(useAppStore.getState().directoryError).toContain('找不到该工作目录')
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('isolates a denied folder to its Agent and recovers after access is granted', async () => {
    await useAppStore.getState().initialize()
    vi.mocked(api.readDirectory).mockRejectedValueOnce(
      new Error('EPERM: operation not permitted, scandir /Users/test/Desktop')
    )

    await useAppStore.getState().refresh()

    expect(useAppStore.getState().agents[0].status).toBe('permission-required')
    expect(useAppStore.getState().directoryError).toContain('文件与文件夹')

    await useAppStore.getState().refresh()

    expect(useAppStore.getState().agents[0].status).toBe('connected')
    expect(useAppStore.getState().listing).not.toBeNull()
  })

  it('opens the scoped macOS file access settings', async () => {
    await useAppStore.getState().openFileAccessSettings()

    expect(api.openFileAccessSettings).toHaveBeenCalledOnce()
  })

  it('reports a fixed recovery message when macOS settings cannot be opened', async () => {
    vi.mocked(api.openFileAccessSettings).mockRejectedValueOnce(new Error('launch failed'))

    await useAppStore.getState().openFileAccessSettings()

    expect(useNotificationStore.getState().notifications.at(-1)).toMatchObject({
      variant: 'error',
      message: '无法打开 macOS“文件与文件夹”设置。'
    })
  })

  it('resets the active column path when changing view modes', async () => {
    await useAppStore.getState().initialize()
    useAppStore.setState((state) => ({
      workspaces: {
        ...state.workspaces,
        codex: {
          ...state.workspaces.codex,
          columnActivePath: `${agentFixture.resolvedWorkdir}/projects/src`,
          viewMode: 'column'
        }
      }
    }))

    useAppStore.getState().setViewMode('icon')

    expect(useAppStore.getState().workspaces.codex.columnActivePath).toBeNull()
  })
})
