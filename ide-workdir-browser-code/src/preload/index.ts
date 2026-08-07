import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  AppCommand,
  DropCopyRequest,
  SearchRequest,
  SettingsPatch,
  TextEditOperation,
  WorkdirApi
} from '@shared/contracts'
import { IPC_CHANNELS, IPC_EVENTS } from '@shared/defaults'

const getDroppedFilePath = (file: unknown): string | null => {
  try {
    const filePath = webUtils.getPathForFile(file as Parameters<typeof webUtils.getPathForFile>[0])
    return filePath || null
  } catch {
    return null
  }
}

const api: WorkdirApi = {
  openFileAccessSettings: () => ipcRenderer.invoke(IPC_CHANNELS.fileAccessOpenSettings),
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.updateCheck),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
  updateSettings: (patch: SettingsPatch) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, patch),
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.settingsReset),
  getAgents: () => ipcRenderer.invoke(IPC_CHANNELS.agentsGet),
  chooseDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.directoryChoose),
  getDroppedFilePath,
  readDirectory: (agentId: string, path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.directoryRead, agentId, path),
  search: (request: SearchRequest) => ipcRenderer.invoke(IPC_CHANNELS.search, request),
  thumbnail: (agentId: string, path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.thumbnail, agentId, path),
  getFileItem: (agentId: string, path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileItemGet, agentId, path),
  preview: (agentId: string, path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.preview, agentId, path),
  preflightDropCopy: (request: DropCopyRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.dropCopyPreflight, request),
  copyDroppedItems: (request: DropCopyRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.dropCopyExecute, request),
  undoFileOperation: (agentId: string, operationId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.fileOperationUndo, agentId, operationId),
  trashItem: (agentId: string, path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.trashItem, agentId, path),
  revealInFinder: (agentId: string, path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.revealInFinder, agentId, path),
  openExternal: (agentId: string, path: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.openExternal, agentId, path),
  copyText: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.copyText, text),
  performTextEdit: (operation: TextEditOperation) =>
    ipcRenderer.invoke(IPC_CHANNELS.textEdit, operation),
  onCommand: (listener: (command: AppCommand) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: AppCommand): void =>
      listener(command)
    ipcRenderer.on(IPC_EVENTS.appCommand, handler)
    return () => ipcRenderer.removeListener(IPC_EVENTS.appCommand, handler)
  }
}

contextBridge.exposeInMainWorld('workdir', api)
