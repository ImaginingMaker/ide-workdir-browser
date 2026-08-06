import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppCommand } from '@shared/contracts'
import { agentFixture, folderFixture } from '../../../test/fixtures'
import { useAppStore } from '../store/app-store'
import { createWorkspace } from '../store/workspace'
import { useAppCommands } from './use-app-commands'

describe('useAppCommands', () => {
  const removeCommandListener = vi.fn()
  const moveHistory = vi.fn()
  const setScreen = vi.fn()
  const performTextEdit = vi.fn().mockResolvedValue(undefined)
  let commandListener: ((command: AppCommand) => void) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    commandListener = undefined
    Object.defineProperty(window, 'workdir', {
      configurable: true,
      value: {
        performTextEdit,
        onCommand: vi.fn((listener: (command: AppCommand) => void) => {
          commandListener = listener
          return removeCommandListener
        })
      }
    })
    const root = agentFixture.resolvedWorkdir
    const history = [root, `${root}/projects`, `${root}/projects/app`]
    useAppStore.setState({
      screen: 'browser',
      activeAgentId: agentFixture.id,
      workspaces: {
        [agentFixture.id]: {
          ...createWorkspace(agentFixture),
          currentPath: history[1],
          history,
          historyIndex: 1
        }
      },
      moveHistory,
      setScreen
    })
  })

  it('maps mouse back and forward buttons to workspace history', () => {
    renderHook(() => useAppCommands())

    const backEvent = new MouseEvent('mouseup', { button: 3, cancelable: true })
    window.dispatchEvent(backEvent)
    const forwardEvent = new MouseEvent('mouseup', { button: 4, cancelable: true })
    window.dispatchEvent(forwardEvent)

    expect(backEvent.defaultPrevented).toBe(true)
    expect(forwardEvent.defaultPrevented).toBe(true)
    expect(moveHistory).toHaveBeenNthCalledWith(1, -1)
    expect(moveHistory).toHaveBeenNthCalledWith(2, 1)
  })

  it('does not move beyond history boundaries', () => {
    renderHook(() => useAppCommands())
    const workspace = useAppStore.getState().workspaces[agentFixture.id]

    useAppStore.setState({
      workspaces: {
        [agentFixture.id]: {
          ...workspace,
          currentPath: workspace.history[0],
          historyIndex: 0
        }
      }
    })
    window.dispatchEvent(new MouseEvent('mouseup', { button: 3, cancelable: true }))

    useAppStore.setState({
      workspaces: {
        [agentFixture.id]: {
          ...workspace,
          currentPath: workspace.history.at(-1) ?? workspace.currentPath,
          historyIndex: workspace.history.length - 1
        }
      }
    })
    window.dispatchEvent(new MouseEvent('mouseup', { button: 4, cancelable: true }))

    expect(moveHistory).not.toHaveBeenCalled()
  })

  it('leaves mouse side buttons alone outside the browser workspace', () => {
    renderHook(() => useAppCommands())
    useAppStore.setState({ screen: 'settings' })
    const event = new MouseEvent('mouseup', { button: 3, cancelable: true })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(moveHistory).not.toHaveBeenCalled()
  })

  it('returns from settings with Escape without changing browser workspace state', () => {
    renderHook(() => useAppCommands())
    const workspaceBefore = useAppStore.getState().workspaces[agentFixture.id]
    useAppStore.setState({ screen: 'settings' })
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(setScreen).toHaveBeenCalledWith('browser')
    expect(useAppStore.getState().workspaces[agentFixture.id]).toBe(workspaceBefore)
  })

  it('leaves Escape untouched in the browser workspace', () => {
    renderHook(() => useAppCommands())
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(setScreen).not.toHaveBeenCalled()
  })

  it('does not leave settings when Escape was handled by a modal', () => {
    renderHook(() => useAppCommands())
    useAppStore.setState({ screen: 'settings' })
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    })
    event.preventDefault()

    window.dispatchEvent(event)

    expect(setScreen).not.toHaveBeenCalled()
  })

  it.each([
    ['copy-selected', 'copy'],
    ['cut-selected', 'cut'],
    ['paste', 'paste'],
    ['select-all', 'select-all']
  ] as const)('routes native %s commands to the focused text input', (command, operation) => {
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    const dispatch = vi.spyOn(window, 'dispatchEvent')
    renderHook(() => useAppCommands())

    commandListener?.(command)

    expect(performTextEdit).toHaveBeenCalledWith(operation)
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workdir:paste-request' })
    )
  })

  it('keeps native paste as a file command outside text inputs', () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent')
    renderHook(() => useAppCommands())

    commandListener?.('paste')

    expect(performTextEdit).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workdir:paste-request' })
    )
  })

  it('dispatches the trash request shortcut for the selected browser item', () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent')
    useAppStore.setState({ selectedItem: folderFixture })
    renderHook(() => useAppCommands())
    const event = new KeyboardEvent('keydown', {
      key: 'Backspace',
      metaKey: true,
      bubbles: true,
      cancelable: true
    })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workdir:trash-selected-request' })
    )
  })

  it('does not turn Command-Backspace into a file command while editing text', () => {
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    const dispatch = vi.spyOn(window, 'dispatchEvent')
    useAppStore.setState({ selectedItem: folderFixture })
    renderHook(() => useAppCommands())

    commandListener?.('trash-selected')

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workdir:trash-selected-request' })
    )
  })
})
