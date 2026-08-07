import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc/register-handlers'
import { FileSystemService } from './services/file-system-service'
import { SettingsService } from './services/settings-service'
import { WindowService } from './services/window-service'
import { MenuService } from './services/menu-service'
import { resolveAppIconPath } from './services/app-icon-service'
import { readUpdateRepository, UpdateService } from './services/update-service'

if (process.platform !== 'darwin') {
  app.whenReady().then(() => app.quit())
} else {
  const settings = new SettingsService()
  const files = new FileSystemService(settings)
  const windows = new WindowService()
  const menu = new MenuService()
  const updates = new UpdateService(app.getVersion(), readUpdateRepository(app.getAppPath()))

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.ideworkdir.browser')
    app.dock?.setIcon(resolveAppIconPath(app.isPackaged, process.resourcesPath, __dirname))
    app.setAboutPanelOptions({
      applicationName: 'IDE Workdir Browser',
      applicationVersion: app.getVersion(),
      copyright: 'Copyright 2026'
    })
    app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

    registerIpcHandlers({ settings, files, updates })
    windows.create()
    menu.install(() => windows.getCurrent())

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) windows.create()
    })
  })

  app.on('window-all-closed', () => {
    // macOS applications remain active after the last window closes.
  })
}
