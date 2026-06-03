export type BookingRealtimeEvent = {
  type: string
  bookingId?: string | null
  status?: string | null
  customerName?: string | null
  tourName?: string | null
  cancellationReason?: string | null
  occurredAt?: string | null
}

const getRealtimeUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api/'
  const url = new URL(apiBaseUrl, window.location.origin)
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${url.host}/ws/realtime`
}

export const subscribeBookingRealtime = (onEvent: (event: BookingRealtimeEvent) => void) => {
  let closedByCaller = false
  let retryTimer: number | undefined
  let socket: WebSocket | undefined

  const connect = () => {
    socket = new WebSocket(getRealtimeUrl())

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as BookingRealtimeEvent
        if (event.type && event.type !== 'CONNECTED') {
          onEvent(event)
        }
      } catch {
        // Ignore malformed realtime messages.
      }
    }

    socket.onclose = () => {
      if (!closedByCaller) {
        retryTimer = window.setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return () => {
    closedByCaller = true
    if (retryTimer) window.clearTimeout(retryTimer)
    socket?.close()
  }
}
