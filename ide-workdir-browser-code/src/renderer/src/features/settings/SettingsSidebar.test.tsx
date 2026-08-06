import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/app-store'
import { SettingsSidebar } from './SettingsSidebar'

describe('SettingsSidebar', () => {
  it('changes sections and returns to the browser', async () => {
    const setSettingsSection = vi.fn()
    const setScreen = vi.fn()
    useAppStore.setState({
      settingsSection: 'agents',
      setSettingsSection,
      setScreen
    })
    render(<SettingsSidebar />)

    await userEvent.click(screen.getByRole('button', { name: '外观' }))
    expect(setSettingsSection).toHaveBeenCalledWith('appearance')
    expect(screen.getByRole('button', { name: '返回浏览器' }).parentElement).toHaveClass(
      'settings-sidebar__footer'
    )
    expect(screen.getByRole('button', { name: '返回浏览器' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Escape'
    )
    expect(screen.getByText('Esc')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '返回浏览器' }))
    expect(setScreen).toHaveBeenCalledWith('browser')
  })
})
