'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
} from 'react'
import { mutate as mutateSWR } from 'swr'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import useWebSocket from '@/hooks/useWebSocket'
import { useNotifications } from '@/hooks/useNotifications'
import { getAPIUrl } from '@services/config/config'
import { NOTIFICATIONS_SWR_KEY } from '@services/notifications/notificationAPI'
import { ActivityNotificationEvent } from '@/types/notifications'

interface GlobalChatContextType {
  isConnected: boolean
  isChatOpen: boolean
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  unreadCount: number
  sendMessage: (message: any) => void
  addMessageListener: (type: string, listener: any) => void
  removeMessageListener: (type: string, listener: any) => void
}

const GlobalChatContext = createContext<GlobalChatContextType | undefined>(
  undefined
)

interface Conversation {
  conversation_uuid: string
  other_participant: {
    id: number
    username: string
    first_name?: string
    last_name?: string
  }
}

interface GlobalChatProviderProps {
  children: React.ReactNode
}

export const GlobalChatProvider: React.FC<GlobalChatProviderProps> = ({
  children,
}) => {
  const session = useLHSession() as any
  const org = useOrg() as any
  const {
    showMessageNotification,
    showActivityNotificationToast,
    windowFocused,
  } = useNotifications()
  const conversationsRef = useRef<Map<string, Conversation>>(new Map())

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const access_token = session?.data?.tokens?.access_token
  const org_id = org?.id
  const current_user_id = session?.data?.user?.id

  const {
    isConnected,
    sendMessage,
    addMessageListener,
    removeMessageListener,
  } = useWebSocket(access_token, org_id)

  const openChat = useCallback(() => {
    setUnreadCount(0)
    setIsChatOpen(true)
  }, [])
  const closeChat = useCallback(() => setIsChatOpen(false), [])
  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev
      if (next) {
        setUnreadCount(0)
      }
      return next
    })
  }, [])

  // Load conversations to get participant names
  useEffect(() => {
    if (!org_id || !access_token) return

    const loadConversations = async () => {
      try {
        // Add timeout for fetch request (10 seconds)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(
          `${getAPIUrl()}chat/conversations/?org_id=${org_id}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        )

        clearTimeout(timeoutId)

        if (response.ok) {
          const text = await response.text()
          try {
            const data = JSON.parse(text)
            const conversationsMap = new Map<string, Conversation>()
            data.forEach((conv: Conversation) => {
              conversationsMap.set(conv.conversation_uuid, conv)
            })
            conversationsRef.current = conversationsMap
          } catch (jsonError) {
            // Failed to parse conversations response - ignore silently
          }
        }
      } catch (error) {
        // Error loading conversations (including timeout/abort) - ignore silently
      }
    }

    loadConversations()
  }, [org_id, access_token])

  // Handle incoming messages globally
  const handleGlobalMessage = useCallback(
    (event: any) => {
      const data = event.data

      // Only show notification for messages not sent by current user
      if (data.sender_id === current_user_id) return

      // Get sender name from conversations map
      let senderName = `User ${data.sender_id}`
      const conversation = conversationsRef.current.get(data.conversation_id)

      if (conversation?.other_participant) {
        const participant = conversation.other_participant
        if (participant.first_name) {
          senderName = participant.last_name
            ? `${participant.first_name} ${participant.last_name}`
            : participant.first_name
        } else {
          senderName = participant.username
        }
      }

      const messagePreview = (data.content || '').substring(0, 100)

      // Always show notification for new messages
      showMessageNotification(senderName, messagePreview, {
        conversationId: data.conversation_id,
        userId: data.sender_id,
        playSound: true,
        showDesktop: !windowFocused,
      })

      // Increment unread count if chat is closed
      if (!isChatOpen) {
        setUnreadCount((prev) => prev + 1)
      }
    },
    [current_user_id, showMessageNotification, windowFocused, isChatOpen]
  )

  // Handle incoming activity notifications (assignment reviewed, retake
  // requested, new chapter/activity, app update) pushed over the same
  // WebSocket connection as chat — see notification_service._push_in_app.
  const handleActivityNotification = useCallback(
    (event: { data: ActivityNotificationEvent }) => {
      const notification = event.data

      showActivityNotificationToast(notification, {
        showDesktop: !windowFocused,
      })

      // The WS payload is a real-time nudge, not the source of truth for
      // list/read state (it has no `id`/`is_read`) — revalidate the SWR
      // cache so every mounted NotificationBell refetches the real row.
      if (access_token) {
        mutateSWR(NOTIFICATIONS_SWR_KEY(access_token))
      }
    },
    [access_token, showActivityNotificationToast, windowFocused]
  )

  // Register global message listeners
  useEffect(() => {
    if (!isConnected) return

    addMessageListener('new_message', handleGlobalMessage)
    addMessageListener('activity_notification', handleActivityNotification)

    return () => {
      removeMessageListener('new_message', handleGlobalMessage)
      removeMessageListener('activity_notification', handleActivityNotification)
    }
  }, [
    isConnected,
    addMessageListener,
    removeMessageListener,
    handleGlobalMessage,
    handleActivityNotification,
  ])

  return (
    <GlobalChatContext.Provider
      value={{
        isConnected,
        isChatOpen,
        openChat,
        closeChat,
        toggleChat,
        unreadCount,
        sendMessage,
        addMessageListener,
        removeMessageListener,
      }}
    >
      {children}
    </GlobalChatContext.Provider>
  )
}

export const useGlobalChat = () => {
  const context = useContext(GlobalChatContext)
  if (!context) {
    throw new Error('useGlobalChat must be used within GlobalChatProvider')
  }
  return context
}
