import { useEffect, useRef } from 'react'
import { Icon } from '@renderer/components/ui/Icon'
import { IconButton } from '@renderer/components/ui/IconButton'
import { useAppStore } from '@renderer/store/app-store'
import type { AppCommand, ViewMode } from '@shared/contracts'

const viewButtons: Array<{
  mode: ViewMode
  command: AppCommand
  icon: 'grid' | 'list' | 'columns'
  label: string
}> = [
  { mode: 'icon', command: 'view-icon', icon: 'grid', label: '图标视图（⌘1）' },
  { mode: 'list', command: 'view-list', icon: 'list', label: '列表视图（⌘2）' },
  { mode: 'column', command: 'view-column', icon: 'columns', label: '分栏视图（⌘3）' }
]

export const Toolbar = (): React.JSX.Element => {
  const searchRef = useRef<HTMLInputElement>(null)
  const activeAgentId = useAppStore((state) => state.activeAgentId)
  const workspace = useAppStore((state) => state.workspaces[activeAgentId])
  const moveHistory = useAppStore((state) => state.moveHistory)
  const setSearchQuery = useAppStore((state) => state.setSearchQuery)
  const runSearch = useAppStore((state) => state.runSearch)
  const clearSearch = useAppStore((state) => state.clearSearch)
  const executeCommand = useAppStore((state) => state.executeCommand)

  useEffect(() => {
    const focusSearch = (): void => searchRef.current?.focus()
    window.addEventListener('workdir:focus-search', focusSearch)
    return () => window.removeEventListener('workdir:focus-search', focusSearch)
  }, [])

  if (!workspace) return <div className="toolbar" />

  return (
    <header className="toolbar">
      <div className="toolbar__leading">
        <div className="toolbar__group">
          <IconButton
            icon="chevron-left"
            label="后退"
            disabled={workspace.historyIndex <= 0}
            onClick={() => void moveHistory(-1)}
          />
          <IconButton
            icon="chevron-right"
            label="前进"
            disabled={workspace.historyIndex >= workspace.history.length - 1}
            onClick={() => void moveHistory(1)}
          />
        </div>
        <div className="segmented" role="tablist" aria-label="视图模式">
          {viewButtons.map(({ mode, command, icon, label }) => (
            <IconButton
              key={mode}
              role="tab"
              icon={icon}
              label={label}
              active={workspace.viewMode === mode}
              aria-selected={workspace.viewMode === mode}
              onClick={() => void executeCommand(command)}
            />
          ))}
        </div>
      </div>
      <form
        className="toolbar-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          void runSearch(workspace.searchQuery)
        }}
      >
        <Icon name="search" size={14} />
        <input
          ref={searchRef}
          value={workspace.searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="搜索"
          aria-label="搜索文件"
        />
        {workspace.searchQuery && (
          <button
            type="button"
            aria-label="清除搜索"
            onClick={() => {
              clearSearch()
            }}
          >
            <Icon name="x" size={13} />
          </button>
        )}
      </form>
      <div className="toolbar__group toolbar__trailing">
        <IconButton
          icon="refresh"
          label="刷新（⌘R）"
          onClick={() => void executeCommand('refresh')}
        />
        <IconButton
          icon="panel-right"
          label="显示或隐藏检查器（⌘I）"
          active={workspace.inspectorVisible}
          onClick={() => void executeCommand('toggle-inspector')}
        />
      </div>
    </header>
  )
}
