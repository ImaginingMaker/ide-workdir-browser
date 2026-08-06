import type { AppCommand } from './contracts'

export interface ShortcutInput {
  key: string
  meta: boolean
  alt?: boolean
  shift?: boolean
}

export interface ShortcutDefinition {
  command: AppCommand
  keys: string
  label: string
}

export const SHORTCUTS: ShortcutDefinition[] = [
  { command: 'focus-search', keys: '⌘K', label: '搜索' },
  { command: 'view-icon', keys: '⌘1', label: '图标视图' },
  { command: 'view-list', keys: '⌘2', label: '列表视图' },
  { command: 'view-column', keys: '⌘3', label: '分栏视图' },
  { command: 'refresh', keys: '⌘R', label: '刷新' },
  { command: 'toggle-hidden', keys: '⇧⌘.', label: '隐藏文件' },
  { command: 'open-settings', keys: '⌘,', label: '设置' },
  { command: 'toggle-inspector', keys: '⌘I', label: '检查器' },
  { command: 'open-selected', keys: '⌘O', label: '打开' },
  { command: 'copy-selected', keys: '⌘C', label: '复制项目' },
  { command: 'cut-selected', keys: '⌘X', label: '剪切项目' },
  { command: 'paste', keys: '⌘V', label: '粘贴项目' },
  { command: 'select-all', keys: '⌘A', label: '全选文本' },
  { command: 'reveal-selected', keys: '⌥⌘O', label: 'Finder 中显示' },
  { command: 'copy-path', keys: '⌥⌘C', label: '复制路径' },
  { command: 'trash-selected', keys: '⌘⌫', label: '移到废纸篓' }
]

export const resolveShortcut = (input: ShortcutInput): AppCommand | null => {
  if (!input.meta) return null
  const key = input.key.toLowerCase()

  if (input.alt && key === 'o') return 'reveal-selected'
  if (input.alt && key === 'c') return 'copy-path'
  if (input.alt) return null
  if (input.shift && (key === '.' || key === '>')) return 'toggle-hidden'
  if (input.shift) return null
  if (key === 'backspace' || key === 'delete') return 'trash-selected'

  const commands: Record<string, AppCommand> = {
    k: 'focus-search',
    '1': 'view-icon',
    '2': 'view-list',
    '3': 'view-column',
    r: 'refresh',
    ',': 'open-settings',
    i: 'toggle-inspector',
    o: 'open-selected',
    c: 'copy-selected',
    x: 'cut-selected',
    v: 'paste',
    a: 'select-all'
  }
  return commands[key] ?? null
}
