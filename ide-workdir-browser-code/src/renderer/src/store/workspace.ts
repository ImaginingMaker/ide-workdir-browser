import type { ResolvedAgent, WorkspaceState } from '@shared/contracts'

export const createWorkspace = (agent: ResolvedAgent): WorkspaceState => ({
  agentId: agent.id,
  currentPath: agent.resolvedWorkdir,
  columnActivePath: null,
  columnRefreshVersion: 0,
  history: [agent.resolvedWorkdir],
  historyIndex: 0,
  openTabs: [],
  activeTabId: null,
  searchQuery: '',
  searchScope: 'current-dir',
  selection: [],
  viewMode: 'icon',
  inspectorVisible: window.innerWidth > 720,
  inspectorTab: 'info'
})

export const navigateWorkspace = (workspace: WorkspaceState, path: string): WorkspaceState => {
  if (workspace.currentPath === path) return workspace
  const history = [...workspace.history.slice(0, workspace.historyIndex + 1), path]
  return {
    ...workspace,
    currentPath: path,
    columnActivePath: null,
    history,
    historyIndex: history.length - 1,
    activeTabId: null,
    selection: []
  }
}

export const moveHistory = (workspace: WorkspaceState, direction: -1 | 1): WorkspaceState => {
  const historyIndex = Math.min(
    workspace.history.length - 1,
    Math.max(0, workspace.historyIndex + direction)
  )
  return {
    ...workspace,
    currentPath: workspace.history[historyIndex],
    columnActivePath: null,
    historyIndex,
    activeTabId: null,
    selection: []
  }
}
