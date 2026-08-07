import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  whenReady: vi.fn(() => Promise.resolve()),
  quit: vi.fn(),
  appOn: vi.fn(),
  setAppUserModelId: vi.fn(),
  setDockIcon: vi.fn(),
  setAboutPanelOptions: vi.fn(),
  getVersion: vi.fn(() => '0.1.0-test'),
  getAppPath: vi.fn(() => '/application'),
  getAllWindows: vi.fn((): unknown[] => []),
  watchWindowShortcuts: vi.fn(),
  registerIpcHandlers: vi.fn(),
  createSettings: vi.fn(),
  createFiles: vi.fn(),
  windowCreate: vi.fn(),
  windowGetCurrent: vi.fn(() => ({ id: 'current-window' })),
  menuInstall: vi.fn(),
  resolveAppIconPath: vi.fn(() => '/resolved/icon.png'),
  readUpdateRepository: vi.fn(() => 'example/project'),
  createUpdates: vi.fn(),
  settings: { id: 'settings-service' },
  files: { id: 'file-system-service' },
  updates: { id: 'update-service' }
}))

vi.mock('electron', () => ({
  app: {
    whenReady: mocks.whenReady,
    quit: mocks.quit,
    on: mocks.appOn,
    dock: { setIcon: mocks.setDockIcon },
    setAboutPanelOptions: mocks.setAboutPanelOptions,
    getVersion: mocks.getVersion,
    getAppPath: mocks.getAppPath,
    isPackaged: false
  },
  BrowserWindow: { getAllWindows: mocks.getAllWindows }
}))

vi.mock('@electron-toolkit/utils', () => ({
  electronApp: { setAppUserModelId: mocks.setAppUserModelId },
  optimizer: { watchWindowShortcuts: mocks.watchWindowShortcuts }
}))

vi.mock('./ipc/register-handlers', () => ({
  registerIpcHandlers: mocks.registerIpcHandlers
}))

vi.mock('./services/settings-service', () => ({
  SettingsService: vi.fn(function SettingsService() {
    mocks.createSettings()
    return mocks.settings
  })
}))

vi.mock('./services/file-system-service', () => ({
  FileSystemService: vi.fn(function FileSystemService(settings: unknown) {
    mocks.createFiles(settings)
    return mocks.files
  })
}))

vi.mock('./services/window-service', () => ({
  WindowService: vi.fn(function WindowService() {
    return {
      create: mocks.windowCreate,
      getCurrent: mocks.windowGetCurrent
    }
  })
}))

vi.mock('./services/menu-service', () => ({
  MenuService: vi.fn(function MenuService() {
    return { install: mocks.menuInstall }
  })
}))

vi.mock('./services/app-icon-service', () => ({
  resolveAppIconPath: mocks.resolveAppIconPath
}))

vi.mock('./services/update-service', () => ({
  readUpdateRepository: mocks.readUpdateRepository,
  UpdateService: vi.fn(function UpdateService(version: string, repository: string) {
    mocks.createUpdates(version, repository)
    return mocks.updates
  })
}))

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')

const importMain = async (platform: string): Promise<void> => {
  Object.defineProperty(process, 'platform', { configurable: true, value: platform })
  await import('./index')
  await vi.waitFor(() => expect(mocks.whenReady).toHaveBeenCalledOnce())
}

describe('main process bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.whenReady.mockResolvedValue(undefined)
    mocks.getAllWindows.mockReturnValue([])
  })

  afterAll(() => {
    if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform)
  })

  it('quits after readiness on unsupported platforms without creating services', async () => {
    await importMain('linux')
    await vi.waitFor(() => expect(mocks.quit).toHaveBeenCalledOnce())

    expect(mocks.createSettings).not.toHaveBeenCalled()
    expect(mocks.createUpdates).not.toHaveBeenCalled()
    expect(mocks.registerIpcHandlers).not.toHaveBeenCalled()
    expect(mocks.windowCreate).not.toHaveBeenCalled()
  })

  it('initializes the secured macOS application lifecycle and reopens its window', async () => {
    await importMain('darwin')
    await vi.waitFor(() => expect(mocks.registerIpcHandlers).toHaveBeenCalledOnce())

    expect(mocks.createFiles).toHaveBeenCalledWith(mocks.settings)
    expect(mocks.readUpdateRepository).toHaveBeenCalledWith('/application')
    expect(mocks.createUpdates).toHaveBeenCalledWith('0.1.0-test', 'example/project')
    expect(mocks.registerIpcHandlers).toHaveBeenCalledWith({
      settings: mocks.settings,
      files: mocks.files,
      updates: mocks.updates
    })
    expect(mocks.setAppUserModelId).toHaveBeenCalledWith('com.ideworkdir.browser')
    expect(mocks.resolveAppIconPath).toHaveBeenCalledOnce()
    expect(mocks.setDockIcon).toHaveBeenCalledWith('/resolved/icon.png')
    expect(mocks.setAboutPanelOptions).toHaveBeenCalledWith({
      applicationName: 'IDE Workdir Browser',
      applicationVersion: '0.1.0-test',
      copyright: 'Copyright 2026'
    })
    expect(mocks.windowCreate).toHaveBeenCalledOnce()

    const getWindow = mocks.menuInstall.mock.calls[0][0]
    expect(getWindow()).toEqual({ id: 'current-window' })

    const browserWindowCreated = mocks.appOn.mock.calls.find(
      ([eventName]) => eventName === 'browser-window-created'
    )?.[1]
    const rendererWindow = { id: 'renderer-window' }
    browserWindowCreated({}, rendererWindow)
    expect(mocks.watchWindowShortcuts).toHaveBeenCalledWith(rendererWindow)

    const activate = mocks.appOn.mock.calls.find(([eventName]) => eventName === 'activate')?.[1]
    activate()
    expect(mocks.windowCreate).toHaveBeenCalledTimes(2)

    mocks.getAllWindows.mockReturnValueOnce([rendererWindow])
    activate()
    expect(mocks.windowCreate).toHaveBeenCalledTimes(2)
    expect(mocks.appOn.mock.calls.map(([eventName]) => eventName)).toContain('window-all-closed')
  })
})
