import { describe, expect, it } from 'vitest'
import type { ResolvedAgent } from '@shared/contracts'
import { createWorkspace, moveHistory, navigateWorkspace } from './workspace'

const agent: ResolvedAgent = {
  id: 'codex',
  name: 'Codex',
  icon: 'box',
  workdir: '~/.codex',
  resolvedWorkdir: '/Users/test/.codex',
  enabled: true,
  isDefault: true,
  isCustom: false,
  lastScanned: 0,
  status: 'connected'
}

describe('workspace state', () => {
  it('creates an isolated workspace for an agent', () => {
    expect(createWorkspace(agent)).toMatchObject({
      agentId: 'codex',
      currentPath: '/Users/test/.codex',
      columnActivePath: null,
      viewMode: 'icon',
      historyIndex: 0
    })
  })

  it('drops forward history after a new navigation', () => {
    const first = navigateWorkspace(createWorkspace(agent), '/Users/test/.codex/a')
    const back = moveHistory(first, -1)
    const next = navigateWorkspace(back, '/Users/test/.codex/b')

    expect(next.history).toEqual(['/Users/test/.codex', '/Users/test/.codex/b'])
    expect(next.historyIndex).toBe(1)
    expect(next.columnActivePath).toBeNull()
  })

  it('keeps history movement inside bounds', () => {
    const workspace = createWorkspace(agent)
    expect(moveHistory(workspace, -1).historyIndex).toBe(0)
    expect(moveHistory(workspace, 1).historyIndex).toBe(0)
  })

  it('resets the active column path when moving through history', () => {
    const workspace = {
      ...navigateWorkspace(createWorkspace(agent), '/Users/test/.codex/a'),
      columnActivePath: '/Users/test/.codex/a/src'
    }

    expect(moveHistory(workspace, -1).columnActivePath).toBeNull()
  })
})
