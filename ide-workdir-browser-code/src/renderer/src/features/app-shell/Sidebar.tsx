import { AgentIcon } from '@renderer/components/ui/AgentIcon'
import { Icon } from '@renderer/components/ui/Icon'
import { IconButton } from '@renderer/components/ui/IconButton'
import { useAppStore } from '@renderer/store/app-store'

const statusLabel = {
  connected: '已连接',
  unavailable: '路径不可用',
  'permission-required': '需授权'
} as const

export const Sidebar = (): React.JSX.Element => {
  const agents = useAppStore((state) => state.agents)
  const activeAgentId = useAppStore((state) => state.activeAgentId)
  const selectAgent = useAppStore((state) => state.selectAgent)
  const setScreen = useAppStore((state) => state.setScreen)
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Agent 工作区">
      <div className="sidebar__header">
        <span>Agent</span>
        <IconButton
          icon="panel-left"
          label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          active={collapsed}
          onClick={toggleSidebar}
        />
      </div>
      <nav className="sidebar__nav">
        {agents
          .filter((agent) => agent.enabled)
          .map((agent) => (
            <button
              type="button"
              key={agent.id}
              className={`agent-item ${activeAgentId === agent.id ? 'is-active' : ''}`}
              aria-current={activeAgentId === agent.id ? 'page' : undefined}
              onClick={() => void selectAgent(agent.id)}
              title={`${agent.name}\n${agent.resolvedWorkdir}\n${statusLabel[agent.status]}`}
            >
              <AgentIcon agentId={agent.id} fallback={agent.icon} size={collapsed ? 20 : 24} />
              <span className="agent-item__text">
                <strong className="agent-item__name">{agent.name}</strong>
                <small className="agent-item__path">{agent.workdir}</small>
              </span>
              <span className={`agent-status agent-status--${agent.status}`}>
                <i />
                <span>{statusLabel[agent.status]}</span>
              </span>
            </button>
          ))}
      </nav>
      <footer className="sidebar__footer">
        <button type="button" className="sidebar__settings" onClick={() => setScreen('settings')}>
          <Icon name="settings" />
          <span>设置</span>
        </button>
      </footer>
    </aside>
  )
}
