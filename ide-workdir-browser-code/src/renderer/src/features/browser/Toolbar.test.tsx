import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { createWorkspace } from '../../store/workspace'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  const executeCommand = vi.fn()
  const runSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({
      activeAgentId: agentFixture.id,
      workspaces: { [agentFixture.id]: createWorkspace(agentFixture) },
      executeCommand,
      runSearch
    })
  })

  it('switches view mode and submits search', async () => {
    render(<Toolbar />)
    expect(screen.queryByRole('button', { name: '文件夹统计' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /列表视图/ }))
    expect(executeCommand).toHaveBeenCalledWith('view-list')

    const search = screen.getByRole('textbox', { name: '搜索文件' })
    await userEvent.type(search, 'config{Enter}')
    expect(runSearch).toHaveBeenCalledWith('config')
  })

  it('refreshes the active workspace from the toolbar', async () => {
    render(<Toolbar />)

    await userEvent.click(screen.getByRole('button', { name: /刷新/ }))

    expect(executeCommand).toHaveBeenCalledWith('refresh')
  })
})
