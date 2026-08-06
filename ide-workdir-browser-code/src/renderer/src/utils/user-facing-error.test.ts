import { describe, expect, it } from 'vitest'
import { formatUserFacingError } from './user-facing-error'

describe('formatUserFacingError', () => {
  it('explains a missing work directory without exposing Electron internals', () => {
    const message = formatUserFacingError(
      "Error invoking remote method 'directory:read': Error: ENOENT: no such file or directory, access '/Users/test/.agent'",
      'directory'
    )

    expect(message).toBe(
      '找不到该工作目录，它可能已被移动或删除。请在“设置 > Agent”中重新选择有效文件夹。'
    )
    expect(message).not.toContain('ENOENT')
    expect(message).not.toContain('/Users/test')
  })

  it('provides guidance for permission and invalid-directory errors', () => {
    expect(formatUserFacingError('EACCES: permission denied', 'directory')).toContain(
      '隐私与安全性'
    )
    expect(formatUserFacingError('ENOTDIR: not a directory', 'directory')).toContain('不是文件夹')
  })

  it('uses the operation context instead of treating every missing path as a work directory', () => {
    expect(formatUserFacingError('ENOENT: no such file', 'preview')).toBe(
      '文件已被移动或删除，无法继续预览。'
    )
    expect(formatUserFacingError('ENOENT: no such file', 'search')).toBe(
      '搜索目录已被移动或删除，请刷新工作目录后重试。'
    )
    expect(formatUserFacingError('ENOENT: no such file', 'file-operation')).toBe(
      '源文件或目标文件夹已被移动或删除，文件操作未能完成。'
    )
  })
})
