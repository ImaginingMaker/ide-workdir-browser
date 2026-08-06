import { useEffect } from 'react'
import { BrowserWorkspace } from './features/app-shell/BrowserWorkspace'
import { Titlebar } from './features/app-shell/Titlebar'
import { SettingsWorkspace } from './features/settings/SettingsWorkspace'
import { useAppStore } from './store/app-store'
import { useAppCommands } from './hooks/use-app-commands'

function App(): React.JSX.Element {
  useAppCommands()
  const initialize = useAppStore((state) => state.initialize)
  const ready = useAppStore((state) => state.ready)
  const screen = useAppStore((state) => state.screen)

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    const refreshDeniedAgent = (): void => {
      const state = useAppStore.getState()
      const activeAgent = state.agents.find((agent) => agent.id === state.activeAgentId)
      if (activeAgent?.status === 'permission-required') void state.refresh()
    }
    window.addEventListener('focus', refreshDeniedAgent)
    return () => window.removeEventListener('focus', refreshDeniedAgent)
  }, [])

  const content = !ready ? (
    <main className="boot-screen motion-presence-enter">
      <span className="spinner" />
      <p>正在载入工作区…</p>
    </main>
  ) : screen === 'settings' ? (
    <SettingsWorkspace />
  ) : (
    <BrowserWorkspace />
  )

  return (
    <div className="app-window">
      <Titlebar />
      {content}
    </div>
  )
}

export default App
