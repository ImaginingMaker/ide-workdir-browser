import { useState } from 'react'
import { useAppStore } from '@renderer/store/app-store'
import {
  normalizeNumericSetting,
  NUMERIC_SETTING_CONSTRAINTS,
  type NumericSettingKey
} from '@shared/settings'
import { ResetSettings } from './ResetSettings'
import { SettingsPage, SettingsRow, SettingsSwitch } from './SettingsControls'

interface NumberSettingProps {
  label: string
  description: string
  value: number
  setting: NumericSettingKey
  onCommit(value: number): void
}

const NumberSetting = ({
  label,
  description,
  value,
  setting,
  onCommit
}: NumberSettingProps): React.JSX.Element => {
  const [draft, setDraft] = useState(String(value))
  const constraint = NUMERIC_SETTING_CONSTRAINTS[setting]

  const commit = (): void => {
    if (draft.trim() === '') {
      setDraft(String(value))
      return
    }
    const nextValue = normalizeNumericSetting(setting, Number(draft))
    setDraft(String(nextValue))
    if (nextValue !== value) onCommit(nextValue)
  }

  return (
    <SettingsRow title={label} description={description} as="label">
      <input
        className="number-input"
        type="number"
        min={constraint.min}
        max={constraint.max}
        step={constraint.step}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
    </SettingsRow>
  )
}

export const AdvancedSettings = (): React.JSX.Element => {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)

  return (
    <SettingsPage title="高级" description="控制搜索、文件读取和大型目录的资源限制。">
      <div className="settings-group">
        <SettingsRow title="跟随符号链接" description="关闭时可降低循环路径和越界风险" as="label">
          <SettingsSwitch
            checked={settings.followSymlinks}
            onCheckedChange={(followSymlinks) => void updateSettings({ followSymlinks })}
          />
        </SettingsRow>
        <NumberSetting
          key={`maxSearchResults-${settings.maxSearchResults}`}
          label="最大搜索结果数"
          description="达到上限后提示缩小范围"
          value={settings.maxSearchResults}
          setting="maxSearchResults"
          onCommit={(maxSearchResults) => void updateSettings({ maxSearchResults })}
        />
        <NumberSetting
          key={`readTimeout-${settings.readTimeout}`}
          label="文件读取超时"
          description="单位：秒"
          value={settings.readTimeout}
          setting="readTimeout"
          onCommit={(readTimeout) => void updateSettings({ readTimeout })}
        />
        <NumberSetting
          key={`paginationThreshold-${settings.paginationThreshold}`}
          label="启用分页阈值"
          description="超出后仅加载当前页"
          value={settings.paginationThreshold}
          setting="paginationThreshold"
          onCommit={(paginationThreshold) => void updateSettings({ paginationThreshold })}
        />
        <ResetSettings />
      </div>
    </SettingsPage>
  )
}
