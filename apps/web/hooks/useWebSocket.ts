import { useEffect, useRef, useCallback, useState } from 'react'
import { getBackendUrl } from '@services/config/config'

interface WebSocketMessage {
  type: string
  data: any
}

type MessageListener = (event: any) => void

const useWebSocket = (accessToken: string, orgId: number) => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(null)
  const messageListenersRef = useRef<Map<string, Set<MessageListener>>>(
    new Map()
  )
  const [isConnected, setIsConnected] = useState(false)

  const getWebSocketUrl = useCallback(() => {
    // Get the backend URL (e.g., http://localhost:8000/ or https://api.example.com/)
    const backendUrl = getBackendUrl()
    // Convert http/https to ws/wss
    const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:'
    // Extract host from backend URL
    const urlObj = new URL(backendUrl)
    const host = urlObj.host
    // Build WebSocket URL pointing to the backend
    return `${wsProtocol}//${host}/api/v1/chat/ws?token=${accessToken}`
  }, [accessToken])

  // Define attemptReconnect before connect to avoid temporal dead zone
  const attemptReconnectRef = useRef<() => void>()

  const connect = useCallback(() => {
    if (!accessToken || !orgId) return

    try {
      const ws = new WebSocket(getWebSocketUrl())

      ws.onopen = () => {
        setIsConnected(true)
        reconnectAttemptRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage

          // Forward message to all registered listeners
          const listeners = messageListenersRef.current.get(message.type)
          if (listeners) {
            listeners.forEach((listener) => {
              listener({ data: message.data })
            })
          }
        } catch (error) {
          // Silently handle parse errors
        }
      }

      ws.onerror = () => {
        setIsConnected(false)
      }

      ws.onclose = () => {
        setIsConnected(false)
        attemptReconnectRef.current?.()
      }

      wsRef.current = ws
    } catch (error) {
      attemptReconnectRef.current?.()
    }
  }, [accessToken, orgId, getWebSocketUrl])

  attemptReconnectRef.current = useCallback(() => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
    const maxAttempts = 6
    const baseDelay = 1000
    const maxDelay = 30000

    if (reconnectAttemptRef.current >= maxAttempts) {
      const delay = maxDelay
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptRef.current = 0
        connect()
      }, delay)
    } else {
      const delay = Math.min(
        baseDelay * Math.pow(2, reconnectAttemptRef.current),
        maxDelay
      )
      reconnectAttemptRef.current += 1
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [connect])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
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
      const listeners = messageListenersRef.current.get(eventType)
      if (listeners) {
        listeners.delete(listener)
      }
    },
    []
  )

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    reconnectAttemptRef.current = 0
  }, [])

  // Connect on mount
  useEffect(() => {
    if (accessToken && orgId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [accessToken, orgId, connect, disconnect])

  // Periodic ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return

    const intervalId = setInterval(() => {
      sendMessage({
        type: 'ping',
        data: {},
      })
    }, 30000) // Send ping every 30 seconds

    return () => clearInterval(intervalId)
  }, [isConnected, sendMessage])

  return {
    isConnected,
    sendMessage,
    addMessageListener,
    removeMessageListener,
    disconnect,
  }
}

export default useWebSocket
