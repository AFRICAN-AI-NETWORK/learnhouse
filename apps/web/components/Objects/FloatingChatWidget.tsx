'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, X, Minus } from 'lucide-react'
import { useParams, usePathname } from 'next/navigation'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { useGlobalChat } from '@components/Contexts/GlobalChatContext'
import { getAPIUrl } from '@services/config/config'
import ConversationsList from '@components/Pages/Chat/ConversationsList'
import ChatWindow from '@components/Pages/Chat/ChatWindow'

interface Participant {
  id: number
  user_uuid: string
  username: string
  first_name?: string
  last_name?: string
  avatar_image?: string
  role_name?: string
}

interface Conversation {
  id: number
  conversation_uuid: string
  org_id: number
  participant_one_id: number
  participant_two_id: number
  last_message_at?: string
  is_archived: boolean
  created_at: string
  updated_at: string
  unread_count: number
  other_participant: Participant
  last_message?: {
    message_uuid: string
    content: string
    sender_id: number
    created_at: string
    is_deleted: boolean
  }
}

const floatingConversationListCache = new Map<number, Conversation[]>()

export default function FloatingChatWidget() {
  const { t } = useTranslation()
  const params = useParams()
  const pathname = usePathname()
  const orgslug = params?.orgslug as string
  const session = useLHSession() as any
  const org = useOrg() as any
  const { isChatOpen, toggleChat, closeChat, unreadCount } = useGlobalChat()

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map())
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const org_id = org?.id
  const access_token = session?.data?.tokens?.access_token
  const current_user_id = session?.data?.user?.id

  const { isConnected, addMessageListener, removeMessageListener } =
    useGlobalChat()

  // Load conversations when chat opens
  useEffect(() => {
    if (!org_id || !access_token || !isChatOpen) return

    const cachedConversations = floatingConversationListCache.get(org_id)
    if (cachedConversations) {
      setConversations(cachedConversations)
      setIsLoadingConversations(false)
    } else {
      setIsLoadingConversations(true)
    }

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
            setConversations(data)
            floatingConversationListCache.set(org_id, data)
          } catch (jsonError) {
            // Failed to parse conversations response - ignore silently
          }
        }
      } catch (error: any) {
        // Ignore transient load errors (including timeout/abort)
        // Chat can recover on next open/reconnect.
      } finally {
        setIsLoadingConversations(false)
      }
    }

    loadConversations()
  }, [org_id, access_token, isChatOpen])

  // Handle new messages via WebSocket
  const handleNewMessage = useCallback(
    (event: any) => {
      const data = event.data
      setConversations((prev) => {
        const updatedConversations = prev.map((conv) => {
          if (conv.conversation_uuid === data.conversation_id) {
            return {
              ...conv,
              last_message: {
                message_uuid: data.message_uuid,
                content: data.content,
                sender_id: data.sender_id,
                created_at: data.created_at,
                is_deleted: false,
              },
              last_message_at: data.created_at,
              unread_count:
                data.sender_id !== current_user_id
                  ? conv.unread_count + 1
                  : conv.unread_count,
            }
          }
          return conv
        })
        return updatedConversations.sort(
          (a, b) =>
            new Date(b.last_message_at || b.created_at).getTime() -
            new Date(a.last_message_at || a.created_at).getTime()
        )
      })
    },
    [current_user_id]
  )

  useEffect(() => {
    if (!isConnected) return

    addMessageListener('new_message', handleNewMessage)

    return () => {
      removeMessageListener('new_message', handleNewMessage)
    }
  }, [isConnected, addMessageListener, removeMessageListener, handleNewMessage])

  // Handle typing events
  const handleTyping = useCallback(
    (event: any) => {
      const data = event.data
      if (data.user_id === current_user_id) return

      setTypingUsers((prev) => {
        const newMap = new Map(prev)
        newMap.set(data.conversation_id, data.user_id)
        return newMap
      })

      const existingTimeout = typingTimeoutsRef.current.get(
        data.conversation_id
      )
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev)
          newMap.delete(data.conversation_id)
          return newMap
        })
        typingTimeoutsRef.current.delete(data.conversation_id)
      }, 3000)

      typingTimeoutsRef.current.set(data.conversation_id, timeout)
    },
    [current_user_id]
  )

  useEffect(() => {
    if (!isConnected) return

    addMessageListener('user_typing', handleTyping)

    return () => {
      removeMessageListener('user_typing', handleTyping)
    }
  }, [isConnected, addMessageListener, removeMessageListener, handleTyping])

  useEffect(() => {
    const timeouts = typingTimeoutsRef.current
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout))
      timeouts.clear()
    }
  }, [])

  const handleNewConversation = useCallback((conversation: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some(
        (conv) => conv.conversation_uuid === conversation.conversation_uuid
      )
      return exists ? prev : [conversation, ...prev]
    })
    setSelectedConversationId(conversation.conversation_uuid)
  }, [])

  const handleConversationUpdate = useCallback(
    (updatedConversation: Conversation) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversation_uuid === updatedConversation.conversation_uuid
            ? updatedConversation
            : conv
        )
      )
    },
    []
  )

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    setIsMinimized(false)
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedConversationId(null)
  }, [])

  const handleMinimize = useCallback(() => {
    setIsMinimized(true)
  }, [])

  const handleRestore = useCallback(() => {
    setIsMinimized(false)
  }, [])

  // Don't render if user is not logged in or no org
  if (!session?.data?.user || !org_id) {
    return null
  }

  // Don't render if we're already on the chat page
  const isOnChatPage = pathname?.includes('/chat')
  if (isOnChatPage) {
    return null
  }

  return (
    <>
      {/* Floating Button */}
      {(!isChatOpen || isMinimized) && (
        <button
          onClick={isMinimized ? handleRestore : toggleChat}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
          aria-label="Open chat"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[#13131a]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isChatOpen && !isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[480px] h-[600px] max-h-[80vh] bg-[#13131a] border border-white/8 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/3 border-b border-white/8">
            <div className="flex items-center gap-2">
              {selectedConversationId && (
                <button
                  onClick={handleBackToList}
                  className="shrink-0 -ml-1 p-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                  aria-label="Back to conversations"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">
                {selectedConversationId
                  ? t('chat.conversation')
                  : t('chat.messages')}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMinimize}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/6 text-white/60 hover:text-white transition-colors"
                aria-label="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={closeChat}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/6 text-white/60 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {!selectedConversationId ? (
              <ConversationsList
                conversations={conversations}
                isLoading={isLoadingConversations}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                orgslug={orgslug}
                typingUsers={typingUsers}
              />
            ) : (
              <ChatWindow
                conversationId={selectedConversationId}
                conversationData={
                  conversations.find(
                    (conv) => conv.conversation_uuid === selectedConversationId
                  ) ?? null
                }
                onBack={handleBackToList}
                onConversationUpdate={handleConversationUpdate}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
