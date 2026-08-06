import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { agentFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { notify } from '../notifications/notification-store'
import { SettingsWorkspace } from './SettingsWorkspace'

describe('SettingsWorkspace', () => {
  beforeEach(() => {
    useAppStore.setState({
      settingsSection: 'agents',
      settings: DEFAULT_SETTINGS,
      agents: [agentFixture]
    })
    notify.clear()
  })

  it('uses a dedicated settings navigation without browser toolbar controls', () => {
    const { container } = render(<SettingsWorkspace />)

    expect(screen.getByRole('navigation', { name: '设置分类' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'IDE 管理' })).toBeInTheDocument()
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(container.querySelector('.settings-workspace')).toHaveClass('motion-presence-enter')
    expect(container.querySelector('.settings-content__scroll')).toHaveClass(
      'motion-presence-replace'
    )
  })

  it('uses the shared message host inside the settings content area', () => {
    notify.error('设置保存失败')

    render(<SettingsWorkspace />)

    expect(screen.getByRole('alert').closest('.notification-host')?.parentElement).toHaveClass(
      'settings-content'
    )
  })
})
