import { FolderIconGlyph } from '@renderer/features/browser/FileIcon'
import { useAppStore } from '@renderer/store/app-store'
import type { AccentColor, FolderIconTheme, FontSize, Theme } from '@shared/contracts'
import { NUMERIC_SETTING_CONSTRAINTS } from '@shared/settings'
import { SegmentedControl, SettingsPage, SettingsRow, SettingsSwitch } from './SettingsControls'

const themes: Array<{ value: Theme; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'auto', label: '自动' }
]
const accents: AccentColor[] = ['blue', 'green', 'orange', 'purple', 'red']
const fontSizes: Array<{ value: FontSize; label: string }> = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' }
]
const folderIconThemes: Array<{ value: FolderIconTheme; label: string }> = [
  { value: 'outline', label: '线框' },
  { value: 'solid', label: '实心' },
  { value: 'duotone', label: '双色' }
]

export const AppearanceSettings = (): React.JSX.Element => {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const zoomConstraint = NUMERIC_SETTING_CONSTRAINTS.zoom

  return (
    <SettingsPage title="外观" description="调整主题、强调色、缩放和文件显示方式。">
      <div className="settings-group">
        <SettingsRow title="主题" description="自动模式跟随 macOS 外观">
          <SegmentedControl
            label="主题"
            value={settings.theme}
            options={themes}
            onChange={(theme) => void updateSettings({ theme })}
          />
        </SettingsRow>
        <SettingsRow title="强调色" description="仅用于交互强调，不替代状态颜色">
          <div className="accent-picker">
            {accents.map((accent) => (
              <button
                type="button"
                key={accent}
                className={`accent-${accent} ${settings.accentColor === accent ? 'is-active' : ''}`}
                aria-label={`使用${accent}强调色`}
                aria-pressed={settings.accentColor === accent}
                onClick={() => void updateSettings({ accentColor: accent })}
              />
            ))}
          </div>
        </SettingsRow>
        <SettingsRow title="界面缩放" description="支持 75% 至 150%" as="label">
          <div className="range-field">
            <input
              type="range"
              min={zoomConstraint.min}
              max={zoomConstraint.max}
              step={zoomConstraint.step}
              value={settings.zoom}
              onChange={(event) => void updateSettings({ zoom: Number(event.target.value) })}
            />
            <output>{settings.zoom}%</output>
          </div>
        </SettingsRow>
        <SettingsRow title="字体大小" description="不改变布局缩放">
          <SegmentedControl
            label="字体大小"
            value={settings.fontSize}
            options={fontSizes}
            onChange={(fontSize) => void updateSettings({ fontSize })}
          />
        </SettingsRow>
        <SettingsRow title="文件夹图标" description="全局应用于图标、列表和分栏视图">
          <div className="folder-icon-picker" role="group" aria-label="文件夹图标">
            {folderIconThemes.map((option) => (
              <button
                type="button"
                key={option.value}
                className={settings.folderIconTheme === option.value ? 'is-active' : ''}
                aria-label={`使用${option.label}文件夹图标`}
                aria-pressed={settings.folderIconTheme === option.value}
                onClick={() => void updateSettings({ folderIconTheme: option.value })}
              >
                <FolderIconGlyph theme={option.value} size={26} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow title="显示隐藏文件" description="名称以点开头的文件将半透明显示" as="label">
          <SettingsSwitch
            checked={settings.showHiddenFiles}
            onCheckedChange={(showHiddenFiles) => void updateSettings({ showHiddenFiles })}
          />
        </SettingsRow>
      </div>
    </SettingsPage>
  )
}
