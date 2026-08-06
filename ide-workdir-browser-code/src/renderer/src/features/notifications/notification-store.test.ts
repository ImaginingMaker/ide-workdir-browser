import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notify, useNotificationStore } from './notification-store'

describe('notification store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notify.clear()
  })

  it('queues repeated messages with unique identities', () => {
    const firstId = notify.error('读取失败')
    const secondId = notify.error('读取失败')

    expect(firstId).not.toBe(secondId)
    expect(useNotificationStore.getState().notifications).toHaveLength(2)
  })

  it('preserves variant, duration and action metadata', () => {
    const onInvoke = vi.fn()
    const id = notify.success('已复制', {
      durationMs: null,
      action: { label: '撤销', onInvoke }
    })

    expect(useNotificationStore.getState().notifications).toEqual([
      expect.objectContaining({
        id,
        message: '已复制',
        variant: 'success',
        durationMs: null,
        action: { label: '撤销', onInvoke }
      })
    ])
  })

  it('dismisses one message without affecting the rest of the queue', () => {
    const firstId = notify.info('第一条')
    const secondId = notify.warning('第二条')

    notify.dismiss(firstId)

    expect(useNotificationStore.getState().notifications.map(({ id }) => id)).toEqual([secondId])
  })
})
