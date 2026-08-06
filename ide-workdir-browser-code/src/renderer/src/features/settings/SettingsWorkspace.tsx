import { useAppStore } from '@renderer/store/app-store'
import { NotificationHost } from '../notifications/NotificationHost'
import { AboutSettings } from './AboutSettings'
import { AdvancedSettings } from './AdvancedSettings'
import { AgentSettings } from './AgentSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { SettingsSidebar } from './SettingsSidebar'

export const SettingsWorkspace = (): React.JSX.Element => {
  const section = useAppStore((state) => state.settingsSection)
  return (
    <div className="settings-workspace motion-presence-enter">
      <SettingsSidebar />
      <main className="settings-content">
        <div className="settings-content__scroll motion-presence-replace" key={section}>
          {section === 'agents' && <AgentSettings />}
          {section === 'appearance' && <AppearanceSettings />}
          {section === 'advanced' && <AdvancedSettings />}
          {section === 'about' && <AboutSettings />}
        </div>
        <NotificationHost />
      </main>
    </div>
  )
}
