import { notify } from '@renderer/features/notifications/notification-store'
import { formatUserFacingError } from '@renderer/utils/user-facing-error'
import type { TextEditOperation } from '@shared/contracts'

const runFileAction = async (
  action: () => Promise<void>,
  successMessage?: string
): Promise<boolean> => {
  try {
    await action()
    if (successMessage) notify.success(successMessage, { durationMs: 3000 })
    return true
  } catch (error) {
    notify.error(formatUserFacingError(error, 'file-operation'))
    return false
  }
}

export const revealPathInFinder = (agentId: string, path: string): Promise<boolean> =>
  runFileAction(() => window.workdir.revealInFinder(agentId, path))

export const openPathExternally = (agentId: string, path: string): Promise<boolean> =>
  runFileAction(() => window.workdir.openExternal(agentId, path))

export const copyPathToClipboard = (path: string): Promise<boolean> =>
  runFileAction(() => window.workdir.copyText(path), '路径已复制到剪贴板。')

export const performNativeTextEdit = async (operation: TextEditOperation): Promise<boolean> => {
  try {
    await window.workdir.performTextEdit(operation)
    return true
  } catch {
    notify.error('无法完成文本编辑操作，请重试。')
    return false
  }
}
