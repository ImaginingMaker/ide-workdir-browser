import type {
  DropConflictStrategy,
  DropCopyPreflight,
  DropCopyResult,
  FileTransferOperation
} from '@shared/contracts'

export interface PendingFileOperation {
  agentId: string
  sourcePaths: string[]
  sourceAgentId?: string
  operation: FileTransferOperation
  targetDirectory: string
  preflight: DropCopyPreflight
  conflictStrategy: DropConflictStrategy
}

export const pathSummary = (path: string): string => {
  const parts = path.split('/').filter(Boolean)
  return parts.length >= 2 ? parts.slice(-2).join(' / ') : (parts[0] ?? path)
}

export const fileOperationResultSummary = (result: DropCopyResult): string => {
  const segments = result.moved > 0 ? [`已移动 ${result.moved} 项`] : [`已复制 ${result.copied} 项`]
  if (result.renamed > 0) segments.push(`保留两者 ${result.renamed} 项`)
  if (result.replaced > 0) segments.push(`替换 ${result.replaced} 项`)
  if (result.skipped > 0) segments.push(`跳过 ${result.skipped} 项`)
  if (result.errors.length > 0) segments.push(`${result.errors.length} 个错误`)
  return segments.join(' · ')
}
