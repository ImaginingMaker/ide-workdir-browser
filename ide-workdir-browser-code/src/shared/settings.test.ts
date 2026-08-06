import { describe, expect, it } from 'vitest'
import {
  normalizeFolderIconTheme,
  normalizeNumericSetting,
  NUMERIC_SETTING_CONSTRAINTS,
  numericSettingOptions
} from './settings'

describe('settings constraints', () => {
  it('normalizes persisted folder icon themes', () => {
    expect(normalizeFolderIconTheme('duotone')).toBe('duotone')
    expect(normalizeFolderIconTheme('legacy-folder')).toBe('outline')
    expect(normalizeFolderIconTheme(undefined)).toBe('outline')
  })

  it('clamps, rounds, and restores invalid numeric values', () => {
    expect(normalizeNumericSetting('zoom', 124.6)).toBe(125)
    expect(normalizeNumericSetting('readTimeout', 0)).toBe(1)
    expect(normalizeNumericSetting('maxSearchResults', Number.NaN)).toBe(
      NUMERIC_SETTING_CONSTRAINTS.maxSearchResults.defaultValue
    )
  })

  it('generates selectable zoom values from the shared constraint', () => {
    expect(numericSettingOptions('zoom')).toEqual([75, 100, 125, 150])
  })
})
