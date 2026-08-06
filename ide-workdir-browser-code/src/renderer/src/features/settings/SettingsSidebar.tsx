import { Icon, type IconName } from '@renderer/components/ui/Icon'
import { useAppStore, type SettingsSection } from '@renderer/store/app-store'

const sections: Array<{ id: SettingsSection; label: string; icon: IconName }> = [
  { id: 'agents', label: 'IDE 管理', icon: 'box' },
  { id: 'appearance', label: '外观', icon: 'palette' },
  { id: 'advanced', label: '高级', icon: 'sliders' },
  { id: 'about', label: '关于', icon: 'info' }
]

export const SettingsSidebar = (): React.JSX.Element => {
  const active = useAppStore((state) => state.settingsSection)
  const setSection = useAppStore((state) => state.setSettingsSection)
  const setScreen = useAppStore((state) => state.setScreen)

  return (
    <aside className="settings-sidebar">
      <header>设置</header>
      <nav aria-label="设置分类">
        {sections.map((section) => (
          <button
            type="button"
            key={section.id}
            className={active === section.id ? 'is-active' : ''}
            onClick={() => setSection(section.id)}
          >
            <Icon name={section.icon} />
            <span>{section.label}</span>
          </button>
        ))}
      </nav>
      <footer className="settings-sidebar__footer">
        <button
          type="button"
          className="settings-sidebar__back"
          aria-label="返回浏览器"
          aria-keyshortcuts="Escape"
          onClick={() => setScreen('browser')}
        >
          <Icon name="arrow-left" />
          <span>返回浏览器</span>
          <kbd aria-hidden="true">Esc</kbd>
        </button>
      </footer>
    </aside>
  )
}
