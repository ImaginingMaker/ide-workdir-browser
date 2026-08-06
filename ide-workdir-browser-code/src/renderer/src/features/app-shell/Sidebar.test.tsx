import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { agentFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { createWorkspace } from '../../store/workspace'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: DEFAULT_SETTINGS,
      agents: [agentFixture],
      activeAgentId: agentFixture.id,
      sidebarCollapsed: false,
      workspaces: { [agentFixture.id]: createWorkspace(agentFixture) },
      selectAgent: vi.fn()
    })
  })

  it('shows agent identity, path and textual connection status', () => {
    const { container } = render(<Sidebar />)

    expect(screen.getByText('Codex')).toHaveClass('agent-item__name')
    expect(screen.getByText('~/.codex')).toHaveClass('agent-item__path')
    expect(container.querySelector('.agent-item__text')).toHaveTextContent('Codex~/.codex')
    expect(screen.getByText('已连接')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Codex/ })).toHaveAttribute('aria-current', 'page')
    const brandIcon = container.querySelector('.agent-item > .agent-icon--brand img')
    expect(brandIcon).toHaveAttribute('width', '24')
    expect(brandIcon?.parentElement).toHaveStyle({ width: '28px', height: '28px' })
    expect(screen.getByRole('button', { name: '设置' }).parentElement).toHaveClass(
      'sidebar__footer'
    )
  })

  it('collapses and expands from the sidebar button', async () => {
    const { container } = render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: '收起侧边栏' }))

    expect(container.querySelector('.sidebar')).toHaveClass('is-collapsed')
    expect(screen.getByRole('button', { name: '展开侧边栏' })).toBeInTheDocument()
    const collapsedBrandIcon = container.querySelector('.agent-item > .agent-icon--brand img')
    expect(collapsedBrandIcon).toHaveAttribute('width', '20')
    expect(collapsedBrandIcon?.parentElement).toHaveStyle({ width: '24px', height: '24px' })
    await userEvent.click(screen.getByRole('button', { name: '展开侧边栏' }))
    expect(container.querySelector('.sidebar')).not.toHaveClass('is-collapsed')
  })
})
