import type { AppSettings } from '@shared/contracts'

const accentColors: Record<AppSettings['accentColor'], { light: string; dark: string }> = {
  blue: { light: '#007aff', dark: '#0a84ff' },
  green: { light: '#248a3d', dark: '#30d158' },
  orange: { light: '#c95d00', dark: '#ff9f0a' },
  purple: { light: '#8944ab', dark: '#bf5af2' },
  red: { light: '#d70015', dark: '#ff453a' }
}

const fontScales: Record<AppSettings['fontSize'], number> = {
  small: 0.92,
  medium: 1,
  large: 1.08,
  xlarge: 1.16
}

export const applyPreferences = (
  settings: AppSettings,
  root: HTMLElement = document.documentElement
): void => {
  root.dataset.theme = settings.theme
  root.style.setProperty('--ui-zoom', String((settings.zoom / 100) * fontScales[settings.fontSize]))
  const dark =
    settings.theme === 'dark' ||
    (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.style.setProperty('--primary', accentColors[settings.accentColor][dark ? 'dark' : 'light'])
}
