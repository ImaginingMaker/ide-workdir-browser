import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/app-store'
import { ResetSettings } from './ResetSettings'

describe('ResetSettings', () => {
  const resetSettings = vi.fn().mockResolvedValue(true)

  beforeEach(() => {
    resetSettings.mockResolvedValue(true)
    useAppStore.setState({ resetSettings })
  })

  it('explains the impact and keeps keyboard focus inside the confirmation', async () => {
    const user = userEvent.setup()
    render(<ResetSettings />)

    const trigger = screen.getByRole('button', { name: '还原默认设置…' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: '还原所有默认设置？' })
    expect(dialog).toHaveClass('motion-backdrop-enter')
    expect(dialog.querySelector('.settings-reset-dialog')).toHaveClass('motion-dialog-enter')
    expect(screen.getByText(/不会删除任何磁盘文件/)).toBeInTheDocument()
    const cancel = screen.getByRole('button', { name: '取消' })
    const confirm = screen.getByRole('button', { name: '确认还原' })
    expect(cancel).toHaveFocus()

    await user.tab()
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '还原所有默认设置？' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(resetSettings).not.toHaveBeenCalled()
  })

  it('resets only after confirmation and closes on success', async () => {
    const user = userEvent.setup()
    render(<ResetSettings />)

    await user.click(screen.getByRole('button', { name: '还原默认设置…' }))
    await user.click(screen.getByRole('button', { name: '确认还原' }))

    expect(resetSettings).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '还原所有默认设置？' })).not.toBeInTheDocument()
    )
  })

  it('keeps the confirmation open when resetting fails', async () => {
    resetSettings.mockResolvedValueOnce(false)
    const user = userEvent.setup()
    render(<ResetSettings />)

    await user.click(screen.getByRole('button', { name: '还原默认设置…' }))
    await user.click(screen.getByRole('button', { name: '确认还原' }))

    expect(await screen.findByRole('dialog', { name: '还原所有默认设置？' })).toBeInTheDocument()
  })
})
