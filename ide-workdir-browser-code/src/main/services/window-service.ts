import { BrowserWindow, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'node:path'

export const MIN_WINDOW_WIDTH = 900
export const MIN_WINDOW_HEIGHT = 540

const openHttpsUrl = (url: string): void => {
  try {
    if (new URL(url).protocol === 'https:') void shell.openExternal(url)
  } catch {
    // Invalid and non-HTTPS navigation is intentionally ignored.
  }
}

export class WindowService {
  private window: BrowserWindow | null = null

  create(): BrowserWindow {
    const window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: MIN_WINDOW_WIDTH,
      minHeight: MIN_WINDOW_HEIGHT,
      show: false,
      backgroundColor: '#E9EBEF',
      title: 'IDE 工作目录浏览器',
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 16 },
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    this.window = window
    window.once('closed', () => {
      if (this.window === window) this.window = null
    })

    window.once('ready-to-show', () => window.show())
    window.webContents.setWindowOpenHandler(({ url }) => {
      openHttpsUrl(url)
      return { action: 'deny' }
    })
    window.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      openHttpsUrl(url)
    })

    if (is.dev && process.env.ELECTRON_RENDERER_URL) {
      void window.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      void window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return window
  }

  getCurrent(): BrowserWindow | null {
    return this.window
  }
}
