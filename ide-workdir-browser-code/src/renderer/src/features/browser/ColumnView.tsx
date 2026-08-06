import { useEffect, useRef, useState } from 'react'
import { Icon } from '@renderer/components/ui/Icon'
import { notify } from '@renderer/features/notifications/notification-store'
import { formatUserFacingError } from '@renderer/utils/user-facing-error'
import { FileIcon } from './FileIcon'
import type { DirectoryListing, FileItem } from '@shared/contracts'
import { isDirectoryLike } from '@shared/file-item'

interface ColumnViewProps {
  agentId: string
  listing: DirectoryListing
  selectedPath?: string
  dropTargetPath?: string
  isDraggingFiles?: boolean
  activePath?: string | null
  refreshVersion?: number
  onSelect(item: FileItem): void
  onOpen(item: FileItem): void
  onActivePathChange(path: string): void
  onDropTargetChange(item: FileItem | null): void
  onContextMenu(event: React.MouseEvent, item: FileItem): void
}

interface BrowserColumn {
  listing: DirectoryListing
  selectedPath?: string
  loading?: boolean
}

const titleFor = (listing: DirectoryListing): string =>
  listing.path.split('/').filter(Boolean).pop() ?? listing.path

export const ColumnView = ({
  agentId,
  listing,
  selectedPath,
  dropTargetPath,
  isDraggingFiles,
  activePath,
  refreshVersion = 0,
  onSelect,
  onOpen,
  onActivePathChange,
  onDropTargetChange,
  onContextMenu
}: ColumnViewProps): React.JSX.Element => {
  const [columns, setColumns] = useState<BrowserColumn[]>([{ listing }])
  const requestId = useRef(0)
  const columnsRef = useRef(columns)
  const handledRefreshVersion = useRef(refreshVersion)
  const viewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    columnsRef.current = columns
  }, [columns])

  useEffect(() => {
    onActivePathChange(listing.path)
  }, [listing.path, onActivePathChange])

  useEffect(() => {
    const view = viewRef.current
    if (view) {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      view.scrollTo({
        left: view.scrollWidth,
        behavior: reduceMotion ? 'auto' : 'smooth'
      })
    }
  }, [columns.length])

  useEffect(() => {
    if (handledRefreshVersion.current === refreshVersion) return
    handledRefreshVersion.current = refreshVersion
    if (!activePath) return

    const currentColumns = columnsRef.current
    let columnIndex = -1
    currentColumns.forEach((column, index) => {
      if (column.listing.path === activePath) columnIndex = index
    })
    if (columnIndex < 0) return

    const nextRequestId = ++requestId.current
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || requestId.current !== nextRequestId) return
      setColumns((current) =>
        current.map((column, index) =>
          index === columnIndex ? { ...column, loading: true } : column
        )
      )
    })

    void window.workdir
      .readDirectory(agentId, activePath)
      .then((refreshedListing) => {
        if (cancelled || requestId.current !== nextRequestId) return
        setColumns((current) => {
          const selectedPath = current[columnIndex]?.selectedPath
          const selectionStillExists = refreshedListing.items.some(
            (item) => item.path === selectedPath
          )
          return [
            ...current.slice(0, columnIndex),
            {
              listing: refreshedListing,
              selectedPath: selectionStillExists ? selectedPath : undefined
            }
          ]
        })
      })
      .catch((error: unknown) => {
        if (cancelled || requestId.current !== nextRequestId) return
        setColumns((current) =>
          current.map((column, index) =>
            index === columnIndex ? { ...column, loading: false } : column
          )
        )
        notify.error(formatUserFacingError(error, 'directory'))
      })

    return () => {
      cancelled = true
    }
  }, [activePath, agentId, refreshVersion])

  const selectAt = async (columnIndex: number, item: FileItem): Promise<void> => {
    onSelect(item)
    const parentPath = columns[columnIndex]?.listing.path ?? listing.path
    onActivePathChange(isDirectoryLike(item) ? item.path : parentPath)
    const nextRequestId = ++requestId.current
    setColumns((current) => [
      ...current.slice(0, columnIndex),
      { ...current[columnIndex], selectedPath: item.path },
      ...(isDirectoryLike(item) ? [{ listing: current[columnIndex].listing, loading: true }] : [])
    ])

    if (!isDirectoryLike(item)) return
    try {
      const childListing = await window.workdir.readDirectory(agentId, item.path)
      if (requestId.current !== nextRequestId) return
      setColumns((current) => [...current.slice(0, columnIndex + 1), { listing: childListing }])
    } catch {
      if (requestId.current !== nextRequestId) return
      onActivePathChange(parentPath)
      setColumns((current) => current.slice(0, columnIndex + 1))
    }
  }

  return (
    <div ref={viewRef} className="column-view motion-presence-replace" aria-label="分栏文件浏览器">
      {columns.map((column, columnIndex) => (
        <section className="column" key={`${column.listing.path}:${columnIndex}`}>
          <header title={column.listing.path}>{titleFor(column.listing)}</header>
          <div className="column__list" role="listbox" aria-label={titleFor(column.listing)}>
            {column.loading ? (
              <div className="column__state">
                <span className="spinner" />
              </div>
            ) : column.listing.items.length === 0 ? (
              <div className="column__state">此文件夹为空</div>
            ) : (
              column.listing.items.map((item) => (
                <button
                  type="button"
                  role="option"
                  data-file-item="true"
                  data-drop-target={
                    isDraggingFiles && isDirectoryLike(item) ? 'directory' : undefined
                  }
                  aria-selected={
                    column.selectedPath === item.path ||
                    (columnIndex === columns.length - 1 && selectedPath === item.path)
                  }
                  key={item.path}
                  className={`${dropTargetPath === item.path ? 'is-drop-target' : ''} ${
                    column.selectedPath === item.path ||
                    (columnIndex === columns.length - 1 && selectedPath === item.path)
                      ? 'is-selected'
                      : ''
                  }`}
                  onClick={() => void selectAt(columnIndex, item)}
                  onContextMenu={(event) => onContextMenu(event, item)}
                  onDoubleClick={() => {
                    if (!isDirectoryLike(item)) onOpen(item)
                  }}
                  onDragEnter={(event) => {
                    if (!isDraggingFiles || !isDirectoryLike(item)) return
                    event.preventDefault()
                    onDropTargetChange(item)
                  }}
                  onDragOver={(event) => {
                    if (!isDraggingFiles || !isDirectoryLike(item)) return
                    event.preventDefault()
                    onDropTargetChange(item)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight' && isDirectoryLike(item)) {
                      event.preventDefault()
                      void selectAt(columnIndex, item)
                    }
                    if (event.key === 'Enter' && !isDirectoryLike(item)) onOpen(item)
                  }}
                >
                  <FileIcon item={item} agentId={agentId} />
                  <span>{item.name}</span>
                  {isDirectoryLike(item) && <Icon name="chevron-right" size={13} />}
                </button>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
