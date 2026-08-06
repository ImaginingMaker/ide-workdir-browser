import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuItemConstructorOptions } from 'electron'
import { IPC_EVENTS } from '@shared/defaults'
import type { AppCommand } from '@shared/contracts'

const mocks = vi.hoisted(() => ({
  buildFromTemplate: vi.fn((template: unknown) => {
    void template
    return { id: 'application-menu' }
  }),
  setApplicationMenu: vi.fn()
}))

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: mocks.buildFromTemplate,
    setApplicationMenu: mocks.setApplicationMenu
  }
}))

import { MenuService } from './menu-service'

const commandItems = (template: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] =>
  template.flatMap((item) =>
    Array.isArray(item.submenu)
      ? item.submenu.filter((entry) => typeof entry.click === 'function')
      : []
  )

describe('MenuService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('installs every application command with its native macOS accelerator', () => {
    const send = vi.fn()
    const window = {
      isDestroyed: vi.fn(() => false),
      webContents: { send }
    }

    new MenuService().install(() => window as never)

    const template = mocks.buildFromTemplate.mock.calls[0][0] as MenuItemConstructorOptions[]
    const items = commandItems(template)
    expect(items.map(({ accelerator }) => accelerator)).toEqual([
      'Command+,',
      'Command+O',
      'Command+C',
      'Command+X',
      'Command+V',
      'Command+A',
      'Alt+Command+O',
      'Alt+Command+C',
      'Command+Backspace',
      'Command+K',
      'Command+1',
      'Command+2',
      'Command+3',
      'Command+R',
      'Shift+Command+.',
      'Command+I'
    ])

    items.forEach((item) =>
      item.click?.(undefined as never, undefined as never, undefined as never)
    )

    const commands: AppCommand[] = [
      'open-settings',
      'open-selected',
      'copy-selected',
      'cut-selected',
      'paste',
      'select-all',
      'reveal-selected',
      'copy-path',
      'trash-selected',
      'focus-search',
      'view-icon',
      'view-list',
      'view-column',
      'refresh',
      'toggle-hidden',
      'toggle-inspector'
    ]
    expect(send.mock.calls).toEqual(
      commands.map((command) => [IPC_EVENTS.appCommand, command] as const)
    )
    expect(mocks.setApplicationMenu).toHaveBeenCalledWith({ id: 'application-menu' })
  })

  it('does not dispatch commands without a live renderer window', () => {
    const send = vi.fn()
    const destroyedWindow = {
      isDestroyed: vi.fn(() => true),
      webContents: { send }
    }
    let currentWindow: typeof destroyedWindow | null = null

    new MenuService().install(() => currentWindow as never)
    const template = mocks.buildFromTemplate.mock.calls[0][0] as MenuItemConstructorOptions[]
    const firstCommand = commandItems(template)[0]

    firstCommand.click?.(undefined as never, undefined as never, undefined as never)
    currentWindow = destroyedWindow
    firstCommand.click?.(undefined as never, undefined as never, undefined as never)

    expect(send).not.toHaveBeenCalled()
  })
})
