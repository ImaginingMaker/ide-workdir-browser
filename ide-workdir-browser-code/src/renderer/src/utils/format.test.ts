import { describe, expect, it } from 'vitest'
import { fileTypeLabel, formatBytes } from './format'

describe('format utilities', () => {
  it('formats byte sizes with readable units', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(12 * 1024 * 1024)).toBe('12 MB')
  })

  it('provides localized file type labels', () => {
    expect(fileTypeLabel('', 'directory')).toBe('文件夹')
    expect(fileTypeLabel('.ts', 'file')).toBe('TS 文件')
    expect(fileTypeLabel('', 'symlink')).toBe('符号链接')
  })
})
