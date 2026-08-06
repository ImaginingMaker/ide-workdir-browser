import { Profiler } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkdirApi } from '@shared/contracts'
import { agentFixture, fileFixture, folderFixture } from '../../../../test/fixtures'
import { useAppStore } from '../../store/app-store'
import { createWorkspace } from '../../store/workspace'
import { NotificationHost } from '../notifications/NotificationHost'
import { notify, useNotificationStore } from '../notifications/notification-store'
import { FileBrowser } from './FileBrowser'

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
} {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

describe('FileBrowser', () => {
  const workdir = {
    openFileAccessSettings: vi.fn(),
    getDroppedFilePath: vi.fn().mockReturnValue('/tmp/incoming.txt'),
    preflightDropCopy: vi.fn().mockResolvedValue({
      targetDirectory: folderFixture.path,
      sourceCount: 1,
      itemCount: 1,
      totalBytes: 12,
      conflicts: [],
      errors: []
    }),
    copyDroppedItems: vi.fn().mockResolvedValue({
      operationId: 'operation-1',
      copied: 1,
      moved: 0,
      skipped: 0,
      replaced: 0,
      renamed: 0,
      errors: []
    }),
    undoFileOperation: vi.fn().mockResolvedValue({
      operationId: 'operation-1',
      restored: 1,
      errors: []
    }),
    trashItem: vi.fn().mockResolvedValue(undefined),
    thumbnail: vi.fn(),
    preview: vi.fn().mockResolvedValue({ kind: 'markdown', content: '# Project' }),
    readDirectory: vi.fn().mockResolvedValue({
      path: agentFixture.resolvedWorkdir,
      parentPath: null,
      items: [folderFixture],
      truncated: false
    })
  } as unknown as WorkdirApi

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'workdir', { configurable: true, value: workdir })
    useAppStore.setState({
      loading: false,
      activeAgentId: agentFixture.id,
      agents: [agentFixture],
      workspaces: { [agentFixture.id]: createWorkspace(agentFixture) },
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [],
        truncated: false
      },
      fileClipboard: null,
      selectedItem: null,
      preview: null,
      search: null,
      directoryError: null,
      refresh: useAppStore.getInitialState().refresh
    })
    notify.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders an actionable empty directory state', () => {
    render(<FileBrowser />)
    expect(screen.getByRole('main')).toHaveClass('motion-presence-enter')
    expect(screen.getByRole('heading', { name: '此文件夹为空' })).toBeInTheDocument()
    expect(
      screen.getByText('当前目录中没有可显示的项目，可从 Finder 拖入文件或文件夹。')
    ).toBeInTheDocument()
  })

  it('shows actionable guidance instead of a raw missing-directory error', () => {
    useAppStore.setState({
      listing: null,
      directoryError:
        '找不到该工作目录，它可能已被移动或删除。请在“设置 > Agent”中重新选择有效文件夹。'
    })

    render(<FileBrowser />)

    expect(screen.getByRole('heading', { name: '工作目录不可用' })).toBeInTheDocument()
    expect(screen.getByText(/请在“设置 > Agent”中重新选择有效文件夹/)).toBeInTheDocument()
    expect(screen.queryByText(/ENOENT/)).not.toBeInTheDocument()
  })

  it('offers scoped recovery actions after folder access is denied', async () => {
    const refresh = vi.fn()
    useAppStore.setState({
      agents: [{ ...agentFixture, status: 'permission-required' }],
      listing: null,
      directoryError:
        '当前没有权限访问该工作目录。你可以重新尝试、选择其他目录，或在 macOS“隐私与安全性 > 文件与文件夹”中允许访问。',
      refresh
    })

    render(<FileBrowser />)

    expect(screen.getByRole('heading', { name: '需要文件夹访问权限' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重新尝试' }))
    await userEvent.click(screen.getByRole('button', { name: '打开文件与文件夹设置' }))
    await userEvent.click(screen.getByRole('button', { name: '更改工作目录' }))

    expect(refresh).toHaveBeenCalledOnce()
    expect(workdir.openFileAccessSettings).toHaveBeenCalledOnce()
    expect(useAppStore.getState()).toMatchObject({
      screen: 'settings',
      settingsSection: 'agents'
    })
  })

  it('does not rerender when only the inspector visibility changes', () => {
    const onRender = vi.fn()
    render(
      <Profiler id="file-browser" onRender={onRender}>
        <FileBrowser />
      </Profiler>
    )
    expect(onRender).toHaveBeenCalledTimes(1)

    act(() => useAppStore.getState().toggleInspector())

    expect(onRender).toHaveBeenCalledTimes(1)
  })

  it('selects single-clicked files immediately while delaying the inspector preview', async () => {
    vi.useFakeTimers()
    const previewRequest = createDeferred<Awaited<ReturnType<WorkdirApi['preview']>>>()
    vi.mocked(workdir.preview).mockReturnValueOnce(previewRequest.promise)
    useAppStore.setState({
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [fileFixture],
        truncated: false
      }
    })
    render(<FileBrowser />)

    const file = screen.getByRole('gridcell', { name: fileFixture.name })
    fireEvent.click(file)

    expect(useAppStore.getState().selectedItem).toEqual(fileFixture)
    expect(file).toHaveClass('is-selected')
    expect(workdir.preview).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(119)
      await Promise.resolve()
    })

    expect(workdir.preview).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(workdir.preview).toHaveBeenCalledOnce()
    previewRequest.resolve({ kind: 'markdown', content: '# Project' })
    await act(async () => {
      await Promise.resolve()
    })
    expect(useAppStore.getState().preview).toEqual({ kind: 'markdown', content: '# Project' })
  })

  it('cancels pending single-click previews when opening a file with a double click', async () => {
    vi.useFakeTimers()
    useAppStore.setState({
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [fileFixture],
        truncated: false
      }
    })
    render(<FileBrowser />)
    const file = screen.getByRole('gridcell', { name: fileFixture.name })

    fireEvent.click(file)
    expect(useAppStore.getState().selectedItem).toEqual(fileFixture)
    expect(workdir.preview).not.toHaveBeenCalled()
    fireEvent.click(file)
    fireEvent.doubleClick(file)
    await act(async () => {
      vi.runAllTimers()
      await Promise.resolve()
    })

    expect(workdir.preview).toHaveBeenCalledOnce()
    expect(useAppStore.getState().workspaces.codex.openTabs).toHaveLength(1)
  })

  it('preflights Finder drops before copying into a folder target', async () => {
    useAppStore.setState({
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [folderFixture],
        truncated: false
      }
    })
    const { container } = render(
      <>
        <FileBrowser />
        <NotificationHost />
      </>
    )
    const browser = screen.getByRole('main')
    const folder = screen.getByRole('gridcell', { name: 'projects' })
    const dataTransfer = {
      types: ['Files'],
      items: { length: 1 },
      files: [new File(['incoming'], 'incoming.txt')],
      dropEffect: 'copy'
    }

    fireEvent.dragEnter(browser, { dataTransfer })
    fireEvent.dragEnter(folder, { dataTransfer })
    expect(container.querySelector('.drop-overlay')).toHaveClass('motion-backdrop-enter')
    fireEvent.drop(browser, { dataTransfer })

    const dialog = await screen.findByRole('dialog', { name: '确认复制' })
    expect(dialog).toHaveClass('motion-backdrop-enter')
    expect(dialog.querySelector('.file-operation-card')).toHaveClass('motion-dialog-enter')
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()
    expect(workdir.preflightDropCopy).toHaveBeenCalledWith({
      agentId: agentFixture.id,
      targetDirectory: folderFixture.path,
      sourcePaths: ['/tmp/incoming.txt'],
      conflictStrategy: 'keep-both'
    })

    fireEvent.click(screen.getByRole('button', { name: '复制' }))

    expect(await screen.findByText('已复制 1 项')).toBeInTheDocument()
    expect(workdir.copyDroppedItems).toHaveBeenCalledWith({
      agentId: agentFixture.id,
      sourceAgentId: undefined,
      operation: 'copy',
      targetDirectory: folderFixture.path,
      sourcePaths: ['/tmp/incoming.txt'],
      conflictStrategy: 'keep-both'
    })
    expect(useNotificationStore.getState().notifications[0]).toMatchObject({
      variant: 'success',
      action: { label: '撤销' }
    })
  })

  it('uses the active nested column as the Finder drop target', async () => {
    useAppStore.setState((state) => ({
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [folderFixture],
        truncated: false
      },
      workspaces: {
        ...state.workspaces,
        [agentFixture.id]: {
          ...state.workspaces[agentFixture.id],
          viewMode: 'column'
        }
      }
    }))
    vi.mocked(workdir.readDirectory).mockResolvedValueOnce({
      path: folderFixture.path,
      parentPath: agentFixture.resolvedWorkdir,
      items: [],
      truncated: false
    })
    render(<FileBrowser />)
    await userEvent.click(screen.getByRole('option', { name: /projects/ }))
    await screen.findByRole('listbox', { name: 'projects' })
    const dataTransfer = {
      types: ['Files'],
      items: { length: 1 },
      files: [new File(['incoming'], 'incoming.txt')],
      dropEffect: 'copy'
    }

    fireEvent.dragEnter(screen.getByRole('main'), { dataTransfer })
    fireEvent.drop(screen.getByRole('main'), { dataTransfer })

    await screen.findByRole('dialog', { name: '确认复制' })
    expect(workdir.preflightDropCopy).toHaveBeenCalledWith(
      expect.objectContaining({ targetDirectory: folderFixture.path })
    )
  })

  it('stores a right-click copy as an in-memory file clipboard', () => {
    useAppStore.setState({
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [folderFixture],
        truncated: false
      }
    })
    render(<FileBrowser />)

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'projects' }))
    expect(screen.getByRole('menu')).toHaveClass('motion-popover-enter')
    fireEvent.click(screen.getAllByRole('menuitem', { name: /复制/ })[0])

    expect(useAppStore.getState().fileClipboard).toMatchObject({
      operation: 'copy',
      sourceAgentId: agentFixture.id,
      sourcePaths: [folderFixture.path]
    })
  })

  it('preflights an in-app paste with source agent and operation metadata', async () => {
    useAppStore.setState({
      fileClipboard: {
        operation: 'cut',
        sourceAgentId: agentFixture.id,
        sourcePaths: [folderFixture.path],
        createdAt: 1
      },
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [folderFixture],
        truncated: false
      }
    })
    render(<FileBrowser />)

    fireEvent.contextMenu(screen.getByRole('main'))
    fireEvent.click(screen.getByRole('menuitem', { name: /粘贴/ }))

    expect(await screen.findByRole('dialog', { name: '确认移动' })).toBeInTheDocument()
    expect(workdir.preflightDropCopy).toHaveBeenCalledWith({
      agentId: agentFixture.id,
      sourceAgentId: agentFixture.id,
      operation: 'cut',
      targetDirectory: agentFixture.resolvedWorkdir,
      sourcePaths: [folderFixture.path],
      conflictStrategy: 'keep-both'
    })
  })

  it('requires confirmation before moving a context item to the trash', async () => {
    useAppStore.setState({
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [fileFixture],
        truncated: false
      }
    })
    render(
      <>
        <FileBrowser />
        <NotificationHost />
      </>
    )

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: fileFixture.name }))
    await userEvent.click(screen.getByRole('menuitem', { name: /移到废纸篓/ }))

    const dialog = screen.getByRole('dialog', { name: '移到废纸篓？' })
    expect(dialog).toHaveAccessibleDescription(
      `将文件“${fileFixture.name}”从当前 Agent 工作目录移到 macOS 废纸篓。你可以在 Finder 的废纸篓中恢复它。`
    )
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()
    expect(workdir.trashItem).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: '移到废纸篓' }))

    expect(await screen.findByText(`已将 ${fileFixture.name} 移到废纸篓。`)).toBeInTheDocument()
    expect(workdir.trashItem).toHaveBeenCalledWith(agentFixture.id, fileFixture.path)
    await waitFor(() =>
      expect(workdir.readDirectory).toHaveBeenCalledWith(
        agentFixture.id,
        agentFixture.resolvedWorkdir
      )
    )
  })

  it('cancels the trash confirmation without calling the native action', async () => {
    useAppStore.setState({
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [folderFixture],
        truncated: false
      }
    })
    render(<FileBrowser />)

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: folderFixture.name }))
    await userEvent.click(screen.getByRole('menuitem', { name: /移到废纸篓/ }))
    await userEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(screen.queryByRole('dialog', { name: '移到废纸篓？' })).not.toBeInTheDocument()
    expect(workdir.trashItem).not.toHaveBeenCalled()
  })

  it('does not request the same preview again when showing context information', async () => {
    useAppStore.setState({
      listing: {
        path: agentFixture.resolvedWorkdir,
        parentPath: null,
        items: [fileFixture],
        truncated: false
      }
    })
    render(<FileBrowser />)

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: fileFixture.name }))
    await userEvent.click(screen.getByRole('menuitem', { name: /显示简介/ }))

    expect(workdir.preview).toHaveBeenCalledOnce()
    expect(useAppStore.getState().workspaces.codex.inspectorVisible).toBe(true)
  })

  it('invalidates the operation Agent when the active Agent changes during a copy', async () => {
    const copyRequest = createDeferred<Awaited<ReturnType<WorkdirApi['copyDroppedItems']>>>()
    vi.mocked(workdir.copyDroppedItems).mockReturnValueOnce(copyRequest.promise)
    const secondAgent = {
      ...agentFixture,
      id: 'claude',
      name: 'Claude Code',
      workdir: '~/.claude',
      resolvedWorkdir: '/Users/test/.claude',
      isDefault: false
    }
    useAppStore.setState((state) => ({
      workspaces: {
        ...state.workspaces,
        [secondAgent.id]: createWorkspace(secondAgent)
      },
      sessions: {
        [agentFixture.id]: {
          listing: state.listing,
          directoryError: null,
          selectedItem: null,
          preview: null,
          search: null
        }
      }
    }))
    render(
      <>
        <FileBrowser />
        <NotificationHost />
      </>
    )
    const dataTransfer = {
      types: ['Files'],
      items: { length: 1 },
      files: [new File(['incoming'], 'incoming.txt')],
      dropEffect: 'copy'
    }
    fireEvent.dragEnter(screen.getByRole('main'), { dataTransfer })
    fireEvent.drop(screen.getByRole('main'), { dataTransfer })
    await screen.findByRole('dialog', { name: '确认复制' })
    fireEvent.click(screen.getByRole('button', { name: '复制' }))

    act(() => useAppStore.setState({ activeAgentId: secondAgent.id }))
    copyRequest.resolve({
      operationId: 'operation-delayed',
      copied: 1,
      moved: 0,
      skipped: 0,
      replaced: 0,
      renamed: 0,
      errors: []
    })
    await screen.findByText('已复制 1 项')

    expect(workdir.copyDroppedItems).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: agentFixture.id })
    )
    expect(useAppStore.getState().sessions[agentFixture.id]).toBeUndefined()
  })
})
