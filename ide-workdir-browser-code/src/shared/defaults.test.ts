import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENTS } from './defaults'

describe('default agents', () => {
  it('defines the supported Agent roots in stable display order', () => {
    expect(DEFAULT_AGENTS.map(({ id, workdir }) => ({ id, workdir }))).toEqual([
      { id: 'codex', workdir: '~/.codex' },
      { id: 'claude', workdir: '~/.claude' },
      { id: 'cursor', workdir: '~/.cursor' },
      { id: 'zed', workdir: '~/.config/zed' },
      { id: 'trae', workdir: '~/.trae-cn' },
      { id: 'vscode', workdir: '~/.copilot' },
      { id: 'gemini', workdir: '~/.gemini' },
      { id: 'opencode', workdir: '~/.config/opencode' },
      { id: 'windsurf', workdir: '~/.codeium/windsurf' },
      { id: 'kiro', workdir: '~/.kiro' }
    ])
  })

  it('uses unique identifiers for every default Agent', () => {
    const ids = DEFAULT_AGENTS.map((agent) => agent.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})
