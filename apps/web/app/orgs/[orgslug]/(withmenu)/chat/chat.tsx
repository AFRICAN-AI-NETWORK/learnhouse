'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'
import ConversationsList from '@components/Pages/Chat/ConversationsList'
import ChatWindow from '@components/Pages/Chat/ChatWindow'
import { useParams } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import useWebSocket from '@/hooks/useWebSocket'

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
  other_participant: {
    id: number
    user_uuid: string
    username: string
    first_name?: string
    last_name?: string
    avatar_image?: string
  }
  last_message?: {
    message_uuid: string
    content: string
    sender_id: number
    created_at: string
    is_deleted: boolean
  }
}

function ChatClient() {
  const { t } = useTranslation()
  const params = useParams()
  const orgslug = params?.orgslug as string
  const session = useLHSession() as any
  const org = useOrg() as any
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map())
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const org_id = org?.id
  const access_token = session?.data?.tokens?.access_token
  const current_user_id = session?.data?.user?.id

  const { isConnected, addMessageListener, removeMessageListener } =
    useWebSocket(access_token, org_id)

  useEffect(() => {
    if (!org_id || !session?.data?.tokens?.access_token) return

    const loadConversations = async () => {
      try {
        setIsLoadingConversations(true)
        const response = await fetch(
          `${getAPIUrl()}chat/conversations/?org_id=${org_id}`,
          {
            headers: {
              Authorization: `Bearer ${session.data.tokens.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          setConversations(data)
        }
      } catch (error) {
        // Error loading conversations
      } finally {
        setIsLoadingConversations(false)
      }
    }

    loadConversations()
  }, [org_id, session?.data?.tokens?.access_token])

  const handleConversationSelect = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    // Reset unread count when selecting a conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.conversation_uuid === conversationId
          ? { ...conv, unread_count: 0 }
          : conv
      )
    )
  }, [])

  const handleNewConversation = useCallback((newConversation: Conversation) => {
    setConversations((prev) => [newConversation, ...prev])
    setSelectedConversationId(newConversation.conversation_uuid)
  }, [])

  const handleConversationUpdate = useCallback(
    (updatedConversation: Conversation) => {
      setConversations((prev) =>
        prev
          .map((conv) =>
            conv.conversation_uuid === updatedConversation.conversation_uuid
              ? updatedConversation
              : conv
          )
          .sort((a, b) => {
            const aTime = new Date(a.last_message_at || a.created_at).getTime()
            const bTime = new Date(b.last_message_at || b.created_at).getTime()
            return bTime - aTime
          })
      )
    },
    []
  )

  // Handle new messages for all conversations
  const handleGlobalNewMessage = useCallback(
    (event: any) => {
      const data = event.data
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.conversation_uuid === data.conversation_id) {
            // Increment unread_count if message is from another user and conversation is not selected
            const isFromOtherUser = data.sender_id !== current_user_id
            const shouldIncrementUnread =
              isFromOtherUser && selectedConversationId !== data.conversation_id

            const newUnreadCount = shouldIncrementUnread
              ? conv.unread_count + 1
              : conv.unread_count

            return {
              ...conv,
              last_message_at: data.created_at,
              last_message: {
                message_uuid: data.message_uuid,
                content: data.content,
                sender_id: data.sender_id,
                created_at: data.created_at,
                is_deleted: false,
              },
              unread_count: newUnreadCount,
            }
          }
          return conv
        })
        // Sort by last message time
        return updated.sort((a, b) => {
          const aTime = new Date(a.last_message_at || a.created_at).getTime()
          const bTime = new Date(b.last_message_at || b.created_at).getTime()
          return bTime - aTime
        })
      })

      // Clear typing indicator for this conversation
      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.delete(data.conversation_id)
        return next
      })
    },
    [current_user_id, selectedConversationId]
  )

  // Handle message edits
  const handleGlobalMessageEdited = useCallback((event: any) => {
    const data = event.data
    setConversations((prev) =>
      prev.map((conv) => {
        if (
          conv.last_message &&
          conv.last_message.message_uuid === data.message_uuid
        ) {
          const lastMsg = conv.last_message
          return {
            ...conv,
            last_message: {
              message_uuid: lastMsg.message_uuid,
              content: data.content,
              sender_id: lastMsg.sender_id,
              created_at: lastMsg.created_at,
              is_deleted: lastMsg.is_deleted,
            },
          }
        }
        return conv
      })
    )
  }, [])

  // Handle message deletes
  const handleGlobalMessageDeleted = useCallback((event: any) => {
    const data = event.data
    setConversations((prev) =>
      prev.map((conv) => {
        if (
          conv.last_message &&
          conv.last_message.message_uuid === data.message_uuid
        ) {
          const lastMsg = conv.last_message
          return {
            ...conv,
            last_message: {
              message_uuid: lastMsg.message_uuid,
              content: lastMsg.content,
              sender_id: lastMsg.sender_id,
              created_at: lastMsg.created_at,
              is_deleted: true,
            },
          }
        }
        return conv
      })
    )
  }, [])

  // Handle typing indicators
  const handleUserTyping = useCallback(
    (event: any) => {
      const data = event.data
      // Ignore own typing
      if (data.user_id === current_user_id) return

      if (data.is_typing) {
        setTypingUsers((prev) => {
          const next = new Map(prev)
          next.set(data.conversation_uuid, data.user_id)
          return next
        })

        // Clear existing timeout
        const existingTimeout = typingTimeoutsRef.current.get(
          data.conversation_uuid
        )
        if (existingTimeout) clearTimeout(existingTimeout)

        // Set timeout to clear typing indicator
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev)
            next.delete(data.conversation_uuid)
            return next
          })
          typingTimeoutsRef.current.delete(data.conversation_uuid)
        }, 5000)

        typingTimeoutsRef.current.set(data.conversation_uuid, timeout)
      } else {
        // User stopped typing
        setTypingUsers((prev) => {
          const next = new Map(prev)
          next.delete(data.conversation_uuid)
          return next
        })

        const timeout = typingTimeoutsRef.current.get(data.conversation_uuid)
        if (timeout) {
          clearTimeout(timeout)
          typingTimeoutsRef.current.delete(data.conversation_uuid)
        }
      }
    },
    [current_user_id]
  )

  // Handle message read events to update unread count
  const handleMessageRead = useCallback(
    (event: any) => {
      const data = event.data
      // Update unread count when messages are read
      setConversations((prev) =>
        prev.map((conv) => {
          // Reset unread count to 0 when we receive a read receipt for our conversation
          // This happens when the user opens a conversation and reads messages
          if (conv.conversation_uuid === selectedConversationId) {
            return {
              ...conv,
              unread_count: 0,
            }
          }
          return conv
        })
      )
    },
    [selectedConversationId]
  )

  // Register WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return

    addMessageListener('new_message', handleGlobalNewMessage)
    addMessageListener('message_edited', handleGlobalMessageEdited)
    addMessageListener('message_deleted', handleGlobalMessageDeleted)
    addMessageListener('user_typing', handleUserTyping)
    addMessageListener('message_read', handleMessageRead)

    return () => {
      removeMessageListener('new_message', handleGlobalNewMessage)
      removeMessageListener('message_edited', handleGlobalMessageEdited)
      removeMessageListener('message_deleted', handleGlobalMessageDeleted)
      removeMessageListener('user_typing', handleUserTyping)
      removeMessageListener('message_read', handleMessageRead)
    }
  }, [
    isConnected,
    addMessageListener,
    removeMessageListener,
    handleGlobalNewMessage,
    handleGlobalMessageEdited,
    handleGlobalMessageDeleted,
    handleUserTyping,
    handleMessageRead,
  ])

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = typingTimeoutsRef.current
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout))
      timeouts.clear()
    }
  }, [])

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0f0f13]">
      {/* Sidebar */}
      <div
        className={`${
          selectedConversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-[320px] lg:w-[360px] flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#13131a]`}
      >
        <ConversationsList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleConversationSelect}
          onNewConversation={handleNewConversation}
          isLoading={isLoadingConversations}
          orgslug={orgslug}
          typingUsers={typingUsers}
        />
      </div>

      {/* Main Chat Area */}
      <div
        className={`${
          selectedConversationId ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col overflow-hidden`}
      >
        {selectedConversationId ? (
          <ChatWindow
            conversationId={selectedConversationId}
            onConversationUpdate={handleConversationUpdate}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <MessageSquare size={28} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-white/70 font-medium text-base">
                {t('chat.select_user')}
              </p>
              <p className="text-white/30 text-sm mt-1">
                Choose a conversation from the sidebar to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatClient
