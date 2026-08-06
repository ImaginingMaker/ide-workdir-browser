import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { useAppStore } from '../../store/app-store'
import { AdvancedSettings } from './AdvancedSettings'

describe('AdvancedSettings', () => {
  const updateSettings = vi.fn()

  beforeEach(() => {
    updateSettings.mockReset().mockResolvedValue(true)
    useAppStore.setState({
      settings: DEFAULT_SETTINGS,
      settingsSaveStatus: 'saved',
      updateSettings
    })
  })

  it('updates the symlink safety preference', async () => {
    render(<AdvancedSettings />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(updateSettings).toHaveBeenCalledWith({ followSymlinks: true })
  })

  it('keeps reset settings in the same consistently spaced group', () => {
    render(<AdvancedSettings />)

    expect(
      screen.getByText('还原所有默认设置').closest('.settings-reset')?.parentElement
    ).toHaveClass('settings-group')
  })

  it('commits a numeric setting once after editing finishes', async () => {
    const user = userEvent.setup()
    render(<AdvancedSettings />)
    const input = screen.getByRole('spinbutton', { name: /文件读取超时/ })

    await user.clear(input)
    await user.type(input, '20')
    expect(updateSettings).not.toHaveBeenCalled()

    await user.tab()
    expect(updateSettings).toHaveBeenCalledOnce()
    expect(updateSettings).toHaveBeenCalledWith({ readTimeout: 20 })
  })
})
