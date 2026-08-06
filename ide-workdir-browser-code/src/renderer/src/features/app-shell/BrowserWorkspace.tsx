import { FileBrowser } from '../browser/FileBrowser'
import { NotificationHost } from '../notifications/NotificationHost'
import { Pathbar } from '../browser/Pathbar'
import { Toolbar } from '../browser/Toolbar'
import { DocumentPreview } from '../preview/DocumentPreview'
import { DocumentTabs } from '../preview/DocumentTabs'
import { Inspector } from '../preview/Inspector'
import { useAppStore } from '@renderer/store/app-store'
import { Sidebar } from './Sidebar'
import { Statusbar } from './Statusbar'

export const BrowserWorkspace = (): React.JSX.Element => {
  const activeAgentId = useAppStore((state) => state.activeAgentId)
  const activeTab = useAppStore((state) => {
    const workspace = state.workspaces[state.activeAgentId]
    return workspace?.openTabs.find((tab) => tab.id === workspace.activeTabId)
  })
  return (
    <div className="browser-workspace motion-presence-enter">
      <Sidebar />
      <section className="browser-main">
        <Toolbar />
        <DocumentTabs />
        <div className="browser-content">
          <div className="browser-primary">
            <div
              className="browser-primary__content motion-presence-replace"
              key={`${activeAgentId}:${activeTab?.id ?? 'browser'}`}
            >
              {activeTab ? (
                <DocumentPreview agentId={activeAgentId} tab={activeTab} />
              ) : (
                <FileBrowser />
              )}
            </div>
            <NotificationHost />
          </div>
          <Inspector />
        </div>
        <Pathbar />
        <Statusbar />
      </section>
    </div>
  )
}
