import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { useAppStore } from '../../store/app-store'
import { AppearanceSettings } from './AppearanceSettings'

describe('AppearanceSettings', () => {
  const updateSettings = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ settings: DEFAULT_SETTINGS, updateSettings })
  })

  it('updates theme through the shared settings action', async () => {
    render(<AppearanceSettings />)

    await userEvent.click(screen.getByRole('button', { name: '深色' }))
    expect(updateSettings).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('shows every folder icon preset and updates the selected theme', async () => {
    render(<AppearanceSettings />)

    expect(screen.getByRole('button', { name: '使用线框文件夹图标' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '使用实心文件夹图标' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '使用双色文件夹图标' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '使用双色文件夹图标' }))
    expect(updateSettings).toHaveBeenCalledWith({ folderIconTheme: 'duotone' })
  })
})
