import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { useAppStore } from '../../store/app-store'
import { AgentSettings } from './AgentSettings'

describe('AgentSettings', () => {
  const updateSettings = vi.fn()

  beforeEach(() => {
    updateSettings.mockReset().mockResolvedValue(true)
    useAppStore.setState({
      settings: DEFAULT_SETTINGS,
      settingsSaveStatus: 'saved',
      agents: [],
      updateSettings
    })
  })

  it('keeps the default Agent row in the spaced card group', () => {
    const { container } = render(<AgentSettings />)

    expect(screen.getByText('默认 Agent').closest('.settings-row')?.parentElement).toHaveClass(
      'agent-cards'
    )
    expect(container.querySelectorAll('.agent-card__icon .agent-icon--brand img')).toHaveLength(
      DEFAULT_SETTINGS.agents.length
    )
  })

  it('aligns each edit action and switch in the same action group', () => {
    render(<AgentSettings />)

    const editActions = screen.getAllByRole('button', { name: /编辑 .* 工作目录/ })

    expect(editActions).toHaveLength(DEFAULT_SETTINGS.agents.length)
    editActions.forEach((editAction) => {
      const actions = editAction.closest('.agent-card__actions')

      expect(actions).not.toBeNull()
      expect(actions?.querySelector('.switch')).toBeInTheDocument()
    })
  })

  it('distinguishes a denied folder from an unavailable path', () => {
    const kiro = DEFAULT_SETTINGS.agents.find((agent) => agent.id === 'kiro')
    useAppStore.setState({
      agents: kiro
        ? [{ ...kiro, resolvedWorkdir: '/Users/test/Desktop', status: 'permission-required' }]
        : []
    })

    render(<AgentSettings />)

    expect(screen.getByText('需授权')).toBeInTheDocument()
  })

  it('keeps a workdir draft local and commits it once through the latest settings', async () => {
    const user = userEvent.setup()
    render(<AgentSettings />)

    await user.click(screen.getByRole('button', { name: '编辑 Codex 工作目录' }))
    const input = screen.getByRole('textbox', { name: 'Codex 工作目录' })
    await user.clear(input)
    await user.type(input, '/tmp/codex')

    expect(updateSettings).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '完成' }))

    expect(updateSettings).toHaveBeenCalledOnce()
    const patchFactory = updateSettings.mock.calls[0]?.[0]
    expect(patchFactory).toBeTypeOf('function')
    expect(patchFactory(DEFAULT_SETTINGS).agents[0].workdir).toBe('/tmp/codex')
  })

  it('keeps the workdir editor open with an inline error when saving fails', async () => {
    updateSettings.mockResolvedValueOnce(false)
    const user = userEvent.setup()
    render(<AgentSettings />)

    await user.click(screen.getByRole('button', { name: '编辑 Codex 工作目录' }))
    await user.click(screen.getByRole('button', { name: '完成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败，请重试。')
    expect(screen.getByRole('textbox', { name: 'Codex 工作目录' })).toBeInTheDocument()
  })
})
