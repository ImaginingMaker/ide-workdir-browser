import type { FolderIconTheme } from './contracts'

export type NumericSettingKey = 'zoom' | 'maxSearchResults' | 'readTimeout' | 'paginationThreshold'

export const FOLDER_ICON_THEMES: readonly FolderIconTheme[] = ['outline', 'solid', 'duotone']

export const normalizeFolderIconTheme = (value: unknown): FolderIconTheme =>
  FOLDER_ICON_THEMES.includes(value as FolderIconTheme) ? (value as FolderIconTheme) : 'outline'

interface NumericSettingConstraint {
  min: number
  max: number
  step: number
  defaultValue: number
}

export const NUMERIC_SETTING_CONSTRAINTS = {
  zoom: { min: 75, max: 150, step: 25, defaultValue: 100 },
  maxSearchResults: { min: 100, max: 10000, step: 1, defaultValue: 2000 },
  readTimeout: { min: 1, max: 60, step: 1, defaultValue: 10 },
  paginationThreshold: { min: 100, max: 100000, step: 1, defaultValue: 5000 }
} as const satisfies Record<NumericSettingKey, NumericSettingConstraint>

export const normalizeNumericSetting = (setting: NumericSettingKey, value: number): number => {
  const constraint = NUMERIC_SETTING_CONSTRAINTS[setting]
  const finiteValue = Number.isFinite(value) ? value : constraint.defaultValue
  return Math.min(constraint.max, Math.max(constraint.min, Math.round(finiteValue)))
}

export const numericSettingOptions = (setting: NumericSettingKey): number[] => {
  const constraint = NUMERIC_SETTING_CONSTRAINTS[setting]
  const options: number[] = []
  for (let value = constraint.min; value <= constraint.max; value += constraint.step) {
    options.push(value)
  }
  return options
}
