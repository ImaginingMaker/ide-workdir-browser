import { describe, expect, it } from 'vitest'
import { resolveAppIconPath } from './app-icon-service'

describe('resolveAppIconPath', () => {
  it('resolves the unpacked icon in a packaged app', () => {
    expect(resolveAppIconPath(true, '/App/Contents/Resources', '/repo/out/main')).toBe(
      '/App/Contents/Resources/app.asar.unpacked/resources/icon.png'
    )
  })

  it('resolves the project resource while developing', () => {
    expect(resolveAppIconPath(false, '/Electron/Contents/Resources', '/repo/out/main')).toBe(
      '/repo/resources/icon.png'
    )
  })
})
