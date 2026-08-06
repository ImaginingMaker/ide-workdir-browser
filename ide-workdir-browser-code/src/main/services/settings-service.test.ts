import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { AppSettings } from '@shared/contracts'
import { SettingsService } from './settings-service'

class MemoryStore {
  setCalls = 0

  constructor(private settings: AppSettings = structuredClone(DEFAULT_SETTINGS)) {}

  get(..._arguments: ['settings', AppSettings]): AppSettings {
    void _arguments
    return this.settings
  }

  set(_key: 'settings', value: AppSettings): void {
    this.settings = value
    this.setCalls += 1
  }
}

describe('SettingsService', () => {
  it('clamps numeric settings to supported ranges', () => {
    const service = new SettingsService(new MemoryStore())
    const result = service.update({
      zoom: 999,
      readTimeout: 0,
      maxSearchResults: 20,
      paginationThreshold: 200000
    })

    expect(result).toMatchObject({
      zoom: 150,
      readTimeout: 1,
      maxSearchResults: 100,
      paginationThreshold: 100000
    })
  })

  it('selects an enabled default agent', () => {
    const service = new SettingsService(new MemoryStore())
    const agents = service
      .get()
      .agents.map((agent) => (agent.id === 'codex' ? { ...agent, enabled: false } : agent))
    const result = service.update({ agents, defaultAgentId: 'codex' })

    expect(result.defaultAgentId).toBe('claude')
    expect(result.agents.find((agent) => agent.id === 'claude')?.isDefault).toBe(true)
  })

  it('restores every persisted setting to a fresh copy of the defaults', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.theme = 'dark'
    settings.agents = [
      ...settings.agents.map((agent) =>
        agent.id === 'codex' ? { ...agent, workdir: '/tmp/custom-codex' } : agent
      ),
      {
        ...settings.agents[0],
        id: 'custom',
        name: 'Custom',
        isDefault: false,
        isCustom: true
      }
    ]
    const store = new MemoryStore(settings)
    const service = new SettingsService(store)

    const result = service.reset()

    expect(result).toEqual(DEFAULT_SETTINGS)
    expect(result).not.toBe(DEFAULT_SETTINGS)
    expect(service.get()).toEqual(DEFAULT_SETTINGS)
    expect(store.setCalls).toBe(1)
  })

  it('migrates and persists the legacy VS Code application-data path', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.agents = settings.agents.map((agent) =>
      agent.id === 'vscode' ? { ...agent, workdir: '~/Library/Application Support/Code' } : agent
    )
    const store = new MemoryStore(settings)
    const service = new SettingsService(store)

    expect(service.get().agents.find((agent) => agent.id === 'vscode')?.workdir).toBe('~/.copilot')
    expect(store.setCalls).toBe(1)

    service.get()
    expect(store.setCalls).toBe(1)
  })

  it('adds the default folder icon theme to settings saved by older versions', () => {
    const legacySettings: Partial<AppSettings> = structuredClone(DEFAULT_SETTINGS)
    delete legacySettings.folderIconTheme
    const store = new MemoryStore(legacySettings as AppSettings)
    const service = new SettingsService(store)

    expect(service.get().folderIconTheme).toBe('outline')
    expect(store.setCalls).toBe(1)

    service.get()
    expect(store.setCalls).toBe(1)
  })

  it('adds new default Agents to existing settings without changing saved Agents', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const savedCodex = {
      ...settings.agents[0],
      workdir: '/tmp/custom-codex',
      enabled: false
    }
    const customAgent = {
      ...settings.agents[0],
      id: 'team-agent',
      name: 'Team Agent',
      workdir: '/tmp/team-agent',
      isDefault: false,
      isCustom: true
    }
    settings.agents = [savedCodex, ...settings.agents.slice(1, 6), customAgent]
    settings.defaultAgentId = 'claude'
    const store = new MemoryStore(settings)
    const service = new SettingsService(store)

    const result = service.get()

    expect(result.agents.map((agent) => agent.id)).toEqual([
      'codex',
      'claude',
      'cursor',
      'zed',
      'trae',
      'vscode',
      'gemini',
      'opencode',
      'windsurf',
      'kiro',
      'team-agent'
    ])
    expect(result.agents[0]).toMatchObject({
      workdir: '/tmp/custom-codex',
      enabled: false
    })
    expect(result.agents.at(-1)).toEqual(customAgent)
    expect(result.defaultAgentId).toBe('claude')
    expect(store.setCalls).toBe(1)

    service.get()
    expect(store.setCalls).toBe(1)
  })

  it('preserves a user-configured VS Code workdir', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.agents = settings.agents.map((agent) =>
      agent.id === 'vscode' ? { ...agent, workdir: '/tmp/vscode-agent' } : agent
    )
    const store = new MemoryStore(settings)
    const service = new SettingsService(store)

    expect(service.get().agents.find((agent) => agent.id === 'vscode')?.workdir).toBe(
      '/tmp/vscode-agent'
    )
    expect(store.setCalls).toBe(0)
  })
})
