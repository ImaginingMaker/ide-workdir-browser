import { useId, useRef } from 'react'
import { ModalDialog } from '@renderer/components/ui/ModalDialog'
import type { FileItem } from '@shared/contracts'
import { isDirectoryLike } from '@shared/file-item'
import { pathSummary } from './file-operation'

interface TrashConfirmationDialogProps {
  item: FileItem
  running: boolean
  onCancel(): void
  onConfirm(): void
}

export const TrashConfirmationDialog = ({
  item,
  running,
  onCancel,
  onConfirm
}: TrashConfirmationDialogProps): React.JSX.Element => {
  const titleId = useId()
  const descriptionId = useId()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const itemKind = isDirectoryLike(item) ? '文件夹' : '文件'

  return (
    <ModalDialog
      layerClassName="file-operation-layer"
      panelClassName="file-operation-card file-trash-card"
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={cancelButtonRef}
      closeDisabled={running}
      onRequestClose={onCancel}
    >
      <h2 id={titleId}>移到废纸篓？</h2>
      <p id={descriptionId}>
        将{itemKind}“{item.name}”从当前 Agent 工作目录移到 macOS 废纸篓。你可以在 Finder
        的废纸篓中恢复它。
      </p>
      <p className="file-trash-card__path">完整路径：{pathSummary(item.path)}</p>
      {item.type === 'symlink' && (
        <p className="file-trash-card__notice">
          这是符号链接入口；本操作只会移动链接本身，不会删除链接目标。
        </p>
      )}
      {isDirectoryLike(item) && item.type !== 'symlink' && (
        <p className="file-trash-card__notice">该文件夹及其中内容会作为一个项目移到废纸篓。</p>
      )}
      <div className="file-operation-card__actions">
        <button ref={cancelButtonRef} type="button" onClick={onCancel} disabled={running}>
          取消
        </button>
        <button type="button" className="is-danger" onClick={onConfirm} disabled={running}>
          {running ? '正在移到废纸篓…' : '移到废纸篓'}
        </button>
      </div>
    </ModalDialog>
  )
}
