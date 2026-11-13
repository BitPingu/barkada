import { useCallback, useEffect, useRef, useState } from 'react'

// Defines the notification data managed by the hook.
type QueuedNotification = {
  id: number
  message: string
  displayDuration: number
}

function useNotifications() {
  // Stores notifications waiting to be displayed or currently visible.
  const [notifications, setNotifications] = useState<QueuedNotification[]>([])

  // Generates unique IDs for notifications.
  const notificationId = useRef(0)

  // Tracks timers for scheduled notifications.
  const scheduledTimeouts = useRef(new Map<number, number>())

  // Tracks expiration timers for visible notifications.
  const notificationTimeouts = useRef(new Map<number, number>())

  // Add a notification to the queue when its scheduled start time arrives.
  const addNotification = useCallback(
    (message: string, startAt: number, expiresAt: number) => {
      const displayDuration = expiresAt - startAt

      // Ignore notifications with an invalid display duration.
      if (displayDuration <= 0) return

      const id = ++notificationId.current
      const notification = { id, message, displayDuration }

      // Add immediately if the scheduled start time has arrived.
      if (startAt <= Date.now()) {
        setNotifications((current) => [...current, notification])
        return
      }

      // Schedule the notification to enter the queue at its start time.
      const timeout = window.setTimeout(() => {
        scheduledTimeouts.current.delete(id)
        setNotifications((current) => [...current, notification])
      }, startAt - Date.now())

      scheduledTimeouts.current.set(id, timeout)
    },
    [],
  )

  // Clear notifications and their pending timers.
  const clearNotifications = useCallback(() => {
    scheduledTimeouts.current.forEach((timeout) => {
      window.clearTimeout(timeout)
    })

    notificationTimeouts.current.forEach((timeout) => {
      window.clearTimeout(timeout)
    })

    scheduledTimeouts.current.clear()
    notificationTimeouts.current.clear()
    setNotifications([])
  }, [])

  // Remove notifications after their visible display duration expires.
  useEffect(() => {
    notifications.slice(0, 3).forEach(({ id, displayDuration }) => {
      // Don't start another timer for an already visible notification.
      if (notificationTimeouts.current.has(id)) return

      const timeout = window.setTimeout(() => {
        // Ignore callbacks for timers that have already been cleared.
        if (!notificationTimeouts.current.has(id)) return

        setNotifications((current) =>
          current.filter((notification) => notification.id !== id),
        )

        notificationTimeouts.current.delete(id)
      }, displayDuration)

      notificationTimeouts.current.set(id, timeout)
    })
  }, [notifications])

  // Clear remaining notification timers when the hook unmounts.
  useEffect(() => {
    const scheduled = scheduledTimeouts.current
    const active = notificationTimeouts.current

    return () => {
      scheduled.forEach((timeout) => {
        window.clearTimeout(timeout)
      })

      active.forEach((timeout) => {
        window.clearTimeout(timeout)
      })

      scheduled.clear()
      active.clear()
    }
  }, [])

  return {
    notifications,
    addNotification,
    clearNotifications,
  }
}

export default useNotifications
