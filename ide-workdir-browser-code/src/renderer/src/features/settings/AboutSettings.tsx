import appIcon from '../../assets/app-icon.svg'
import { APP_VERSION } from '@shared/app-version'
import { SHORTCUTS } from '@shared/shortcuts'
import { SettingsPage } from './SettingsControls'

export const AboutSettings = (): React.JSX.Element => (
  <SettingsPage title="关于" description="IDE Workdir Browser for macOS" showSaveStatus={false}>
    <div className="about-card">
      <img className="app-logo" src={appIcon} alt="" />
      <h2>IDE Workdir Browser</h2>
      <p>版本 {APP_VERSION} · macOS 13+</p>
      <small>统一浏览和管理 AI 编程 Agent 的工作目录。</small>
    </div>
    <section className="shortcut-list">
      <h2>键盘快捷键</h2>
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.command}>
          <span>{shortcut.label}</span>
          <kbd>{shortcut.keys}</kbd>
        </div>
      ))}
    </section>
  </SettingsPage>
)
