import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './store/app-store'
import App from './App'

vi.mock('./hooks/use-app-commands', () => ({ useAppCommands: vi.fn() }))
vi.mock('./features/app-shell/Titlebar', () => ({
  Titlebar: () => <header>Titlebar</header>
}))
vi.mock('./features/app-shell/BrowserWorkspace', () => ({
  BrowserWorkspace: () => <main>Browser</main>
}))
vi.mock('./features/settings/SettingsWorkspace', () => ({
  SettingsWorkspace: () => <main>Settings</main>
}))

describe('App lifecycle', () => {
  const initialize = vi.fn()
  const refresh = vi.fn()

  beforeEach(() => {
    initialize.mockReset().mockResolvedValue(undefined)
    refresh.mockReset().mockResolvedValue(undefined)
    useAppStore.setState({
      ready: true,
      screen: 'browser',
      activeAgentId: 'kiro',
      agents: [],
      initialize,
      refresh
    })
  })

  it('loads the workspace without a global disk access gate', () => {
    render(<App />)

    expect(screen.getByText('Browser')).toBeInTheDocument()
    expect(initialize).toHaveBeenCalledOnce()
  })

  it('retries only the active Agent that needs folder permission after focus returns', () => {
    useAppStore.setState({
      agents: [
        {
          id: 'kiro',
          name: 'Kiro',
          icon: 'box',
          workdir: '~/Desktop',
          enabled: true,
          isDefault: false,
          isCustom: false,
          lastScanned: 0,
          resolvedWorkdir: '/Users/test/Desktop',
          status: 'permission-required'
        }
      ]
    })
    render(<App />)

    act(() => window.dispatchEvent(new Event('focus')))

    expect(refresh).toHaveBeenCalledOnce()
  })

  it('does not retry a connected Agent when focus returns', () => {
    render(<App />)

    act(() => window.dispatchEvent(new Event('focus')))

    expect(refresh).not.toHaveBeenCalled()
  })
})
