import { clipboard, dialog, ipcMain, shell } from 'electron'
import type {
  DropCopyRequest,
  SearchRequest,
  SettingsPatch,
  TextEditOperation
} from '@shared/contracts'
import { IPC_CHANNELS } from '@shared/defaults'
import type { FileSystemService } from '../services/file-system-service'
import type { SettingsService } from '../services/settings-service'

export const FILE_ACCESS_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders'

export interface HandlerDependencies {
  settings: SettingsService
  files: FileSystemService
}

export const registerIpcHandlers = ({ settings, files }: HandlerDependencies): void => {
  ipcMain.handle(IPC_CHANNELS.fileAccessOpenSettings, () =>
    shell.openExternal(FILE_ACCESS_SETTINGS_URL)
  )
  ipcMain.handle(IPC_CHANNELS.settingsGet, () => settings.get())
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_, patch: SettingsPatch) => settings.update(patch))
  ipcMain.handle(IPC_CHANNELS.settingsReset, () => settings.reset())
  ipcMain.handle(IPC_CHANNELS.agentsGet, () => files.getAgents())
  ipcMain.handle(IPC_CHANNELS.directoryChoose, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 IDE 工作目录',
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle(IPC_CHANNELS.directoryRead, (_, agentId: string, path: string) =>
    files.readDirectory(agentId, path)
  )
  ipcMain.handle(IPC_CHANNELS.search, (_, request: SearchRequest) => files.search(request))
  ipcMain.handle(IPC_CHANNELS.thumbnail, (_, agentId: string, path: string) =>
    files.thumbnail(agentId, path)
  )
  ipcMain.handle(IPC_CHANNELS.fileItemGet, (_, agentId: string, path: string) =>
    files.getFileItem(agentId, path)
  )
  ipcMain.handle(IPC_CHANNELS.preview, (_, agentId: string, path: string) =>
    files.preview(agentId, path)
  )
  ipcMain.handle(IPC_CHANNELS.dropCopyPreflight, (_, request: DropCopyRequest) =>
    files.preflightDropCopy(request)
  )
  ipcMain.handle(IPC_CHANNELS.dropCopyExecute, (_, request: DropCopyRequest) =>
    files.copyDroppedItems(request)
  )
  ipcMain.handle(IPC_CHANNELS.fileOperationUndo, (_, agentId: string, operationId: string) =>
    files.undoFileOperation(agentId, operationId)
  )
  ipcMain.handle(IPC_CHANNELS.trashItem, (_, agentId: string, path: string) =>
    files.trashItem(agentId, path)
  )
  ipcMain.handle(IPC_CHANNELS.revealInFinder, async (_, agentId: string, path: string) => {
    shell.showItemInFolder(await files.resolveSafePath(agentId, path))
  })
  ipcMain.handle(IPC_CHANNELS.openExternal, async (_, agentId: string, path: string) => {
    const error = await shell.openPath(await files.resolveSafePath(agentId, path))
    if (error) throw new Error(error)
  })
  ipcMain.handle(IPC_CHANNELS.copyText, (_, text: string) => clipboard.writeText(text))
  ipcMain.handle(IPC_CHANNELS.textEdit, (event, operation: TextEditOperation) => {
    switch (operation) {
      case 'copy':
        event.sender.copy()
        return
      case 'cut':
        event.sender.cut()
        return
      case 'paste':
        event.sender.paste()
        return
      case 'select-all':
        event.sender.selectAll()
        return
      default:
        throw new Error('不支持的文本编辑操作')
    }
  })
}
