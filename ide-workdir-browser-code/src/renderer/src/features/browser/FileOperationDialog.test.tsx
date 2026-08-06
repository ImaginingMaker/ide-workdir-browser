import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PendingFileOperation } from './file-operation'
import { FileOperationDialog } from './FileOperationDialog'

const createPending = (overrides: Partial<PendingFileOperation> = {}): PendingFileOperation => ({
  agentId: 'codex',
  sourcePaths: ['/tmp/guide.md'],
  operation: 'copy',
  targetDirectory: '/Users/test/team/destination',
  conflictStrategy: 'keep-both',
  preflight: {
    targetDirectory: '/Users/test/team/destination',
    sourceCount: 5,
    itemCount: 8,
    totalBytes: 1536,
    conflicts: [
      {
        name: 'guide.md',
        sourcePath: '/tmp/guide.md',
        targetPath: '/Users/test/team/destination/guide.md'
      }
    ],
    errors: ['无法读取 a', '无法读取 b', '无法读取 c', '不会展示的第 4 个错误']
  },
  ...overrides
})

describe('FileOperationDialog', () => {
  it('describes the full impact and exposes every conflict strategy', async () => {
    const onConflictStrategyChange = vi.fn()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      <FileOperationDialog
        pending={createPending()}
        running={false}
        onConflictStrategyChange={onConflictStrategyChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    )

    const dialog = screen.getByRole('dialog', { name: '确认复制' })
    expect(dialog).toHaveAccessibleDescription(
      '将 5 个来源中的 8 项复制到 team / destination，共 1.5 KB。'
    )
    expect(screen.getByRole('group', { name: '1 个项目已存在' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '保留两者' })).toBeChecked()
    expect(screen.getByText('无法读取 a')).toBeInTheDocument()
    expect(screen.getByText('无法读取 c')).toBeInTheDocument()
    expect(screen.queryByText('不会展示的第 4 个错误')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toHaveFocus()

    await userEvent.click(screen.getByRole('radio', { name: '跳过' }))
    await userEvent.click(screen.getByRole('radio', { name: '替换' }))
    expect(onConflictStrategyChange.mock.calls).toEqual([['skip'], ['replace']])

    await userEvent.click(screen.getByRole('button', { name: '复制' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('blocks cancellation and duplicate confirmation while an operation is running', () => {
    const onCancel = vi.fn()
    render(
      <FileOperationDialog
        pending={createPending({ operation: 'cut' })}
        running
        onConflictStrategyChange={vi.fn()}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '正在移动…' })).toBeDisabled()
    fireEvent.keyDown(screen.getByRole('dialog', { name: '确认移动' }), { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('disables confirmation when every source failed preflight validation', () => {
    const pending = createPending({
      preflight: {
        targetDirectory: '/Users/test/team/destination',
        sourceCount: 2,
        itemCount: 0,
        totalBytes: 0,
        conflicts: [],
        errors: ['来源不存在', '来源不可读']
      }
    })

    render(
      <FileOperationDialog
        pending={pending}
        running={false}
        onConflictStrategyChange={vi.fn()}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制' })).toBeDisabled()
  })
})
