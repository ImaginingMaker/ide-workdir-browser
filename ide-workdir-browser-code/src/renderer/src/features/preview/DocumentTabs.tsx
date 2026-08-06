import { Icon } from '@renderer/components/ui/Icon'
import { FileIcon } from '@renderer/features/browser/FileIcon'
import { useAppStore } from '@renderer/store/app-store'

const currentFolderName = (path: string): string => path.split('/').filter(Boolean).pop() ?? path

export const DocumentTabs = (): React.JSX.Element | null => {
  const activeAgentId = useAppStore((state) => state.activeAgentId)
  const workspace = useAppStore((state) => state.workspaces[activeAgentId])
  const agentName = useAppStore(
    (state) => state.agents.find((agent) => agent.id === activeAgentId)?.name
  )
  const activateTab = useAppStore((state) => state.activateTab)
  const closeTab = useAppStore((state) => state.closeTab)

  if (!workspace || workspace.openTabs.length === 0) return null

  return (
    <div className="document-tabs">
      <div className="document-tabs__list" role="tablist" aria-label="打开的文档">
        <button
          type="button"
          role="tab"
          aria-selected={workspace.activeTabId === null}
          className={`document-tab document-tab--browser ${
            workspace.activeTabId === null ? 'is-active' : ''
          }`}
          onClick={() => activateTab(null)}
          title={workspace.currentPath}
        >
          <Icon name="folder" size={14} />
          <span>{currentFolderName(workspace.currentPath)}</span>
        </button>
        {workspace.openTabs.map((tab) => (
          <div
            className={`document-tab ${workspace.activeTabId === tab.id ? 'is-active' : ''}`}
            key={tab.id}
          >
            <button
              type="button"
              className="document-tab__label"
              role="tab"
              aria-selected={workspace.activeTabId === tab.id}
              onClick={() => activateTab(tab.id)}
              title={tab.filePath}
            >
              <FileIcon item={tab.fileItem} size={14} />
              <span>{tab.fileName}</span>
            </button>
            <button
              type="button"
              className="document-tab__close"
              aria-label={`关闭 ${tab.fileName}`}
              onClick={() => closeTab(tab.id)}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
      </div>
      <span className="document-tabs__scope">{agentName} · 独立标签</span>
    </div>
  )
}
