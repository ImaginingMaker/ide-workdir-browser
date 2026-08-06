import { FileIcon } from './FileIcon'
import type { FileItem } from '@shared/contracts'
import { isDirectoryLike } from '@shared/file-item'

interface FileViewProps {
  agentId?: string
  items: FileItem[]
  selectedPath?: string
  dropTargetPath?: string
  isDraggingFiles?: boolean
  onSelect(item: FileItem): void
  onOpen(item: FileItem): void
  onDropTargetChange(item: FileItem | null): void
  onContextMenu(event: React.MouseEvent, item: FileItem): void
}

export const IconView = ({
  agentId,
  items,
  selectedPath,
  dropTargetPath,
  isDraggingFiles,
  onSelect,
  onOpen,
  onDropTargetChange,
  onContextMenu
}: FileViewProps): React.JSX.Element => (
  <div className="icon-grid motion-presence-replace" role="grid" aria-label="文件">
    {items.map((item) => {
      const acceptsDrop = Boolean(isDraggingFiles && isDirectoryLike(item))
      return (
        <button
          type="button"
          role="gridcell"
          key={item.path}
          data-file-item="true"
          data-drop-target={acceptsDrop ? 'directory' : undefined}
          className={`file-tile ${selectedPath === item.path ? 'is-selected' : ''} ${
            dropTargetPath === item.path ? 'is-drop-target' : ''
          } ${item.isHidden ? 'is-hidden' : ''}`}
          onClick={() => onSelect(item)}
          onDoubleClick={() => onOpen(item)}
          onContextMenu={(event) => onContextMenu(event, item)}
          onDragEnter={(event) => {
            if (!acceptsDrop) return
            event.preventDefault()
            onDropTargetChange(item)
          }}
          onDragOver={(event) => {
            if (!acceptsDrop) return
            event.preventDefault()
            onDropTargetChange(item)
          }}
          title={item.name}
        >
          <FileIcon item={item} agentId={agentId} size={42} />
          <span className="file-tile__name">{item.name}</span>
        </button>
      )
    })}
  </div>
)
