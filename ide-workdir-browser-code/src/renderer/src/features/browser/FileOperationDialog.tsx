import { useId, useRef } from 'react'
import { ModalDialog } from '@renderer/components/ui/ModalDialog'
import { formatBytes } from '@renderer/utils/format'
import type { DropConflictStrategy } from '@shared/contracts'
import { pathSummary, type PendingFileOperation } from './file-operation'

const CONFLICT_STRATEGIES: DropConflictStrategy[] = ['keep-both', 'skip', 'replace']

const conflictStrategyLabel = (strategy: DropConflictStrategy): string => {
  if (strategy === 'keep-both') return '保留两者'
  if (strategy === 'skip') return '跳过'
  return '替换'
}

interface FileOperationDialogProps {
  pending: PendingFileOperation
  running: boolean
  onConflictStrategyChange(strategy: DropConflictStrategy): void
  onCancel(): void
  onConfirm(): void
}

export const FileOperationDialog = ({
  pending,
  running,
  onConflictStrategyChange,
  onCancel,
  onConfirm
}: FileOperationDialogProps): React.JSX.Element => {
  const titleId = useId()
  const descriptionId = useId()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const operationLabel = pending.operation === 'cut' ? '移动' : '复制'
  const validSources = Math.max(0, pending.preflight.sourceCount - pending.preflight.errors.length)

  return (
    <ModalDialog
      layerClassName="file-operation-layer"
      panelClassName="file-operation-card"
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={cancelButtonRef}
      closeDisabled={running}
      onRequestClose={onCancel}
    >
      <h2 id={titleId}>确认{operationLabel}</h2>
      <p id={descriptionId}>
        将 {pending.preflight.sourceCount} 个来源中的 {pending.preflight.itemCount} 项
        {operationLabel}到 {pathSummary(pending.targetDirectory)}，共{' '}
        {formatBytes(pending.preflight.totalBytes)}。
      </p>
      {pending.preflight.conflicts.length > 0 && (
        <fieldset>
          <legend>{pending.preflight.conflicts.length} 个项目已存在</legend>
          {CONFLICT_STRATEGIES.map((strategy) => (
            <label key={strategy}>
              <input
                type="radio"
                name="drop-conflict-strategy"
                value={strategy}
                checked={pending.conflictStrategy === strategy}
                onChange={() => onConflictStrategyChange(strategy)}
              />
              {conflictStrategyLabel(strategy)}
            </label>
          ))}
        </fieldset>
      )}
      {pending.preflight.errors.length > 0 && (
        <div className="file-operation-card__errors">
          {pending.preflight.errors.slice(0, 3).map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      <div className="file-operation-card__actions">
        <button ref={cancelButtonRef} type="button" onClick={onCancel} disabled={running}>
          取消
        </button>
        <button
          type="button"
          className="is-primary"
          onClick={onConfirm}
          disabled={running || validSources === 0}
        >
          {running ? `正在${operationLabel}…` : operationLabel}
        </button>
      </div>
    </ModalDialog>
  )
}
