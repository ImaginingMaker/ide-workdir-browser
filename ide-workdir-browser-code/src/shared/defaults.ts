import type { AgentConfig, AppSettings } from './contracts'
import { NUMERIC_SETTING_CONSTRAINTS } from './settings'

export const DEFAULT_VSCODE_WORKDIR = '~/.copilot'

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'codex',
    name: 'Codex',
    icon: 'box',
    workdir: '~/.codex',
    enabled: true,
    isDefault: true,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'claude',
    name: 'Claude Code',
    icon: 'message-square',
    workdir: '~/.claude',
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'cursor',
    name: 'Cursor',
    icon: 'sparkles',
    workdir: '~/.cursor',
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'zed',
    name: 'Zed',
    icon: 'bolt',
    workdir: '~/.config/zed',
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'trae',
    name: 'Trae',
    icon: 'zap',
    workdir: '~/.trae-cn',
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'vscode',
    name: 'VS Code',
    icon: 'braces',
    workdir: DEFAULT_VSCODE_WORKDIR,
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    icon: 'sparkles',
    workdir: '~/.gemini',
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: 'code',
    workdir: '~/.config/opencode',
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    icon: 'zap',
    workdir: '~/.codeium/windsurf',
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  },
  {
    id: 'kiro',
    name: 'Kiro',
    icon: 'box',
    workdir: '~/.kiro',
    enabled: true,
    isDefault: false,
    isCustom: false,
    lastScanned: 0
  }
]

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  accentColor: 'blue',
  zoom: NUMERIC_SETTING_CONSTRAINTS.zoom.defaultValue,
  fontSize: 'medium',
  folderIconTheme: 'outline',
  showHiddenFiles: false,
  followSymlinks: false,
  maxSearchResults: NUMERIC_SETTING_CONSTRAINTS.maxSearchResults.defaultValue,
  readTimeout: NUMERIC_SETTING_CONSTRAINTS.readTimeout.defaultValue,
  paginationThreshold: NUMERIC_SETTING_CONSTRAINTS.paginationThreshold.defaultValue,
  agents: DEFAULT_AGENTS,
  defaultAgentId: 'codex'
}

export const IPC_CHANNELS = {
  fileAccessOpenSettings: 'permissions:file-access:open-settings',
  updateCheck: 'app:update:check',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsReset: 'settings:reset',
  agentsGet: 'agents:get',
  directoryChoose: 'directory:choose',
  directoryRead: 'directory:read',
  search: 'files:search',
  thumbnail: 'file:thumbnail',
  fileItemGet: 'file:item:get',
  preview: 'file:preview',
  dropCopyPreflight: 'file-operations:drop-copy-preflight',
  dropCopyExecute: 'file-operations:drop-copy-execute',
  fileOperationUndo: 'file-operations:undo',
  trashItem: 'file:trash',
  revealInFinder: 'file:reveal',
  openExternal: 'file:open-external',
  copyText: 'clipboard:copy-text',
  textEdit: 'clipboard:text-edit'
} as const

export const IPC_EVENTS = {
  appCommand: 'app:command'
} as const
