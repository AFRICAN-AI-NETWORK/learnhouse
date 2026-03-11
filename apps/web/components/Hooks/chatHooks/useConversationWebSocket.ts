/**
 * Hook for WebSocket operations in conversations
 * Handles new messages and typing indicators
 */

import { useCallback } from 'react'

interface UseConversationWebSocketProps {
  isConnected: boolean
  addMessageListener: (event: string, callback: (data: any) => void) => void
  removeMessageListener: (event: string, callback: (data: any) => void) => void
  currentUserId: number | undefined
}

export const useConversationWebSocket = ({
  isConnected,
  addMessageListener,
  removeMessageListener,
  currentUserId,
}: UseConversationWebSocketProps) => {
  /**
   * Handle new message from WebSocket
   * Updates conversation list with new message
   */
  const handleNewMessage = useCallback((onNewMessage: (data: any) => void) => {
    return (event: any) => {
      const data = event.data
      onNewMessage(data)
    }
  }, [])

  /**
   * Handle typing indicator from WebSocket
   */
  const handleTyping = useCallback(
    (onTyping: (userId: number, conversationId: string) => void) => {
      return (event: any) => {
        const data = event.data
        if (data.user_id === currentUserId) return
        onTyping(data.user_id, data.conversation_id)
      }
    },
    [currentUserId]
  )

  /**
   * Setup WebSocket listeners for messages
   */
  const setupMessageListener = useCallback(
    (onNewMessage: (data: any) => void) => {
      if (!isConnected) return

      const handler = handleNewMessage(onNewMessage)
      addMessageListener('new_message', handler)

      return () => {
        removeMessageListener('new_message', handler)
      }
    },
    [isConnected, addMessageListener, removeMessageListener, handleNewMessage]
  )

  /**
   * Setup WebSocket listeners for typing
   */
  const setupTypingListener = useCallback(
    (onTyping: (userId: number, conversationId: string) => void) => {
      if (!isConnected) return

      const handler = handleTyping(onTyping)
      addMessageListener('typing', handler)

      return () => {
        removeMessageListener('typing', handler)
      }
    },
    [isConnected, addMessageListener, removeMessageListener, handleTyping]
  )

  return {
    handleNewMessage,
    handleTyping,
    setupMessageListener,
    setupTypingListener,
  }
}
