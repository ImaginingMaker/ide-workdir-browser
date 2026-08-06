import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import type { AppCommand } from '@shared/contracts'
import { IPC_EVENTS } from '@shared/defaults'

const sendCommand = (window: BrowserWindow, command: AppCommand): void => {
  if (!window.isDestroyed()) window.webContents.send(IPC_EVENTS.appCommand, command)
}

export class MenuService {
  install(getWindow: () => BrowserWindow | null): void {
    const command =
      (value: AppCommand): (() => void) =>
      () => {
        const window = getWindow()
        if (window) sendCommand(window, value)
      }

    const template: MenuItemConstructorOptions[] = [
      {
        label: 'IDE Workdir Browser',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { label: '设置…', accelerator: 'Command+,', click: command('open-settings') },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: '文件',
        submenu: [
          { label: '打开', accelerator: 'Command+O', click: command('open-selected') },
          { type: 'separator' },
          { label: '复制', accelerator: 'Command+C', click: command('copy-selected') },
          { label: '剪切', accelerator: 'Command+X', click: command('cut-selected') },
          { label: '粘贴', accelerator: 'Command+V', click: command('paste') },
          { label: '全选', accelerator: 'Command+A', click: command('select-all') },
          { type: 'separator' },
          {
            label: '在 Finder 中显示',
            accelerator: 'Alt+Command+O',
            click: command('reveal-selected')
          },
          {
            label: '复制路径',
            accelerator: 'Alt+Command+C',
            click: command('copy-path')
          },
          { type: 'separator' },
          {
            label: '移到废纸篓',
            accelerator: 'Command+Backspace',
            click: command('trash-selected')
          }
        ]
      },
      {
        label: '显示',
        submenu: [
          { label: '搜索', accelerator: 'Command+K', click: command('focus-search') },
          { type: 'separator' },
          { label: '图标视图', accelerator: 'Command+1', click: command('view-icon') },
          { label: '列表视图', accelerator: 'Command+2', click: command('view-list') },
          { label: '分栏视图', accelerator: 'Command+3', click: command('view-column') },
          { type: 'separator' },
          { label: '刷新', accelerator: 'Command+R', click: command('refresh') },
          {
            label: '显示或隐藏隐藏文件',
            accelerator: 'Shift+Command+.',
            click: command('toggle-hidden')
          },
          {
            label: '显示或隐藏检查器',
            accelerator: 'Command+I',
            click: command('toggle-inspector')
          },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: '窗口',
        submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
      }
    ]

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }
}
