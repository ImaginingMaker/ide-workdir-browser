import type { FileItem } from './contracts'

export const isDirectoryLike = (item: FileItem): boolean =>
  item.type === 'directory' || item.symlinkTargetType === 'directory'
