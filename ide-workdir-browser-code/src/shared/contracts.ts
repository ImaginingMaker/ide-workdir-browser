export type ViewMode = 'icon' | 'list' | 'column'
export type SearchScope = 'current-dir' | 'agent' | 'all'
export type Theme = 'light' | 'dark' | 'auto'
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'
export type AccentColor = 'blue' | 'green' | 'orange' | 'purple' | 'red'
export type FolderIconTheme = 'outline' | 'solid' | 'duotone'
export type AgentStatus = 'connected' | 'unavailable' | 'permission-required'
export type FileKind = 'file' | 'directory' | 'symlink'
export type DropConflictStrategy = 'keep-both' | 'replace' | 'skip'
export type FileTransferOperation = 'copy' | 'cut'
export type TextEditOperation = 'copy' | 'cut' | 'paste' | 'select-all'
export type UpdateCheckError = 'network' | 'rate-limited' | 'timeout' | 'invalid-response'
export type UpdateCheckResult =
  | {
      status: 'available'
      currentVersion: string
      latestVersion: string
      releaseUrl: string
      publishedAt: string
    }
  | {
      status: 'current'
      currentVersion: string
      latestVersion: string
    }
  | {
      status: 'no-release' | 'unconfigured'
      currentVersion: string
    }
  | {
      status: 'error'
      currentVersion: string
      error: UpdateCheckError
    }
export type AppCommand =
  | 'focus-search'
  | 'view-icon'
  | 'view-list'
  | 'view-column'
  | 'refresh'
  | 'toggle-hidden'
  | 'open-settings'
  | 'toggle-inspector'
  | 'open-selected'
  | 'copy-selected'
  | 'cut-selected'
  | 'paste'
  | 'select-all'
  | 'reveal-selected'
  | 'copy-path'
  | 'trash-selected'

export interface AgentConfig {
  id: string
  name: string
  icon: string
  workdir: string
  enabled: boolean
  isDefault: boolean
  isCustom: boolean
  lastScanned: number
}

export interface ResolvedAgent extends AgentConfig {
  resolvedWorkdir: string
  status: AgentStatus
}

export interface FileItem {
  name: string
  path: string
  type: FileKind
  size: number
  mimeType: string
  modifiedAt: number
  createdAt: number
  isHidden: boolean
  isReadable: boolean
  extension: string
  symlinkTarget?: string
  symlinkTargetType?: Exclude<FileKind, 'symlink'>
}

export interface DirectoryListing {
  path: string
  parentPath: string | null
  items: FileItem[]
  truncated: boolean
}

export interface SearchRequest {
  query: string
  scope: SearchScope
  currentPath: string
  activeAgentId: string
  showHiddenFiles: boolean
}

export interface SearchResult {
  agentId: string
  item: FileItem
}

export interface SearchResponse {
  results: SearchResult[]
  scannedCount: number
  truncated: boolean
}

export interface PreviewResponse {
  kind: 'text' | 'markdown' | 'image' | 'binary' | 'too-large' | 'unsupported'
  content?: string
  dataUrl?: string
  encoding?: string
  message?: string
}

export interface DropCopyRequest {
  agentId: string
  sourceAgentId?: string
  operation?: FileTransferOperation
  targetDirectory: string
  sourcePaths: string[]
  conflictStrategy: DropConflictStrategy
}

export interface DropCopyConflict {
  name: string
  sourcePath: string
  targetPath: string
}

export interface DropCopyPreflight {
  targetDirectory: string
  sourceCount: number
  itemCount: number
  totalBytes: number
  conflicts: DropCopyConflict[]
  errors: string[]
}

export interface DropCopyResult {
  operationId: string
  copied: number
  moved: number
  skipped: number
  replaced: number
  renamed: number
  errors: string[]
}

export interface FileClipboard {
  operation: FileTransferOperation
  sourceAgentId: string
  sourcePaths: string[]
  createdAt: number
}

export interface FileOperationUndoResult {
  operationId: string
  restored: number
  errors: string[]
}

export interface AppSettings {
  theme: Theme
  accentColor: AccentColor
  zoom: number
  fontSize: FontSize
  folderIconTheme: FolderIconTheme
  showHiddenFiles: boolean
  followSymlinks: boolean
  maxSearchResults: number
  readTimeout: number
  paginationThreshold: number
  agents: AgentConfig[]
  defaultAgentId: string
}

export type SettingsPatch = Partial<AppSettings>

export interface Tab {
  id: string
  filePath: string
  fileName: string
  fileType: string
  previewMode: 'rendered' | 'source'
  fileItem: FileItem
  preview?: PreviewResponse
  previewRequestId?: number
  loading: boolean
  error?: string
}

export interface WorkspaceState {
  agentId: string
  currentPath: string
  columnActivePath: string | null
  columnRefreshVersion: number
  history: string[]
  historyIndex: number
  openTabs: Tab[]
  activeTabId: string | null
  searchQuery: string
  searchScope: SearchScope
  selection: string[]
  viewMode: ViewMode
  inspectorVisible: boolean
  inspectorTab: 'preview' | 'info'
}

export interface WorkdirApi {
  openFileAccessSettings(): Promise<void>
  checkForUpdates(): Promise<UpdateCheckResult>
  getSettings(): Promise<AppSettings>
  updateSettings(patch: SettingsPatch): Promise<AppSettings>
  resetSettings(): Promise<AppSettings>
  getAgents(): Promise<ResolvedAgent[]>
  chooseDirectory(): Promise<string | null>
  getDroppedFilePath(file: unknown): string | null
  readDirectory(agentId: string, path: string): Promise<DirectoryListing>
  search(request: SearchRequest): Promise<SearchResponse>
  thumbnail(agentId: string, path: string): Promise<string | null>
  getFileItem(agentId: string, path: string): Promise<FileItem>
  preview(agentId: string, path: string): Promise<PreviewResponse>
  preflightDropCopy(request: DropCopyRequest): Promise<DropCopyPreflight>
  copyDroppedItems(request: DropCopyRequest): Promise<DropCopyResult>
  undoFileOperation(agentId: string, operationId: string): Promise<FileOperationUndoResult>
  trashItem(agentId: string, path: string): Promise<void>
  revealInFinder(agentId: string, path: string): Promise<void>
  openExternal(agentId: string, path: string): Promise<void>
  copyText(text: string): Promise<void>
  performTextEdit(operation: TextEditOperation): Promise<void>
  onCommand(listener: (command: AppCommand) => void): () => void
}
