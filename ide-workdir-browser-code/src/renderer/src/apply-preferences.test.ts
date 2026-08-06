import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { applyPreferences } from './apply-preferences'

describe('applyPreferences', () => {
  it('applies theme, accent and combined scale', () => {
    const root = document.createElement('div')
    applyPreferences(
      {
        ...DEFAULT_SETTINGS,
        theme: 'dark',
        accentColor: 'purple',
        zoom: 125,
        fontSize: 'large'
      },
      root
    )

    expect(root.dataset.theme).toBe('dark')
    expect(root.style.getPropertyValue('--primary')).toBe('#bf5af2')
    expect(root.style.getPropertyValue('--ui-zoom')).toBe('1.35')
  })
})
