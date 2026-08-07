import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@renderer/components/ui/Icon'
import { notify } from '@renderer/features/notifications/notification-store'
import { copyPathToClipboard, revealPathInFinder } from '@renderer/services/native-actions'
import { useAppStore } from '@renderer/store/app-store'
import { formatUserFacingError } from '@renderer/utils/user-facing-error'
import type { DropConflictStrategy, FileItem } from '@shared/contracts'
import { ColumnView } from './ColumnView'
import { IconView } from './IconView'
import { ListView } from './ListView'
import { FileOperationDialog } from './FileOperationDialog'
import { TrashConfirmationDialog } from './TrashConfirmationDialog'
import {
  fileOperationResultSummary,
  pathSummary,
  type PendingFileOperation
} from './file-operation'
import { SearchWorkspace } from '../search/SearchWorkspace'
import { isDirectoryLike } from '@shared/file-item'

interface ContextMenuState {
  x: number
  y: number
  item: FileItem | null
}

interface PendingTrashOperation {
  agentId: string
  item: FileItem
}

const FILE_CLICK_PREVIEW_DELAY_MS = 120
const CONTEXT_MENU_VIEWPORT_MARGIN = 8

export const FileBrowser = (): React.JSX.Element => {
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [dragItemCount, setDragItemCount] = useState(0)
  const [dropTarget, setDropTarget] = useState<FileItem | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingFileOperation | null>(null)
  const [pendingTrash, setPendingTrash] = useState<PendingTrashOperation | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [isTrashing, setIsTrashing] = useState(false)
  const loading = useAppStore((state) => state.loading)
  const directoryError = useAppStore((state) => state.directoryError)
  const listing = useAppStore((state) => state.listing)
  const search = useAppStore((state) => state.search)
  const selectedItem = useAppStore((state) => state.selectedItem)
  const fileClipboard = useAppStore((state) => state.fileClipboard)
  const activeAgentId = useAppStore((state) => state.activeAgentId)
  const activeAgentStatus = useAppStore(
    (state) => state.agents.find((agent) => agent.id === state.activeAgentId)?.status
  )
  const columnActivePath = useAppStore(
    (state) => state.workspaces[state.activeAgentId]?.columnActivePath
  )
  const columnRefreshVersion = useAppStore(
    (state) => state.workspaces[state.activeAgentId]?.columnRefreshVersion ?? 0
  )
  const viewMode = useAppStore((state) => state.workspaces[activeAgentId]?.viewMode)
  const selectItem = useAppStore((state) => state.selectItem)
  const openItem = useAppStore((state) => state.openItem)
  const copySelection = useAppStore((state) => state.copySelection)
  const clearFileClipboard = useAppStore((state) => state.clearFileClipboard)
  const invalidateAgentSessions = useAppStore((state) => state.invalidateAgentSessions)
  const toggleInspector = useAppStore((state) => state.toggleInspector)
  const refresh = useAppStore((state) => state.refresh)
  const closeTab = useAppStore((state) => state.closeTab)
  const setColumnActivePath = useAppStore((state) => state.setColumnActivePath)
  const setScreen = useAppStore((state) => state.setScreen)
  const setSettingsSection = useAppStore((state) => state.setSettingsSection)
  const openFileAccessSettings = useAppStore((state) => state.openFileAccessSettings)

  const selectItemFromView = useCallback(
    (item: FileItem): void => {
      void selectItem(item, { previewDelayMs: FILE_CLICK_PREVIEW_DELAY_MS })
    },
    [selectItem]
  )

  const openItemFromView = useCallback(
    (item: FileItem): void => {
      void openItem(item)
    },
    [openItem]
  )

  useEffect(() => {
    if (!contextMenu) return undefined
    const close = (): void => setContextMenu(null)
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [contextMenu])

  useLayoutEffect(() => {
    const menu = contextMenuRef.current
    if (!contextMenu || !menu) return

    const x = Math.min(
      Math.max(contextMenu.x, CONTEXT_MENU_VIEWPORT_MARGIN),
      Math.max(
        CONTEXT_MENU_VIEWPORT_MARGIN,
        window.innerWidth - menu.offsetWidth - CONTEXT_MENU_VIEWPORT_MARGIN
      )
    )
    const y = Math.min(
      Math.max(contextMenu.y, CONTEXT_MENU_VIEWPORT_MARGIN),
      Math.max(
        CONTEXT_MENU_VIEWPORT_MARGIN,
        window.innerHeight - menu.offsetHeight - CONTEXT_MENU_VIEWPORT_MARGIN
      )
    )
    if (x === contextMenu.x && y === contextMenu.y) return
    setContextMenu((current) => (current ? { ...current, x, y } : current))
  }, [contextMenu])

  const hasFilePayload = (dataTransfer: DataTransfer): boolean =>
    Array.from(dataTransfer.types).includes('Files')

  const updateDragItemCount = (dataTransfer: DataTransfer): void => {
    setDragItemCount(dataTransfer.items.length || dataTransfer.files.length)
  }

  const resetDragState = (): void => {
    setIsDraggingFiles(false)
    setDragItemCount(0)
    setDropTarget(null)
  }

  const currentTargetDirectory = (): string | null => {
    if (!listing) return null
    return dropTarget && isDirectoryLike(dropTarget)
      ? dropTarget.path
      : (columnActivePath ?? listing.path)
  }

  const activePasteDirectory = (): string | null => columnActivePath ?? listing?.path ?? null

  const targetDirectoryForContextItem = (item: FileItem | null): string | null =>
    item && isDirectoryLike(item) ? item.path : activePasteDirectory()

  const extractDroppedPaths = (files: FileList): string[] =>
    Array.from(files)
      .map((file) => window.workdir.getDroppedFilePath(file))
      .filter((path): path is string => Boolean(path))

  const handleDragEnter = (event: React.DragEvent<HTMLElement>): void => {
    if (!listing || !hasFilePayload(event.dataTransfer)) return
    event.preventDefault()
    updateDragItemCount(event.dataTransfer)
    setIsDraggingFiles(true)
  }

  const handleDragOver = (event: React.DragEvent<HTMLElement>): void => {
    if (!listing || !hasFilePayload(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    updateDragItemCount(event.dataTransfer)
    const target = event.target instanceof HTMLElement ? event.target : null
    if (!target?.closest('[data-drop-target="directory"]')) setDropTarget(null)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLElement>): void => {
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
    resetDragState()
  }

  const handleDrop = async (event: React.DragEvent<HTMLElement>): Promise<void> => {
    event.preventDefault()
    const targetDirectory = currentTargetDirectory()
    const sourcePaths = extractDroppedPaths(event.dataTransfer.files)
    resetDragState()
    if (!targetDirectory || sourcePaths.length === 0) {
      notify.warning('未能读取 Finder 拖入项目的本地路径。')
      return
    }

    try {
      const preflight = await window.workdir.preflightDropCopy({
        agentId: activeAgentId,
        targetDirectory,
        sourcePaths,
        conflictStrategy: 'keep-both'
      })
      setPendingDrop({
        agentId: activeAgentId,
        sourcePaths,
        operation: 'copy',
        targetDirectory: preflight.targetDirectory,
        preflight,
        conflictStrategy: 'keep-both'
      })
    } catch (dropError) {
      notify.error(formatUserFacingError(dropError, 'file-operation'))
    }
  }

  const startClipboardPaste = async (targetDirectory: string | null): Promise<void> => {
    if (!fileClipboard || !targetDirectory) return
    try {
      const preflight = await window.workdir.preflightDropCopy({
        agentId: activeAgentId,
        sourceAgentId: fileClipboard.sourceAgentId,
        operation: fileClipboard.operation,
        targetDirectory,
        sourcePaths: fileClipboard.sourcePaths,
        conflictStrategy: 'keep-both'
      })
      setPendingDrop({
        agentId: activeAgentId,
        sourcePaths: fileClipboard.sourcePaths,
        sourceAgentId: fileClipboard.sourceAgentId,
        operation: fileClipboard.operation,
        targetDirectory: preflight.targetDirectory,
        preflight,
        conflictStrategy: 'keep-both'
      })
    } catch (pasteError) {
      notify.error(formatUserFacingError(pasteError, 'file-operation'))
    }
  }

  const requestTrashItem = (item: FileItem | null): void => {
    if (!item) return
    setContextMenu(null)
    setPendingTrash({ agentId: activeAgentId, item })
  }

  useEffect(() => {
    const pasteIntoActiveDirectory = (): void => {
      void startClipboardPaste(activePasteDirectory())
    }
    window.addEventListener('workdir:paste-request', pasteIntoActiveDirectory)
    return () => window.removeEventListener('workdir:paste-request', pasteIntoActiveDirectory)
  })

  useEffect(() => {
    const requestTrashSelected = (): void => {
      const state = useAppStore.getState()
      if (!state.selectedItem) return
      setContextMenu(null)
      setPendingTrash({ agentId: state.activeAgentId, item: state.selectedItem })
    }
    window.addEventListener('workdir:trash-selected-request', requestTrashSelected)
    return () => window.removeEventListener('workdir:trash-selected-request', requestTrashSelected)
  }, [])

  const isPathAffectedByTrash = (trashedItem: FileItem, candidatePath: string): boolean =>
    candidatePath === trashedItem.path ||
    (isDirectoryLike(trashedItem) && candidatePath.startsWith(`${trashedItem.path}/`))

  const forgetTrashedItemReferences = (operation: PendingTrashOperation): void => {
    const state = useAppStore.getState()
    const workspace = state.workspaces[operation.agentId]
    if (!workspace || state.activeAgentId !== operation.agentId) return

    workspace.openTabs
      .filter((tab) => isPathAffectedByTrash(operation.item, tab.filePath))
      .forEach((tab) => closeTab(tab.id))
    if (state.selectedItem && isPathAffectedByTrash(operation.item, state.selectedItem.path)) {
      void selectItem(null)
    }
  }

  const undoFileOperation = async (agentId: string, operationId: string): Promise<void> => {
    try {
      const result = await window.workdir.undoFileOperation(agentId, operationId)
      const message =
        result.errors.length > 0
          ? `已撤销 ${result.restored} 项，另有 ${result.errors.length} 项未能恢复。`
          : `已撤销 ${result.restored} 项。`
      if (result.errors.length > 0) {
        notify.warning(message)
      } else {
        notify.success(message)
      }
      if (useAppStore.getState().activeAgentId === agentId) {
        await refresh()
      } else {
        invalidateAgentSessions([agentId])
      }
    } catch (undoError) {
      notify.error(formatUserFacingError(undoError, 'file-operation'))
    }
  }

  const confirmDropCopy = async (): Promise<void> => {
    if (!pendingDrop) return
    setIsCopying(true)
    const operation = pendingDrop
    const operationAgentId = operation.agentId
    try {
      const result = await window.workdir.copyDroppedItems({
        agentId: operationAgentId,
        sourceAgentId: operation.sourceAgentId,
        operation: operation.operation,
        targetDirectory: operation.targetDirectory,
        sourcePaths: operation.sourcePaths,
        conflictStrategy: operation.conflictStrategy
      })
      setPendingDrop(null)
      const canUndo = result.copied + result.moved > 0
      notify.success(fileOperationResultSummary(result), {
        action: canUndo
          ? {
              label: '撤销',
              onInvoke: () => void undoFileOperation(operationAgentId, result.operationId)
            }
          : undefined
      })
      const affectedAgentIds = new Set([operationAgentId])
      if (operation.operation === 'cut' && result.moved > 0) {
        clearFileClipboard()
        if (operation.sourceAgentId) affectedAgentIds.add(operation.sourceAgentId)
      }
      const currentState = useAppStore.getState()
      const inactiveAgentIds = Array.from(affectedAgentIds).filter(
        (agentId) => agentId !== currentState.activeAgentId
      )
      if (inactiveAgentIds.length > 0) invalidateAgentSessions(inactiveAgentIds)
      if (affectedAgentIds.has(currentState.activeAgentId)) await currentState.refresh()
    } catch (copyError) {
      notify.error(formatUserFacingError(copyError, 'file-operation'))
    } finally {
      setIsCopying(false)
    }
  }

  const confirmTrash = async (): Promise<void> => {
    if (!pendingTrash) return
    setIsTrashing(true)
    const operation = pendingTrash
    try {
      await window.workdir.trashItem(operation.agentId, operation.item.path)
      setPendingTrash(null)
      notify.success(`已将 ${operation.item.name} 移到废纸篓。`)
      const currentState = useAppStore.getState()
      if (
        currentState.fileClipboard?.sourceAgentId === operation.agentId &&
        currentState.fileClipboard.sourcePaths.some((sourcePath) =>
          isPathAffectedByTrash(operation.item, sourcePath)
        )
      ) {
        clearFileClipboard()
      }
      if (currentState.activeAgentId === operation.agentId) {
        forgetTrashedItemReferences(operation)
        await useAppStore.getState().refresh()
      } else {
        invalidateAgentSessions([operation.agentId])
      }
    } catch (trashError) {
      notify.error(formatUserFacingError(trashError, 'file-operation'))
    } finally {
      setIsTrashing(false)
    }
  }

  const openContextMenu = (event: React.MouseEvent, item: FileItem | null): void => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ x: event.clientX, y: event.clientY, item })
    if (item) void selectItem(item)
  }

  const copyContextItem = (operation: 'copy' | 'cut', item: FileItem): void => {
    copySelection(operation, item)
    notify.info(
      operation === 'copy'
        ? `已复制 ${item.name}，可切换 Agent 后粘贴。`
        : `已剪切 ${item.name}，可切换 Agent 后移动。`
    )
    setContextMenu(null)
  }

  const revealContextItem = async (item: FileItem): Promise<void> => {
    setContextMenu(null)
    await revealPathInFinder(activeAgentId, item.path)
  }

  const copyContextPath = async (item: FileItem): Promise<void> => {
    setContextMenu(null)
    await copyPathToClipboard(item.path)
  }

  const openContextItem = async (item: FileItem): Promise<void> => {
    setContextMenu(null)
    await openItem(item)
  }

  const showContextInfo = (): void => {
    setContextMenu(null)
    const inspectorVisible = useAppStore.getState().workspaces[activeAgentId]?.inspectorVisible
    if (!inspectorVisible) toggleInspector()
  }

  if (search) return <SearchWorkspace />

  let content: React.JSX.Element
  if (loading && !listing) {
    content = (
      <div className="empty-state">
        <span className="spinner" />
        <h2>正在读取工作目录</h2>
      </div>
    )
  } else if (!listing || !viewMode) {
    const permissionRequired = activeAgentStatus === 'permission-required'
    content = (
      <div className="empty-state">
        <Icon name="folder" size={48} />
        <h2>{permissionRequired ? '需要文件夹访问权限' : '工作目录不可用'}</h2>
        <p>
          {directoryError
            ? directoryError
            : '请在“设置 > Agent”中检查路径，或确认 macOS 文件访问权限。'}
        </p>
        {permissionRequired && (
          <div className="empty-state__actions">
            <button type="button" className="is-primary" onClick={() => void refresh()}>
              重新尝试
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsSection('agents')
                setScreen('settings')
              }}
            >
              更改工作目录
            </button>
            <button type="button" onClick={() => void openFileAccessSettings()}>
              打开文件与文件夹设置
            </button>
          </div>
        )}
      </div>
    )
  } else if (listing.items.length === 0) {
    content = (
      <div className="empty-state">
        <Icon name="folder" size={48} />
        <h2>此文件夹为空</h2>
        <p>当前目录中没有可显示的项目，可从 Finder 拖入文件或文件夹。</p>
      </div>
    )
  } else {
    const common = {
      agentId: activeAgentId,
      items: listing.items,
      selectedPath: selectedItem?.path,
      dropTargetPath: dropTarget?.path,
      isDraggingFiles,
      onSelect: selectItemFromView,
      onOpen: openItemFromView,
      onDropTargetChange: (item: FileItem | null) => setDropTarget(item),
      onContextMenu: openContextMenu
    }

    content = (
      <>
        {viewMode === 'icon' && (
          <IconView key={`${activeAgentId}:${listing.path}:icon`} {...common} />
        )}
        {viewMode === 'list' && (
          <ListView key={`${activeAgentId}:${listing.path}:list`} {...common} />
        )}
        {viewMode === 'column' && (
          <ColumnView
            key={`${activeAgentId}:${listing.path}:${listing.items
              .map((item) => `${item.path}:${item.modifiedAt}`)
              .join('|')}`}
            agentId={activeAgentId}
            listing={listing}
            selectedPath={selectedItem?.path}
            dropTargetPath={dropTarget?.path}
            isDraggingFiles={isDraggingFiles}
            activePath={columnActivePath}
            refreshVersion={columnRefreshVersion}
            onSelect={common.onSelect}
            onOpen={common.onOpen}
            onActivePathChange={setColumnActivePath}
            onDropTargetChange={common.onDropTargetChange}
            onContextMenu={common.onContextMenu}
          />
        )}
      </>
    )
  }

  const targetDirectory = currentTargetDirectory()
  const activeDropLabel = dropTarget?.name ?? (targetDirectory ? pathSummary(targetDirectory) : '')
  const contextItem = contextMenu?.item ?? null
  const contextPasteTarget = contextMenu ? targetDirectoryForContextItem(contextItem) : null

  return (
    <main
      className={`file-browser motion-presence-enter ${isDraggingFiles ? 'is-dragging-files' : ''}`}
      tabIndex={0}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(event) => void handleDrop(event)}
      onContextMenu={(event) => {
        const target = event.target instanceof HTMLElement ? event.target : null
        if (target?.closest('[data-file-item="true"]')) return
        openContextMenu(event, null)
      }}
    >
      {content}
      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="file-context-menu motion-popover-enter"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              disabled={!contextItem}
              onClick={() => contextItem && void openContextItem(contextItem)}
            >
              <span>打开</span>
              <kbd>⌘O</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!contextItem}
              onClick={() => contextItem && void revealContextItem(contextItem)}
            >
              <span>在 Finder 中显示</span>
              <kbd>⌥⌘O</kbd>
            </button>
            <div className="file-context-menu__separator" />
            <button
              type="button"
              role="menuitem"
              disabled={!contextItem}
              onClick={() => contextItem && copyContextItem('copy', contextItem)}
            >
              <span>复制</span>
              <kbd>⌘C</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!contextItem}
              onClick={() => contextItem && copyContextItem('cut', contextItem)}
            >
              <span>剪切</span>
              <kbd>⌘X</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!fileClipboard || !contextPasteTarget}
              onClick={() => {
                setContextMenu(null)
                void startClipboardPaste(contextPasteTarget)
              }}
            >
              <span>{contextItem && isDirectoryLike(contextItem) ? '粘贴到此处' : '粘贴'}</span>
              <kbd>⌘V</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!contextItem}
              onClick={() => contextItem && void copyContextPath(contextItem)}
            >
              <span>复制路径</span>
              <kbd>⌥⌘C</kbd>
            </button>
            <div className="file-context-menu__separator" />
            <button
              type="button"
              role="menuitem"
              disabled={!contextItem}
              onClick={() => contextItem && showContextInfo()}
            >
              <span>显示简介</span>
              <kbd>⌘I</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!contextItem}
              onClick={() => requestTrashItem(contextItem)}
            >
              <span>移到废纸篓</span>
              <kbd>⌘⌫</kbd>
            </button>
          </div>,
          document.body
        )}
      {isDraggingFiles && targetDirectory && (
        <div className="drop-overlay motion-backdrop-enter" aria-hidden="true">
          <Icon name={dropTarget ? 'folder-open' : 'copy-plus'} size={52} />
          <strong>复制到 {activeDropLabel}</strong>
          <span>
            松开以准备复制
            {dragItemCount > 0 ? ` · ${dragItemCount} 个项目` : ''}
          </span>
        </div>
      )}
      {pendingDrop && (
        <FileOperationDialog
          pending={pendingDrop}
          running={isCopying}
          onConflictStrategyChange={(conflictStrategy: DropConflictStrategy) =>
            setPendingDrop((current) => (current ? { ...current, conflictStrategy } : current))
          }
          onCancel={() => setPendingDrop(null)}
          onConfirm={() => void confirmDropCopy()}
        />
      )}
      {pendingTrash && (
        <TrashConfirmationDialog
          item={pendingTrash.item}
          running={isTrashing}
          onCancel={() => setPendingTrash(null)}
          onConfirm={() => void confirmTrash()}
        />
      )}
    </main>
  )
}
