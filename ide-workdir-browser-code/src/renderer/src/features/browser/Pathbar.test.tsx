import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agentFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { createWorkspace } from '../../store/workspace'
import { Pathbar } from './Pathbar'

describe('Pathbar', () => {
  const navigate = vi.fn()

  const setCurrentPath = (currentPath: string): void => {
    const state = useAppStore.getState()
    const workspace = state.workspaces[agentFixture.id]
    if (!workspace) throw new Error('Missing workspace')
    useAppStore.setState({
      workspaces: {
        ...state.workspaces,
        [agentFixture.id]: {
          ...workspace,
          currentPath
        }
      }
    })
  }

  beforeEach(() => {
    navigate.mockReset()
    useAppStore.setState({
      agents: [agentFixture],
      activeAgentId: agentFixture.id,
      workspaces: {
        [agentFixture.id]: {
          ...createWorkspace(agentFixture),
          currentPath: `${agentFixture.resolvedWorkdir}/projects/src`
        }
      },
      navigate
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a macOS-style bottom path and navigates within the agent root', async () => {
    render(<Pathbar />)

    expect(screen.getByText('Macintosh HD')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'projects' }))
    expect(navigate).toHaveBeenCalledWith(`${agentFixture.resolvedWorkdir}/projects`)
    expect(screen.getByRole('button', { name: 'src' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'src' })).toHaveAttribute('aria-current', 'location')
    expect(screen.getByRole('button', { name: 'Users' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Users' })).toHaveClass('is-disabled')
  })

  it('follows the active column directory in column view', () => {
    const columnActivePath = `${agentFixture.resolvedWorkdir}/projects/src/components`
    useAppStore.setState((state) => ({
      workspaces: {
        ...state.workspaces,
        [agentFixture.id]: {
          ...state.workspaces[agentFixture.id],
          currentPath: agentFixture.resolvedWorkdir,
          columnActivePath,
          viewMode: 'column'
        }
      }
    }))

    render(<Pathbar />)

    expect(screen.getByRole('button', { name: 'components' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'components' })).toHaveAttribute(
      'aria-current',
      'location'
    )
    expect(screen.getByRole('button', { name: 'src' })).not.toBeDisabled()
  })

  it('animates path segments when entering and leaving subdirectories', () => {
    vi.useFakeTimers()
    render(<Pathbar />)

    act(() => {
      setCurrentPath(`${agentFixture.resolvedWorkdir}/projects/src/components`)
    })

    expect(screen.getByText('components').closest('.pathbar__segment')).toHaveClass(
      'motion-presence-enter'
    )

    act(() => {
      setCurrentPath(`${agentFixture.resolvedWorkdir}/projects/src`)
    })

    expect(screen.getByText('components').closest('.pathbar__segment')).toHaveClass(
      'motion-presence-exit'
    )

    act(() => {
      vi.advanceTimersByTime(180)
    })

    expect(screen.queryByText('components')).not.toBeInTheDocument()
  })

  it('fades sibling directory changes in place without exit and enter segments', () => {
    vi.useFakeTimers()
    render(<Pathbar />)

    act(() => {
      setCurrentPath(`${agentFixture.resolvedWorkdir}/projects/sqlite`)
    })

    const sqliteSegment = screen.getByText('sqlite').closest('.pathbar__segment')
    expect(sqliteSegment).toHaveClass('motion-presence-replace')
    expect(sqliteSegment).not.toHaveClass('motion-presence-enter')
    expect(screen.queryByText('src')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(180)
    })

    expect(screen.getByText('sqlite').closest('.pathbar__segment')).not.toHaveClass(
      'motion-presence-replace'
    )
  })
})
