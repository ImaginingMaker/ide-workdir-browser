import { create } from 'zustand'
import type {
  AppSettings,
  DirectoryListing,
  FileClipboard,
  FileItem,
  FileTransferOperation,
  PreviewResponse,
  ResolvedAgent,
  SearchResponse,
  SettingsPatch,
  Tab,
  ViewMode,
  WorkdirApi,
  WorkspaceState,
  AppCommand
} from '@shared/contracts'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { isDirectoryLike } from '@shared/file-item'
import { isMarkdownExtension } from '@shared/file-types'
import { applyPreferences } from '../apply-preferences'
import { notify } from '../features/notifications/notification-store'
import { copyPathToClipboard, revealPathInFinder } from '../services/native-actions'
import { formatUserFacingError, isFileAccessDeniedError } from '../utils/user-facing-error'
import { createWorkspace, moveHistory, navigateWorkspace } from './workspace'

type AppScreen = 'browser' | 'settings'
export type SettingsSection = 'agents' | 'appearance' | 'advanced' | 'about'
export type SettingsSaveStatus = 'saving' | 'saved' | 'error'
type SettingsPatchInput = SettingsPatch | ((settings: Readonly<AppSettings>) => SettingsPatch)

interface SelectItemOptions {
  previewDelayMs?: number
}

interface WorkspaceSession {
  listing: DirectoryListing | null
  directoryError: string | null
  selectedItem: FileItem | null
  preview: PreviewResponse | null
  search: SearchResponse | null
}

interface AppStore {
  ready: boolean
  loading: boolean
  screen: AppScreen
  sidebarCollapsed: boolean
  settingsSection: SettingsSection
  settingsSaveStatus: SettingsSaveStatus
  settings: AppSettings
  agents: ResolvedAgent[]
  activeAgentId: string
  workspaces: Record<string, WorkspaceState>
  sessions: Record<string, WorkspaceSession>
  listing: DirectoryListing | null
  directoryError: string | null
  selectedItem: FileItem | null
  fileClipboard: FileClipboard | null
  preview: PreviewResponse | null
  search: SearchResponse | null
  initialize(): Promise<void>
  openFileAccessSettings(): Promise<void>
  setScreen(screen: AppScreen): void
  toggleSidebar(): void
  setSettingsSection(section: SettingsSection): void
  updateSettings(patch: SettingsPatchInput): Promise<boolean>
  resetSettings(): Promise<boolean>
  selectAgent(agentId: string): Promise<void>
  navigate(path: string): Promise<void>
  moveHistory(direction: -1 | 1): Promise<void>
  refresh(): Promise<void>
  setViewMode(viewMode: ViewMode): void
  setColumnActivePath(path: string | null): void
  setSearchQuery(query: string): void
  toggleInspector(): void
  selectItem(item: FileItem | null, options?: SelectItemOptions): Promise<void>
  copySelection(operation: FileTransferOperation, item?: FileItem): void
  clearFileClipboard(): void
  invalidateAgentSessions(agentIds: string[]): void
  openItem(item: FileItem): Promise<void>
  openLinkedDocument(path: string): Promise<void>
  activateTab(tabId: string | null): void
  closeTab(tabId: string): void
  setTabPreviewMode(tabId: string, previewMode: Tab['previewMode']): void
  runSearch(query: string): Promise<void>
  clearSearch(): void
  executeCommand(command: AppCommand): Promise<void>
}

const api = (): WorkdirApi => window.workdir
const isEditableActiveElement = (): boolean => {
  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement)) return false
  if (activeElement.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)
}
const isEditingCommand = (command: AppCommand): boolean =>
  command === 'copy-selected' ||
  command === 'cut-selected' ||
  command === 'paste' ||
  command === 'select-all'
let refreshRequestSequence = 0
let searchRequestSequence = 0
let previewRequestSequence = 0
let selectionPreviewRequestSequence = 0
let settingsMutationSequence = 0
let settingsMutationQueue: Promise<void> = Promise.resolve()
let initializationRequest: Promise<void> | null = null

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const enqueueSettingsMutation = <T>(mutation: () => Promise<T>): Promise<T> => {
  const result = settingsMutationQueue.then(mutation, mutation)
  settingsMutationQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

const emptySession = (): WorkspaceSession => ({
  listing: null,
  directoryError: null,
  selectedItem: null,
  preview: null,
  search: null
})

const sessionFromState = (state: AppStore): WorkspaceSession => ({
  listing: state.listing,
  directoryError: state.directoryError,
  selectedItem: state.selectedItem,
  preview: state.preview,
  search: state.search
})

const updateActiveWorkspace = (
  state: AppStore,
  updater: (workspace: WorkspaceState) => WorkspaceState
): Pick<AppStore, 'workspaces'> => ({
  workspaces: {
    ...state.workspaces,
    [state.activeAgentId]: updater(state.workspaces[state.activeAgentId])
  }
})

export const useAppStore = create<AppStore>((set, get) => ({
  ready: false,
  loading: false,
  screen: 'browser',
  sidebarCollapsed: window.innerWidth <= 720,
  settingsSection: 'agents',
  settingsSaveStatus: 'saved',
  settings: DEFAULT_SETTINGS,
  agents: [],
  activeAgentId: '',
  workspaces: {},
  sessions: {},
  listing: null,
  directoryError: null,
  selectedItem: null,
  fileClipboard: null,
  preview: null,
  search: null,

  initialize() {
    if (get().ready) return Promise.resolve()
    if (initializationRequest) return initializationRequest

    const request = (async (): Promise<void> => {
      set({ loading: true, directoryError: null })

      try {
        const [settings, agents] = await Promise.all([api().getSettings(), api().getAgents()])
        const enabled = agents.filter((agent) => agent.enabled)
        const workspaces = Object.fromEntries(
          enabled.map((agent) => [agent.id, createWorkspace(agent)])
        )
        const activeAgentId =
          enabled.find((agent) => agent.id === settings.defaultAgentId)?.id ?? enabled[0]?.id ?? ''
        set({
          settings,
          agents,
          workspaces,
          activeAgentId,
          sessions: {},
          ...emptySession()
        })
        applyPreferences(settings)
        if (activeAgentId) await get().refresh()
        set({ ready: true, loading: false })
      } catch (error) {
        set({ ready: true, loading: false })
        notify.error(formatUserFacingError(error, 'initialization'))
      }
    })()

    initializationRequest = request
    return request.finally(() => {
      if (initializationRequest === request) initializationRequest = null
    })
  },

  async openFileAccessSettings() {
    try {
      await api().openFileAccessSettings()
    } catch {
      notify.error('无法打开 macOS“文件与文件夹”设置。')
    }
  },

  setScreen: (screen) => set({ screen }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSettingsSection: (settingsSection) => set({ settingsSection }),

  updateSettings(patchInput) {
    const mutationId = ++settingsMutationSequence
    set({ settingsSaveStatus: 'saving' })

    return enqueueSettingsMutation(async () => {
      try {
        const patch = typeof patchInput === 'function' ? patchInput(get().settings) : patchInput
        const settings = await api().updateSettings(patch)
        let agents = get().agents
        let workspaces = get().workspaces
        let sessions = get().sessions
        let activeAgentId = get().activeAgentId
        if (patch.agents) {
          agents = await api().getAgents()
          const reusableAgentIds = new Set<string>()
          workspaces = Object.fromEntries(
            agents
              .filter((agent) => agent.enabled)
              .map((agent) => {
                const existing = get().workspaces[agent.id]
                const canReuse =
                  existing &&
                  (existing.currentPath === agent.resolvedWorkdir ||
                    existing.currentPath.startsWith(`${agent.resolvedWorkdir}/`))
                if (canReuse) reusableAgentIds.add(agent.id)
                return [agent.id, canReuse ? existing : createWorkspace(agent)]
              })
          )
          sessions = Object.fromEntries(
            Object.entries(sessions).filter(([agentId]) => reusableAgentIds.has(agentId))
          )
          if (!workspaces[activeAgentId]) {
            activeAgentId =
              agents.find((agent) => agent.id === settings.defaultAgentId && agent.enabled)?.id ??
              agents.find((agent) => agent.enabled)?.id ??
              ''
          }
        }
        set({
          settings,
          agents,
          workspaces,
          sessions,
          activeAgentId,
          settingsSaveStatus: mutationId === settingsMutationSequence ? 'saved' : 'saving'
        })
        applyPreferences(settings)
        if (patch.agents && activeAgentId) await get().refresh()
        return true
      } catch (error) {
        if (mutationId === settingsMutationSequence) {
          set({ settingsSaveStatus: 'error' })
        }
        notify.error(formatUserFacingError(error, 'settings'))
        return false
      }
    })
  },

  resetSettings() {
    const mutationId = ++settingsMutationSequence
    set({ settingsSaveStatus: 'saving' })

    return enqueueSettingsMutation(async () => {
      try {
        const settings = await api().resetSettings()
        const agents = await api().getAgents()
        const enabledAgents = agents.filter((agent) => agent.enabled)
        const activeAgentId =
          enabledAgents.find((agent) => agent.id === settings.defaultAgentId)?.id ??
          enabledAgents[0]?.id ??
          ''
        const workspaces = Object.fromEntries(
          enabledAgents.map((agent) => [agent.id, createWorkspace(agent)])
        )

        set({
          settings,
          agents,
          activeAgentId,
          workspaces,
          sessions: {},
          fileClipboard: null,
          loading: false,
          settingsSaveStatus: mutationId === settingsMutationSequence ? 'saved' : 'saving',
          ...emptySession()
        })
        applyPreferences(settings)
        if (activeAgentId) await get().refresh()
        notify.success('已还原所有默认设置。')
        return true
      } catch (error) {
        if (mutationId === settingsMutationSequence) {
          set({ settingsSaveStatus: 'error' })
        }
        notify.error(formatUserFacingError(error, 'settings'))
        return false
      }
    })
  },

  async selectAgent(activeAgentId) {
    const state = get()
    if (activeAgentId === state.activeAgentId) return
    const sessions = state.activeAgentId
      ? {
          ...state.sessions,
          [state.activeAgentId]: sessionFromState(state)
        }
      : state.sessions
    const restored = sessions[activeAgentId]
    set({
      activeAgentId,
      sessions,
      loading: false,
      ...(restored ?? emptySession())
    })
    if (!restored?.listing) await get().refresh()
  },

  async navigate(path) {
    set((state) => ({
      selectedItem: null,
      preview: null,
      search: null,
      ...updateActiveWorkspace(state, (workspace) => navigateWorkspace(workspace, path))
    }))
    await get().refresh()
  },

  async moveHistory(direction) {
    set((state) => ({
      selectedItem: null,
      preview: null,
      search: null,
      ...updateActiveWorkspace(state, (workspace) => moveHistory(workspace, direction))
    }))
    await get().refresh()
  },

  async refresh() {
    searchRequestSequence += 1
    const requestId = ++refreshRequestSequence
    const state = get()
    const workspace = state.workspaces[state.activeAgentId]
    if (!workspace) return
    if (
      workspace.viewMode === 'column' &&
      workspace.columnActivePath &&
      workspace.columnActivePath !== workspace.currentPath
    ) {
      set((current) => ({
        loading: false,
        search: null,
        ...updateActiveWorkspace(current, (entry) => ({
          ...entry,
          columnRefreshVersion: entry.columnRefreshVersion + 1
        }))
      }))
      return
    }
    const agentId = state.activeAgentId
    const currentPath = workspace.currentPath
    set({ loading: true, directoryError: null, search: null })
    try {
      const listing = await api().readDirectory(agentId, currentPath)
      const current = get()
      if (
        requestId !== refreshRequestSequence ||
        current.activeAgentId !== agentId ||
        current.workspaces[agentId]?.currentPath !== currentPath
      ) {
        return
      }
      const currentWorkspace = current.workspaces[agentId]
      const activeTab = currentWorkspace.openTabs.find(
        (tab) => tab.id === currentWorkspace.activeTabId
      )
      const selectedPath = currentWorkspace.selection[0]
      const selectedItem =
        activeTab?.fileItem ?? listing.items.find((item) => item.path === selectedPath) ?? null
      set({
        listing,
        loading: false,
        agents: current.agents.map((agent) =>
          agent.id === agentId && agent.status !== 'connected'
            ? { ...agent, status: 'connected' }
            : agent
        ),
        selectedItem,
        preview:
          activeTab?.preview ??
          (selectedItem?.path === current.selectedItem?.path ? current.preview : null)
      })
    } catch (error) {
      const current = get()
      if (
        requestId !== refreshRequestSequence ||
        current.activeAgentId !== agentId ||
        current.workspaces[agentId]?.currentPath !== currentPath
      ) {
        return
      }
      const directoryError = formatUserFacingError(error, 'directory')
      set({
        loading: false,
        listing: null,
        directoryError,
        agents: isFileAccessDeniedError(error)
          ? current.agents.map((agent) =>
              agent.id === agentId ? { ...agent, status: 'permission-required' } : agent
            )
          : current.agents
      })
      notify.error(directoryError)
    }
  },

  setViewMode(viewMode) {
    set((state) =>
      updateActiveWorkspace(state, (workspace) => ({
        ...workspace,
        viewMode,
        columnActivePath: null
      }))
    )
  },

  setColumnActivePath(columnActivePath) {
    set((state) =>
      updateActiveWorkspace(state, (workspace) => ({
        ...workspace,
        columnActivePath
      }))
    )
  },

  setSearchQuery(searchQuery) {
    searchRequestSequence += 1
    set((state) => ({
      loading: false,
      search: null,
      ...updateActiveWorkspace(state, (workspace) => ({ ...workspace, searchQuery }))
    }))
  },

  toggleInspector() {
    set((state) =>
      updateActiveWorkspace(state, (workspace) => ({
        ...workspace,
        inspectorVisible: !workspace.inspectorVisible
      }))
    )
  },

  async selectItem(selectedItem, options) {
    const agentId = get().activeAgentId
    const selectionPreviewRequestId = ++selectionPreviewRequestSequence
    set((state) => ({
      selectedItem,
      preview: null,
      ...updateActiveWorkspace(state, (workspace) => ({
        ...workspace,
        selection: selectedItem ? [selectedItem.path] : []
      }))
    }))
    if (!selectedItem || isDirectoryLike(selectedItem)) return
    const previewDelayMs = Math.max(0, options?.previewDelayMs ?? 0)
    if (previewDelayMs > 0) {
      await wait(previewDelayMs)
      const current = get()
      if (
        selectionPreviewRequestId !== selectionPreviewRequestSequence ||
        current.activeAgentId !== agentId ||
        current.selectedItem?.path !== selectedItem.path
      ) {
        return
      }
    }
    try {
      const preview = await api().preview(agentId, selectedItem.path)
      const current = get()
      if (current.activeAgentId === agentId && current.selectedItem?.path === selectedItem.path) {
        set({ preview })
      }
    } catch (error) {
      const current = get()
      if (current.activeAgentId !== agentId || current.selectedItem?.path !== selectedItem.path) {
        return
      }
      notify.error(formatUserFacingError(error, 'preview'))
    }
  },

  copySelection(operation, item) {
    const state = get()
    const selectedItem = item ?? state.selectedItem
    if (!selectedItem || !state.activeAgentId) return
    set({
      fileClipboard: {
        operation,
        sourceAgentId: state.activeAgentId,
        sourcePaths: [selectedItem.path],
        createdAt: Date.now()
      }
    })
  },

  clearFileClipboard() {
    set({ fileClipboard: null })
  },

  invalidateAgentSessions(agentIds) {
    const invalidatedAgentIds = new Set(agentIds)
    set((state) => ({
      sessions: Object.fromEntries(
        Object.entries(state.sessions).filter(([agentId]) => !invalidatedAgentIds.has(agentId))
      )
    }))
  },

  async openItem(item) {
    selectionPreviewRequestSequence += 1
    if (isDirectoryLike(item)) {
      await get().navigate(item.path)
      return
    }

    const agentId = get().activeAgentId
    const existing = get().workspaces[agentId]?.openTabs.find((tab) => tab.filePath === item.path)
    if (existing) {
      get().activateTab(existing.id)
      return
    }

    const previewRequestId = ++previewRequestSequence
    const tab: Tab = {
      id: item.path,
      filePath: item.path,
      fileName: item.name,
      fileType: item.extension || item.mimeType,
      previewMode: isMarkdownExtension(item.extension) ? 'rendered' : 'source',
      fileItem: item,
      previewRequestId,
      loading: true
    }
    set((state) => ({
      selectedItem: item,
      preview: null,
      ...updateActiveWorkspace(state, (workspace) => ({
        ...workspace,
        openTabs: [...workspace.openTabs, tab],
        activeTabId: tab.id,
        selection: [item.path]
      }))
    }))

    try {
      const preview = await api().preview(agentId, item.path)
      set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        const requestIsCurrent = workspace.openTabs.some(
          (entry) => entry.id === tab.id && entry.previewRequestId === previewRequestId
        )
        if (!requestIsCurrent) return state
        const workspaces = {
          ...state.workspaces,
          [agentId]: {
            ...workspace,
            openTabs: workspace.openTabs.map((entry) =>
              entry.id === tab.id && entry.previewRequestId === previewRequestId
                ? { ...entry, preview, loading: false }
                : entry
            )
          }
        }
        const updateActivePreview =
          state.activeAgentId === agentId && workspace.activeTabId === tab.id ? { preview } : {}
        return { workspaces, ...updateActivePreview }
      })
    } catch (error) {
      const message = formatUserFacingError(error, 'preview')
      set((state) => {
        const workspace = state.workspaces[agentId]
        if (!workspace) return state
        const requestIsCurrent = workspace.openTabs.some(
          (entry) => entry.id === tab.id && entry.previewRequestId === previewRequestId
        )
        if (!requestIsCurrent) return state
        return {
          workspaces: {
            ...state.workspaces,
            [agentId]: {
              ...workspace,
              openTabs: workspace.openTabs.map((entry) =>
                entry.id === tab.id && entry.previewRequestId === previewRequestId
                  ? { ...entry, loading: false, error: message }
                  : entry
              )
            }
          }
        }
      })
      const currentWorkspace = get().workspaces[agentId]
      if (
        get().activeAgentId === agentId &&
        currentWorkspace?.openTabs.some(
          (entry) => entry.id === tab.id && entry.previewRequestId === previewRequestId
        )
      ) {
        notify.error(message)
      }
    }
  },

  async openLinkedDocument(path) {
    const state = get()
    const agentId = state.activeAgentId
    const existing = state.workspaces[agentId]?.openTabs.find((tab) => tab.filePath === path)
    if (existing) {
      get().activateTab(existing.id)
      return
    }

    try {
      const item = await api().getFileItem(agentId, path)
      if (get().activeAgentId !== agentId) return
      await get().openItem(item)
    } catch (error) {
      if (get().activeAgentId === agentId) {
        notify.error(formatUserFacingError(error, 'preview'))
      }
    }
  },

  activateTab(activeTabId) {
    set((state) => {
      const workspace = state.workspaces[state.activeAgentId]
      const tab = workspace.openTabs.find((entry) => entry.id === activeTabId)
      return {
        selectedItem: tab?.fileItem ?? state.selectedItem,
        preview: tab?.preview ?? (activeTabId ? null : state.preview),
        ...updateActiveWorkspace(state, (entry) => ({ ...entry, activeTabId }))
      }
    })
  },

  closeTab(tabId) {
    set((state) => {
      const workspace = state.workspaces[state.activeAgentId]
      const tabIndex = workspace.openTabs.findIndex((tab) => tab.id === tabId)
      if (tabIndex < 0) return state
      const openTabs = workspace.openTabs.filter((tab) => tab.id !== tabId)
      const nextTab =
        workspace.activeTabId === tabId
          ? (openTabs[tabIndex] ?? openTabs[tabIndex - 1] ?? null)
          : (openTabs.find((tab) => tab.id === workspace.activeTabId) ?? null)
      return {
        selectedItem: nextTab?.fileItem ?? state.selectedItem,
        preview: nextTab ? (nextTab.preview ?? null) : state.preview,
        ...updateActiveWorkspace(state, (entry) => ({
          ...entry,
          openTabs,
          activeTabId: nextTab?.id ?? null
        }))
      }
    })
  },

  setTabPreviewMode(tabId, previewMode) {
    set((state) =>
      updateActiveWorkspace(state, (workspace) => ({
        ...workspace,
        openTabs: workspace.openTabs.map((tab) =>
          tab.id === tabId ? { ...tab, previewMode } : tab
        )
      }))
    )
  },

  async runSearch(query) {
    const requestId = ++searchRequestSequence
    const state = get()
    const workspace = state.workspaces[state.activeAgentId]
    if (!workspace || !query.trim()) {
      set({ search: null })
      return
    }
    const agentId = state.activeAgentId
    const currentPath = workspace.currentPath
    set((current) => ({
      loading: true,
      ...updateActiveWorkspace(current, (entry) => ({
        ...entry,
        activeTabId: null,
        searchQuery: query
      }))
    }))
    try {
      const search = await api().search({
        query,
        scope: workspace.searchScope,
        currentPath,
        activeAgentId: agentId,
        showHiddenFiles: state.settings.showHiddenFiles
      })
      if (
        requestId !== searchRequestSequence ||
        get().activeAgentId !== agentId ||
        get().workspaces[agentId]?.currentPath !== currentPath ||
        get().workspaces[agentId]?.searchQuery !== query
      ) {
        return
      }
      set({ search, loading: false })
    } catch (error) {
      if (
        requestId !== searchRequestSequence ||
        get().activeAgentId !== agentId ||
        get().workspaces[agentId]?.currentPath !== currentPath
      ) {
        return
      }
      set({ loading: false })
      notify.error(formatUserFacingError(error, 'search'))
    }
  },

  clearSearch: () => {
    searchRequestSequence += 1
    set((state) => ({
      loading: false,
      search: null,
      ...updateActiveWorkspace(state, (workspace) => ({ ...workspace, searchQuery: '' }))
    }))
  },

  async executeCommand(command) {
    const state = get()
    if (isEditingCommand(command) && isEditableActiveElement()) return
    switch (command) {
      case 'focus-search':
        window.dispatchEvent(new Event('workdir:focus-search'))
        break
      case 'view-icon':
        state.setViewMode('icon')
        break
      case 'view-list':
        state.setViewMode('list')
        break
      case 'view-column':
        state.setViewMode('column')
        break
      case 'refresh':
        await state.refresh()
        break
      case 'toggle-hidden':
        await state.updateSettings((settings) => ({
          showHiddenFiles: !settings.showHiddenFiles
        }))
        await get().refresh()
        break
      case 'open-settings':
        state.setScreen('settings')
        break
      case 'toggle-inspector':
        state.toggleInspector()
        break
      case 'open-selected':
        if (!state.selectedItem) break
        await state.openItem(state.selectedItem)
        break
      case 'copy-selected':
        state.copySelection('copy')
        break
      case 'cut-selected':
        state.copySelection('cut')
        break
      case 'paste':
        window.dispatchEvent(new Event('workdir:paste-request'))
        break
      case 'select-all':
        break
      case 'reveal-selected':
        if (state.selectedItem) {
          await revealPathInFinder(state.activeAgentId, state.selectedItem.path)
        }
        break
      case 'copy-path':
        if (state.selectedItem) await copyPathToClipboard(state.selectedItem.path)
        break
      case 'trash-selected':
        if (state.selectedItem) window.dispatchEvent(new Event('workdir:trash-selected-request'))
        break
    }
  }
}))
