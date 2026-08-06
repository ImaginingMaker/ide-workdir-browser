import type { ReactNode } from 'react'
import { useAppStore, type SettingsSaveStatus } from '@renderer/store/app-store'

const SAVE_STATUS_LABELS: Record<SettingsSaveStatus, string> = {
  saving: '正在保存…',
  saved: '已保存',
  error: '保存失败'
}

interface SettingsPageProps {
  title: string
  description: string
  showSaveStatus?: boolean
  children: ReactNode
}

export const SettingsPage = ({
  title,
  description,
  showSaveStatus = true,
  children
}: SettingsPageProps): React.JSX.Element => {
  const saveStatus = useAppStore((state) => state.settingsSaveStatus)

  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {showSaveStatus && (
          <span
            className={`save-status save-status--${saveStatus}`}
            role="status"
            aria-live="polite"
          >
            {SAVE_STATUS_LABELS[saveStatus]}
          </span>
        )}
      </header>
      {children}
    </section>
  )
}

interface SettingsRowProps {
  title: string
  description: string
  as?: 'div' | 'label'
  children: ReactNode
}

export const SettingsRow = ({
  title,
  description,
  as = 'div',
  children
}: SettingsRowProps): React.JSX.Element => {
  const content = (
    <>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {children}
    </>
  )

  return as === 'label' ? (
    <label className="settings-row">{content}</label>
  ) : (
    <div className="settings-row">{content}</div>
  )
}

interface SettingsSwitchProps {
  checked: boolean
  ariaLabel?: string
  disabled?: boolean
  onCheckedChange(checked: boolean): void
}

export const SettingsSwitch = ({
  checked,
  ariaLabel,
  disabled,
  onCheckedChange
}: SettingsSwitchProps): React.JSX.Element => (
  <span className="switch">
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
    <span />
  </span>
)

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: ReadonlyArray<SegmentedOption<T>>
  onChange(value: T): void
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange
}: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <div className="text-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? 'is-active' : ''}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
