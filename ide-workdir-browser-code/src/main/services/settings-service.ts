import Store from 'electron-store'
import type { AgentConfig, AppSettings, SettingsPatch } from '@shared/contracts'
import { DEFAULT_AGENTS, DEFAULT_SETTINGS, DEFAULT_VSCODE_WORKDIR } from '@shared/defaults'
import { normalizeFolderIconTheme, normalizeNumericSetting } from '@shared/settings'

interface SettingsSchema {
  settings: AppSettings
}

interface SettingsStore {
  get(key: 'settings', defaultValue: AppSettings): AppSettings
  set(key: 'settings', value: AppSettings): void
}

const cloneDefaults = (): AppSettings => structuredClone(DEFAULT_SETTINGS)
const LEGACY_VSCODE_WORKDIR = '~/Library/Application Support/Code'
const usesLegacyVscodeWorkdir = (agent: AgentConfig): boolean =>
  agent.id === 'vscode' && !agent.isCustom && agent.workdir === LEGACY_VSCODE_WORKDIR
const hasMissingDefaultAgents = (agents: AgentConfig[]): boolean => {
  const agentIds = new Set(agents.map((agent) => agent.id))
  return DEFAULT_AGENTS.some((agent) => !agentIds.has(agent.id))
}
const withMissingDefaultAgents = (agents: AgentConfig[]): AgentConfig[] => {
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]))
  const defaultAgentIds = new Set(DEFAULT_AGENTS.map((agent) => agent.id))
  return [
    ...DEFAULT_AGENTS.map(
      (defaultAgent) => agentsById.get(defaultAgent.id) ?? structuredClone(defaultAgent)
    ),
    ...agents.filter((agent) => !defaultAgentIds.has(agent.id))
  ]
}

export class SettingsService {
  constructor(
    private readonly store: SettingsStore = new Store<SettingsSchema>({
      name: 'settings',
      defaults: { settings: cloneDefaults() }
    })
  ) {}

  get(): AppSettings {
    const storedSettings = this.store.get('settings', cloneDefaults())
    const settings = this.normalize(storedSettings)
    if (
      storedSettings.agents.some(usesLegacyVscodeWorkdir) ||
      hasMissingDefaultAgents(storedSettings.agents) ||
      storedSettings.folderIconTheme !== settings.folderIconTheme
    ) {
      this.store.set('settings', settings)
    }
    return settings
  }

  update(patch: SettingsPatch): AppSettings {
    const settings = this.normalize({ ...this.get(), ...patch })
    this.store.set('settings', settings)
    return settings
  }

  reset(): AppSettings {
    const settings = cloneDefaults()
    this.store.set('settings', settings)
    return settings
  }

  private normalize(input: AppSettings): AppSettings {
    const agents = withMissingDefaultAgents(input.agents)
    const defaultAgentExists = agents.some(
      (agent) => agent.id === input.defaultAgentId && agent.enabled
    )
    const defaultAgentId = defaultAgentExists
      ? input.defaultAgentId
      : (agents.find((agent) => agent.enabled)?.id ?? agents[0].id)

    return {
      ...input,
      folderIconTheme: normalizeFolderIconTheme(input.folderIconTheme),
      zoom: normalizeNumericSetting('zoom', input.zoom),
      maxSearchResults: normalizeNumericSetting('maxSearchResults', input.maxSearchResults),
      readTimeout: normalizeNumericSetting('readTimeout', input.readTimeout),
      paginationThreshold: normalizeNumericSetting(
        'paginationThreshold',
        input.paginationThreshold
      ),
      agents: agents.map((agent) => ({
        ...agent,
        workdir: usesLegacyVscodeWorkdir(agent) ? DEFAULT_VSCODE_WORKDIR : agent.workdir,
        isDefault: agent.id === defaultAgentId
      })),
      defaultAgentId
    }
  }
}
