import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { APP_VERSION } from '@shared/app-version'
import { SHORTCUTS } from '@shared/shortcuts'
import { AboutSettings } from './AboutSettings'

describe('AboutSettings', () => {
  it('renders the app version and every shortcut from the shared registries', () => {
    render(<AboutSettings />)

    expect(screen.getByText(`版本 ${APP_VERSION} · macOS 13+`)).toBeInTheDocument()

    SHORTCUTS.forEach((shortcut) => {
      expect(screen.getByText(shortcut.label)).toBeInTheDocument()
      expect(screen.getByText(shortcut.keys)).toBeInTheDocument()
    })
  })
})
