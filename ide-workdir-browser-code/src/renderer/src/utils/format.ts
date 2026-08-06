export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

export const formatDate = (timestamp: number): string =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)

export const fileTypeLabel = (extension: string, type: string): string => {
  if (type === 'directory') return '文件夹'
  if (type === 'symlink') return '符号链接'
  return extension ? `${extension.slice(1).toUpperCase()} 文件` : '文件'
}
