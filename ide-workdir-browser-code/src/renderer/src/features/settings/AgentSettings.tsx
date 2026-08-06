import { useState } from 'react'
import { AgentIcon } from '@renderer/components/ui/AgentIcon'
import { useAppStore } from '@renderer/store/app-store'
import type { AgentConfig } from '@shared/contracts'
import { SettingsPage, SettingsRow, SettingsSwitch } from './SettingsControls'

interface AgentDraft {
  id: string
  workdir: string
  error: string | null
}

const agentStatusLabel = {
  connected: '已连接',
  unavailable: '路径不可用',
  'permission-required': '需授权'
} as const

export const AgentSettings = (): React.JSX.Element => {
  const settings = useAppStore((state) => state.settings)
  const agents = useAppStore((state) => state.agents)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [editing, setEditing] = useState<AgentDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const updateAgent = (id: string, patch: Partial<AgentConfig>): void => {
    void updateSettings((currentSettings) => ({
      agents: currentSettings.agents.map((agent) =>
        agent.id === id ? { ...agent, ...patch } : agent
      )
    }))
  }

  const saveWorkdir = async (): Promise<void> => {
    if (!editing) return
    const workdir = editing.workdir.trim()
    if (!workdir) {
      setEditing({ ...editing, error: '工作目录不能为空。' })
      return
    }

    const editingId = editing.id
    setIsSaving(true)
    const didSave = await updateSettings((currentSettings) => ({
      agents: currentSettings.agents.map((agent) =>
        agent.id === editingId ? { ...agent, workdir } : agent
      )
    }))
    setIsSaving(false)
    if (didSave) {
      setEditing(null)
    } else {
      setEditing((current) =>
        current?.id === editingId ? { ...current, error: '保存失败，请重试。' } : current
      )
    }
  }

  return (
    <SettingsPage
      title="IDE 管理"
      description="每个 Agent 的浏览路径、标签页和搜索上下文相互独立。"
    >
      <div className="agent-cards">
        {settings.agents.map((agent) => {
          const resolved = agents.find((entry) => entry.id === agent.id)
          return (
            <article className="agent-card" key={agent.id}>
              <div className="agent-card__icon">
                <AgentIcon agentId={agent.id} fallback={agent.icon} size={22} />
              </div>
              <div className="agent-card__body">
                <div className="agent-card__title">
                  <h2>{agent.name}</h2>
                  <span
                    className={`agent-status agent-status--${resolved?.status ?? 'unavailable'}`}
                  >
                    {agentStatusLabel[resolved?.status ?? 'unavailable']}
                  </span>
                </div>
                {editing?.id === agent.id ? (
                  <>
                    <div className="path-editor">
                      <input
                        autoFocus
                        aria-label={`${agent.name} 工作目录`}
                        aria-invalid={Boolean(editing.error)}
                        value={editing.workdir}
                        disabled={isSaving}
                        onChange={(event) =>
                          setEditing({
                            id: agent.id,
                            workdir: event.target.value,
                            error: null
                          })
                        }
                      />
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={async () => {
                          const path = await window.workdir.chooseDirectory()
                          if (path) {
                            setEditing((current) =>
                              current?.id === agent.id
                                ? { ...current, workdir: path, error: null }
                                : current
                            )
                          }
                        }}
                      >
                        选择…
                      </button>
                      <button type="button" disabled={isSaving} onClick={() => setEditing(null)}>
                        取消
                      </button>
                      <button type="button" disabled={isSaving} onClick={() => void saveWorkdir()}>
                        {isSaving ? '保存中…' : '完成'}
                      </button>
                    </div>
                    {editing.error && (
                      <small className="settings-field-error" role="alert">
                        {editing.error}
                      </small>
                    )}
                  </>
                ) : (
                  <code className="path-summary" title={resolved?.resolvedWorkdir}>
                    {resolved?.resolvedWorkdir ?? agent.workdir}
                  </code>
                )}
              </div>
              <div className="agent-card__actions">
                {editing?.id !== agent.id && (
                  <button
                    type="button"
                    className="agent-card__edit"
                    aria-label={`编辑 ${agent.name} 工作目录`}
                    disabled={isSaving}
                    onClick={() =>
                      setEditing({ id: agent.id, workdir: agent.workdir, error: null })
                    }
                  >
                    编辑
                  </button>
                )}
                <SettingsSwitch
                  checked={agent.enabled}
                  disabled={isSaving}
                  ariaLabel={`启用 ${agent.name}`}
                  onCheckedChange={(enabled) => updateAgent(agent.id, { enabled })}
                />
              </div>
            </article>
          )
        })}
        <SettingsRow title="默认 Agent" description="应用启动时默认打开的工作区" as="label">
          <select
            value={settings.defaultAgentId}
            onChange={(event) => void updateSettings({ defaultAgentId: event.target.value })}
          >
            {settings.agents
              .filter((agent) => agent.enabled)
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
          </select>
        </SettingsRow>
      </div>
    </SettingsPage>
  )
}
