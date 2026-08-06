import { describe, expect, it } from 'vitest'
import { fileOperationResultSummary, pathSummary } from './file-operation'

describe('file operation summaries', () => {
  it.each([
    ['/Users/test/.codex', 'test / .codex'],
    ['/workspace', 'workspace'],
    ['relative', 'relative'],
    ['/', '/']
  ])('summarizes %s without exposing a long absolute path', (path, expected) => {
    expect(pathSummary(path)).toBe(expected)
  })

  it('reports every copy outcome in a stable order', () => {
    expect(
      fileOperationResultSummary({
        operationId: 'operation-1',
        copied: 2,
        moved: 0,
        renamed: 1,
        replaced: 3,
        skipped: 4,
        errors: ['failed']
      })
    ).toBe('已复制 2 项 · 保留两者 1 项 · 替换 3 项 · 跳过 4 项 · 1 个错误')
  })

  it('uses the moved count instead of a misleading copied count for cut operations', () => {
    expect(
      fileOperationResultSummary({
        operationId: 'operation-2',
        copied: 0,
        moved: 2,
        renamed: 0,
        replaced: 0,
        skipped: 0,
        errors: []
      })
    ).toBe('已移动 2 项')
  })
})
