import { Profiler } from 'react'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentFixture, fileFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { createWorkspace } from '../../store/workspace'
import { SearchWorkspace } from './SearchWorkspace'

describe('SearchWorkspace', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeAgentId: agentFixture.id,
      workspaces: {
        [agentFixture.id]: { ...createWorkspace(agentFixture), searchQuery: 'readme' }
      },
      search: {
        results: [{ agentId: agentFixture.id, item: fileFixture }],
        scannedCount: 42,
        truncated: false
      }
    })
  })

  it('shows query, scan summary and full result path', () => {
    render(<SearchWorkspace />)
    expect(screen.getByRole('heading', { name: '“readme”的搜索结果' })).toBeInTheDocument()
    expect(screen.getByText('找到 1 项，已扫描 42 项')).toBeInTheDocument()
    expect(screen.getByText(fileFixture.path)).toBeInTheDocument()
  })

  it('does not rerender results when only the inspector visibility changes', () => {
    const onRender = vi.fn()
    render(
      <Profiler id="search-workspace" onRender={onRender}>
        <SearchWorkspace />
      </Profiler>
    )
    expect(onRender).toHaveBeenCalledTimes(1)

    act(() => useAppStore.getState().toggleInspector())

    expect(onRender).toHaveBeenCalledTimes(1)
  })
})
