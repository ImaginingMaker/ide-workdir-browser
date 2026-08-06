import { useNotificationStore } from './notification-store'
import { NotificationToast } from './NotificationToast'

export const NotificationHost = (): React.JSX.Element => {
  const notifications = useNotificationStore((state) => state.notifications)
  const dismissNotification = useNotificationStore((state) => state.dismissNotification)

  return (
    <div className="notification-host" aria-hidden={notifications.length === 0}>
      <section className="notification-stack" aria-label="操作消息">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={dismissNotification}
          />
        ))}
      </section>
    </div>
  )
}
