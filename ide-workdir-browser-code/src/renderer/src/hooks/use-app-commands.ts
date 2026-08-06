import { useEffect } from 'react'
import { performNativeTextEdit } from '@renderer/services/native-actions'
import type { AppCommand, TextEditOperation } from '@shared/contracts'
import { resolveShortcut } from '@shared/shortcuts'
import { useAppStore } from '../store/app-store'

const historyDirectionForButton = (button: number): -1 | 1 | null => {
  if (button === 3) return -1
  if (button === 4) return 1
  return null
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const textEditOperationForCommand = (command: AppCommand): TextEditOperation | null => {
  if (command === 'copy-selected') return 'copy'
  if (command === 'cut-selected') return 'cut'
  if (command === 'paste') return 'paste'
  if (command === 'select-all') return 'select-all'
  return null
}

const shouldLetEditableHandleCommand = (command: AppCommand): boolean =>
  Boolean(textEditOperationForCommand(command)) || command === 'trash-selected'

export const useAppCommands = (): void => {
  const executeCommand = useAppStore((state) => state.executeCommand)

  useEffect(() => {
    const removeCommandListener = window.workdir.onCommand((command) => {
      const textEditOperation = textEditOperationForCommand(command)
      if (textEditOperation && isEditableTarget(document.activeElement)) {
        void performNativeTextEdit(textEditOperation)
        return
      }
      if (command === 'trash-selected' && isEditableTarget(document.activeElement)) return
      void executeCommand(command)
    })
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        const state = useAppStore.getState()
        if (!event.defaultPrevented && state.screen === 'settings') {
          event.preventDefault()
          state.setScreen('browser')
        }
        return
      }
      const command = resolveShortcut({
        key: event.key,
        meta: event.metaKey,
        alt: event.altKey,
        shift: event.shiftKey
      })
      if (!command) return
      if (shouldLetEditableHandleCommand(command) && isEditableTarget(event.target)) return
      event.preventDefault()
      void executeCommand(command)
    }
    const preventMouseHistoryDefault = (event: MouseEvent): boolean => {
      if (
        useAppStore.getState().screen !== 'browser' ||
        historyDirectionForButton(event.button) === null
      ) {
        return false
      }
      event.preventDefault()
      return true
    }
    const onMouseUp = (event: MouseEvent): void => {
      const direction = historyDirectionForButton(event.button)
      if (direction === null || !preventMouseHistoryDefault(event)) return

      const state = useAppStore.getState()
      const workspace = state.workspaces[state.activeAgentId]
      if (!workspace) return
      const canMove =
        direction === -1
          ? workspace.historyIndex > 0
          : workspace.historyIndex < workspace.history.length - 1
      if (canMove) void state.moveHistory(direction)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', preventMouseHistoryDefault)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('auxclick', preventMouseHistoryDefault)
    return () => {
      removeCommandListener()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', preventMouseHistoryDefault)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('auxclick', preventMouseHistoryDefault)
    }
  }, [executeCommand])
}
