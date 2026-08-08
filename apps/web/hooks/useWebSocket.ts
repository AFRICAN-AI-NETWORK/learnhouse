import { useEffect, useRef, useCallback, useState } from 'react'
import { getBackendUrl } from '@services/config/config'
import { getConnectionStatus, subscribe } from '@/lib/offline/connection'
import { CONNECTION_STATUS } from '@/lib/offline/constants'

interface WebSocketMessage {
  type: string
  data: any
}

type MessageListener = (event: any) => void

interface UseWebSocketOptions {
  autoConnect?: boolean
}

const useWebSocket = (
  accessToken: string,
  orgId: number,
  options: UseWebSocketOptions = { autoConnect: true }
) => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(null)
  const messageListenersRef = useRef<Map<string, Set<MessageListener>>>(
    new Map()
  )
  const [isConnected, setIsConnected] = useState(false)

  // Use a ref for connect so attemptReconnect always calls the latest version
  const connectRef = useRef<() => Promise<void>>(async () => {})

  const getWebSocketUrl = useCallback((ticket: string) => {
    const backendUrl = getBackendUrl()
    const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:'
    const urlObj = new URL(backendUrl)
    const host = urlObj.host
    // Use ticket  backend requires ticket-based WS auth
    return `${wsProtocol}//${host}/api/v1/chat/ws?ticket=${ticket}`
  }, [])

  const getWebSocketTicket = useCallback(async (): Promise<string | null> => {
    if (!accessToken) return null

    try {
      const backendUrl = getBackendUrl()
      const response = await fetch(`${backendUrl}api/v1/chat/ws/ticket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        // Failed to get WebSocket ticket
        return null
      }

      // Safely parse JSON response
      const text = await response.text()
      try {
        const data = JSON.parse(text)
        return data.ticket ?? null
      } catch (jsonError) {
        // Failed to parse ticket response
        return null
      }
    } catch (error) {
      // Error getting WebSocket ticket
      return null
    }
  }, [accessToken])

  // attemptReconnect reads connectRef.current so it always has the latest connect
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    // Stop the backoff loop entirely while offline — a WebSocket handshake cannot
    // succeed without a network, and retrying burns battery and floods logs. The
    // `online` subscription below resumes it (plan Layer 5B.14).
    if (getConnectionStatus() === CONNECTION_STATUS.OFFLINE) {
      return
    }

    const baseDelay = 1000
    const maxDelay = 30000
    const maxAttempts = 6

    const attempt = reconnectAttemptRef.current
    const delay =
      attempt >= maxAttempts
        ? maxDelay
        : Math.min(baseDelay * Math.pow(2, attempt), maxDelay)

    // Reconnecting WebSocket

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptRef.current =
        attempt < maxAttempts ? attempt + 1 : attempt
      connectRef.current()
    }, delay)
  }, []) // no deps needed — reads ref at call time

  const connect = useCallback(async () => {
    if (!accessToken || !orgId) return

    // Avoid opening duplicate connections
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    try {
      // Exchange JWT for a short-lived ticket (expires in 30s, single-use)
      const ticket = await getWebSocketTicket()
      if (!ticket) {
        // Failed to obtain WebSocket ticket
        attemptReconnect()
        return
      }

      //  Connect using the ticket — NOT the raw JWT token
      const ws = new WebSocket(getWebSocketUrl(ticket))

      ws.onopen = () => {
        // WebSocket connected
        setIsConnected(true)
        reconnectAttemptRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage

          if (message.type === 'connection_established') {
            // WebSocket connection confirmed
          }

          const listeners = messageListenersRef.current.get(message.type)
          if (listeners) {
            listeners.forEach((listener) => listener({ data: message.data }))
          }
        } catch (error) {
          // Error parsing WebSocket message
        }
      }

      ws.onerror = () => {
        // WebSocket error
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        // WebSocket disconnected
        setIsConnected(false)
        wsRef.current = null
        // Only reconnect if not a deliberate close (code 1000)
        if (event.code !== 1000) {
          attemptReconnect()
        }
      }

      wsRef.current = ws
    } catch (error) {
      // WebSocket connection failed
      attemptReconnect()
    }
  }, [
    accessToken,
    orgId,
    getWebSocketUrl,
    getWebSocketTicket,
    attemptReconnect,
  ])

  // Keep connectRef in sync with the latest connect function
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
    // Else: not connected, message dropped
  }, [])

  const addMessageListener = useCallback(
    (eventType: string, listener: MessageListener) => {
      if (!messageListenersRef.current.has(eventType)) {
        messageListenersRef.current.set(eventType, new Set())
      }
      messageListenersRef.current.get(eventType)!.add(listener)
    },
    []
  )

  const removeMessageListener = useCallback(
    (eventType: string, listener: MessageListener) => {
      messageListenersRef.current.get(eventType)?.delete(listener)
    },
    []
  )

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      // Code 1000 = normal closure, suppresses auto-reconnect
      wsRef.current.close(1000, 'Intentional disconnect')
      wsRef.current = null
    }
    setIsConnected(false)
    reconnectAttemptRef.current = 0
  }, [])

  // Connect on mount / when credentials change (only if autoConnect is true)
  useEffect(() => {
    if (accessToken && orgId && options.autoConnect) {
      connect()
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, orgId, options.autoConnect]) // intentionally omitting connect/disconnect to avoid re-running on every render

  // Resume connecting as soon as connectivity returns, since `attemptReconnect`
  // deliberately stops scheduling retries while offline.
  useEffect(() => {
    if (!accessToken || !orgId || !options.autoConnect) return

    return subscribe((status) => {
      if (status === CONNECTION_STATUS.ONLINE && !wsRef.current) {
        reconnectAttemptRef.current = 0
        void connectRef.current()
      }
    })
  }, [accessToken, orgId, options.autoConnect])

  // Periodic ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return

    const intervalId = setInterval(() => {
      sendMessage({ type: 'ping', data: {} })
    }, 30000)

    return () => clearInterval(intervalId)
  }, [isConnected, sendMessage])

  return {
    isConnected,
    sendMessage,
    addMessageListener,
    removeMessageListener,
    disconnect,
    connect, // Expose connect for manual triggering
  }
}

export default useWebSocket
