import { FileIcon } from './FileIcon'
import { fileTypeLabel, formatBytes, formatDate } from '@renderer/utils/format'
import type { FileItem } from '@shared/contracts'
import { isDirectoryLike } from '@shared/file-item'

interface ListViewProps {
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

export const ListView = ({
  agentId,
  items,
  selectedPath,
  dropTargetPath,
  isDraggingFiles,
  onSelect,
  onOpen,
  onDropTargetChange,
  onContextMenu
}: ListViewProps): React.JSX.Element => (
  <table className="file-list motion-presence-replace">
    <thead>
      <tr>
        <th>名称</th>
        <th>大小</th>
        <th>种类</th>
        <th>修改时间</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr
          key={item.path}
          data-file-item="true"
          data-drop-target={isDraggingFiles && isDirectoryLike(item) ? 'directory' : undefined}
          className={`${selectedPath === item.path ? 'is-selected' : ''} ${
            dropTargetPath === item.path ? 'is-drop-target' : ''
          } ${item.isHidden ? 'is-hidden' : ''}`}
          onClick={() => onSelect(item)}
          onDoubleClick={() => onOpen(item)}
          onContextMenu={(event) => onContextMenu(event, item)}
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
        >
          <td title={item.name}>
            <FileIcon item={item} agentId={agentId} />
            <span>{item.name}</span>
          </td>
          <td>{isDirectoryLike(item) ? '—' : formatBytes(item.size)}</td>
          <td>{fileTypeLabel(item.extension, item.type)}</td>
          <td>{formatDate(item.modifiedAt)}</td>
        </tr>
      ))}
    </tbody>
  </table>
)
