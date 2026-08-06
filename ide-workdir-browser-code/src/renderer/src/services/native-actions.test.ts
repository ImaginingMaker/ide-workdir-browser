import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkdirApi } from '@shared/contracts'
import { notify, useNotificationStore } from '../features/notifications/notification-store'
import {
  copyPathToClipboard,
  openPathExternally,
  performNativeTextEdit,
  revealPathInFinder
} from './native-actions'

describe('native actions', () => {
  const workdir = {
    revealInFinder: vi.fn(),
    openExternal: vi.fn(),
    copyText: vi.fn(),
    performTextEdit: vi.fn()
  } as unknown as WorkdirApi

  beforeEach(() => {
    vi.clearAllMocks()
    notify.clear()
    Object.defineProperty(window, 'workdir', { configurable: true, value: workdir })
  })

  it('normalizes file action failures without rejecting callers', async () => {
    vi.mocked(workdir.revealInFinder).mockRejectedValueOnce(new Error('EACCES'))
    vi.mocked(workdir.openExternal).mockRejectedValueOnce(new Error('ENOENT'))

    await expect(revealPathInFinder('codex', '/workspace/file')).resolves.toBe(false)
    await expect(openPathExternally('codex', '/workspace/file')).resolves.toBe(false)

    expect(useNotificationStore.getState().notifications).toHaveLength(2)
    expect(useNotificationStore.getState().notifications[0]).toMatchObject({ variant: 'error' })
  })

  it('reports successful path copies and handles native text edit failures', async () => {
    vi.mocked(workdir.copyText).mockResolvedValueOnce(undefined)
    vi.mocked(workdir.performTextEdit).mockRejectedValueOnce(new Error('unavailable'))

    await expect(copyPathToClipboard('/workspace/file')).resolves.toBe(true)
    await expect(performNativeTextEdit('paste')).resolves.toBe(false)

    expect(useNotificationStore.getState().notifications.map(({ variant }) => variant)).toEqual([
      'success',
      'error'
    ])
  })
})
