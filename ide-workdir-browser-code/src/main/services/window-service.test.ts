import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const webContents = {
    setWindowOpenHandler: vi.fn(),
    on: vi.fn()
  }
  const window = {
    webContents,
    once: vi.fn(),
    show: vi.fn(),
    loadFile: vi.fn(),
    loadURL: vi.fn()
  }
  return {
    BrowserWindow: vi.fn(),
    openExternal: vi.fn(),
    webContents,
    window
  }
})

vi.mock('electron', () => ({
  BrowserWindow: mocks.BrowserWindow,
  shell: { openExternal: mocks.openExternal }
}))

vi.mock('@electron-toolkit/utils', () => ({
  is: { dev: false }
}))

import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, WindowService } from './window-service'

describe('WindowService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.BrowserWindow.mockReturnValue(mocks.window)
  })

  it('enforces a minimum size that preserves both panels and the main content', () => {
    new WindowService().create()

    expect(mocks.BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        minWidth: MIN_WINDOW_WIDTH,
        minHeight: MIN_WINDOW_HEIGHT
      })
    )
    expect(MIN_WINDOW_WIDTH).toBe(900)
    expect(MIN_WINDOW_HEIGHT).toBe(540)
    expect(MIN_WINDOW_WIDTH).toBeGreaterThanOrEqual(220 + 256 + 256)
  })

  it('denies new application windows and delegates HTTPS URLs to the system browser', () => {
    new WindowService().create()
    const handler = mocks.webContents.setWindowOpenHandler.mock.calls[0][0]

    expect(handler({ url: 'https://example.com/guide' })).toEqual({ action: 'deny' })
    expect(mocks.openExternal).toHaveBeenCalledWith('https://example.com/guide')

    expect(handler({ url: 'file:///Users/test/guide.md' })).toEqual({ action: 'deny' })
    expect(mocks.openExternal).toHaveBeenCalledTimes(1)
  })

  it('prevents renderer navigation so document links cannot reload application state', () => {
    new WindowService().create()
    const handler = mocks.webContents.on.mock.calls.find(
      ([eventName]) => eventName === 'will-navigate'
    )?.[1]
    const event = { preventDefault: vi.fn() }

    handler(event, 'file:///Users/test/wiki/guide.md')

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(mocks.openExternal).not.toHaveBeenCalled()
  })
})
