import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppNotification } from './notification-store'
import { NotificationToast } from './NotificationToast'

const createNotification = (patch: Partial<AppNotification> = {}): AppNotification => ({
  id: 'message-1',
  message: '读取失败',
  variant: 'error',
  durationMs: 10_000,
  createdAt: Date.now(),
  ...patch
})

describe('NotificationToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('dismisses from the close icon after its exit animation', () => {
    const onDismiss = vi.fn()
    render(<NotificationToast notification={createNotification()} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: '关闭消息' }))
    expect(screen.getByRole('alert')).toHaveClass('is-closing')

    act(() => vi.advanceTimersByTime(180))
    expect(onDismiss).toHaveBeenCalledWith('message-1')
  })

  it('uses the remaining lifetime when remounted', () => {
    const onDismiss = vi.fn()
    render(
      <NotificationToast
        notification={createNotification({ createdAt: Date.now() - 8_000 })}
        onDismiss={onDismiss}
      />
    )

    act(() => vi.advanceTimersByTime(1_999))
    expect(screen.getByRole('alert')).not.toHaveClass('is-closing')

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('alert')).toHaveClass('is-closing')
  })

  it('invokes an optional action and closes the message', () => {
    const onDismiss = vi.fn()
    const onInvoke = vi.fn()
    render(
      <NotificationToast
        notification={createNotification({
          variant: 'success',
          action: { label: '撤销', onInvoke }
        })}
        onDismiss={onDismiss}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    expect(onInvoke).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveClass('is-closing')
  })
})
