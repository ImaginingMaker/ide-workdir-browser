import { create } from 'zustand'

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error'

export interface NotificationAction {
  label: string
  onInvoke: () => void
}

export interface AppNotification {
  id: string
  message: string
  variant: NotificationVariant
  durationMs: number | null
  createdAt: number
  action?: NotificationAction
}

export interface NotificationInput {
  message: string
  variant?: NotificationVariant
  durationMs?: number | null
  action?: NotificationAction
}

type NotificationOptions = Omit<NotificationInput, 'message' | 'variant'>

interface NotificationStore {
  notifications: AppNotification[]
  pushNotification(input: NotificationInput): string
  dismissNotification(id: string): void
  clearNotifications(): void
}

export const DEFAULT_NOTIFICATION_DURATION_MS = 10_000
export const NOTIFICATION_EXIT_DURATION_MS = 180

let notificationSequence = 0

const nextNotificationId = (): string => {
  notificationSequence += 1
  return `notification-${Date.now()}-${notificationSequence}`
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  pushNotification(input) {
    const id = nextNotificationId()
    const notification: AppNotification = {
      id,
      message: input.message,
      variant: input.variant ?? 'info',
      durationMs:
        input.durationMs === undefined ? DEFAULT_NOTIFICATION_DURATION_MS : input.durationMs,
      createdAt: Date.now(),
      action: input.action
    }
    set((state) => ({ notifications: [...state.notifications, notification] }))
    return id
  },

  dismissNotification(id) {
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id)
    }))
  },

  clearNotifications() {
    set({ notifications: [] })
  }
}))

const showNotification = (input: NotificationInput): string =>
  useNotificationStore.getState().pushNotification(input)

const showVariant =
  (variant: NotificationVariant) =>
  (message: string, options: NotificationOptions = {}): string =>
    showNotification({ ...options, message, variant })

export const notify = {
  show: showNotification,
  info: showVariant('info'),
  success: showVariant('success'),
  warning: showVariant('warning'),
  error: showVariant('error'),
  dismiss: (id: string): void => useNotificationStore.getState().dismissNotification(id),
  clear: (): void => useNotificationStore.getState().clearNotifications()
}
