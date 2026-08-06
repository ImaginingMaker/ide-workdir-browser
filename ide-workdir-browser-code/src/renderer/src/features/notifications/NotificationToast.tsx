import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Icon, type IconName } from '../../components/ui/Icon'
import {
  NOTIFICATION_EXIT_DURATION_MS,
  type AppNotification,
  type NotificationVariant
} from './notification-store'

const variantIcons: Record<NotificationVariant, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'triangle-alert',
  error: 'circle-alert'
}

interface NotificationStyle extends CSSProperties {
  '--notification-duration'?: string
  '--notification-delay'?: string
  '--notification-exit-duration': string
}

interface NotificationToastProps {
  notification: AppNotification
  onDismiss: (id: string) => void
}

export const NotificationToast = ({
  notification,
  onDismiss
}: NotificationToastProps): React.JSX.Element => {
  const [isClosing, setIsClosing] = useState(false)
  const [elapsedMs] = useState(() => Math.max(0, Date.now() - notification.createdAt))
  const closingRef = useRef(false)
  const remainingMs =
    notification.durationMs === null ? null : Math.max(0, notification.durationMs - elapsedMs)
  const style: NotificationStyle = {
    '--notification-duration':
      notification.durationMs === null ? undefined : `${notification.durationMs}ms`,
    '--notification-delay':
      notification.durationMs === null
        ? undefined
        : `-${Math.min(elapsedMs, notification.durationMs)}ms`,
    '--notification-exit-duration': `${NOTIFICATION_EXIT_DURATION_MS}ms`
  }

  const beginDismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setIsClosing(true)
  }, [])

  useEffect(() => {
    if (remainingMs === null) return undefined
    const timer = window.setTimeout(beginDismiss, remainingMs)
    return () => window.clearTimeout(timer)
  }, [beginDismiss, remainingMs])

  useEffect(() => {
    if (!isClosing) return undefined
    const timer = window.setTimeout(() => onDismiss(notification.id), NOTIFICATION_EXIT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [isClosing, notification.id, onDismiss])

  const invokeAction = (): void => {
    notification.action?.onInvoke()
    beginDismiss()
  }

  const isUrgent = notification.variant === 'error' || notification.variant === 'warning'

  return (
    <article
      className={`notification-toast notification-toast--${notification.variant} ${
        isClosing ? 'is-closing' : ''
      }`}
      role={isUrgent ? 'alert' : 'status'}
      style={style}
    >
      <span className="notification-toast__icon">
        <Icon name={variantIcons[notification.variant]} size={17} />
      </span>
      <span className="notification-toast__message">{notification.message}</span>
      {notification.action && (
        <button type="button" className="notification-toast__action" onClick={invokeAction}>
          {notification.action.label}
        </button>
      )}
      <button
        type="button"
        className="notification-toast__close"
        aria-label="关闭消息"
        onClick={beginDismiss}
      >
        <Icon name="x" size={15} />
      </button>
      {notification.durationMs !== null && (
        <span className="notification-toast__countdown" aria-hidden="true" />
      )}
    </article>
  )
}
