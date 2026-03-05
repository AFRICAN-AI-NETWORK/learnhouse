'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Send,
  Loader2,
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
} from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'
import useWebSocket from '@/hooks/useWebSocket'

interface Message {
  id: number
  message_uuid: string
  conversation_id: string
  sender_id: number
  receiver_id: number
  content: string
  message_type: string
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  attachments: any[]
  clientId?: string
  isPending?: boolean // Flag for optimistic message not yet confirmed
  read_receipt?: {
    delivered_at: string
    read_at?: string
  }
}

interface ParticipantUser {
  id: number
  user_uuid: string
  username: string
  first_name?: string
  last_name?: string
  avatar_image?: string
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
  other_participant: ParticipantUser
}

interface ChatWindowProps {
  conversationId: string
  onConversationUpdate: (conversation: Conversation) => void
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  onConversationUpdate,
}) => {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [sendError, setError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const access_token = session?.data?.tokens?.access_token
  const org_id = org?.id
  const current_user_id = session?.data?.user?.id

  // Use refs for values needed in WebSocket handlers to avoid recreating handlers
  const conversationIdRef = useRef(conversationId)
  const currentUserIdRef = useRef(current_user_id)

  // Update refs when values change
  useEffect(() => {
    conversationIdRef.current = conversationId
    currentUserIdRef.current = current_user_id
  }, [conversationId, current_user_id])

  // WebSocket connection
  const {
    isConnected,
    sendMessage: sendWebSocketMessage,
    addMessageListener,
    removeMessageListener,
  } = useWebSocket(access_token, org_id)

  // Load conversation details
  useEffect(() => {
    if (!org_id || !access_token || !conversationId) return

    const loadConversation = async () => {
      try {
        setIsLoadingMessages(true)
        const response = await fetch(
          `${getAPIUrl()}chat/conversations/?org_id=${org_id}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          const conv = data.find(
            (c: Conversation) => c.conversation_uuid === conversationId
          )
          if (conv) {
            setConversation(conv)
            onConversationUpdate(conv)
          }
        }
      } catch (error) {
        console.error('Failed to load conversation:', error)
      }
    }

    loadConversation()
  }, [org_id, access_token, conversationId, onConversationUpdate])

  // Load messages
  useEffect(() => {
    if (!access_token || !conversationId) return

    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true)
        const response = await fetch(
          `${getAPIUrl()}chat/messages/conversation/${conversationId}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          setMessages(data.reverse())

          // Mark unread messages as read
          data.forEach((msg: Message) => {
            if (
              msg.receiver_id === current_user_id &&
              !msg.read_receipt?.read_at
            ) {
              markMessageAsRead(msg.message_uuid)
            }
          })
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
      } finally {
        setIsLoadingMessages(false)
      }
    }

    loadMessages()
  }, [access_token, conversationId, current_user_id])

  const handleNewMessage = useCallback(
    (event: any) => {
      const data = event.data

      console.log('[Chat] handleNewMessage called:', {
        messageUuid: data.message_uuid,
        senderId: data.sender_id,
        incomingConversationId: data.conversation_id,
        currentConversationId: conversationIdRef.current,
        matches: data.conversation_id === conversationIdRef.current,
      })

      // Check if message belongs to current conversation
      if (data.conversation_id !== conversationIdRef.current) {
        console.log('[Chat] Ignoring message - not in current conversation')
        return
      }

      const confirmedMessage: Message = {
        id: data.id || 0,
        message_uuid: data.message_uuid,
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id || 0,
        content: data.content,
        message_type: data.message_type || 'text',
        is_edited: data.is_edited || false,
        is_deleted: data.is_deleted || false,
        created_at: data.created_at,
        updated_at: data.created_at,
        attachments: data.attachments || [],
        isPending: false,
        read_receipt: {
          delivered_at: data.created_at,
          read_at: undefined,
        },
      }

      // Optimistic update: Replace pending message or add new message
      setMessages((prev) => {
        // Check if this is a confirmation of an optimistic message
        const optimisticIndex = prev.findIndex(
          (msg) =>
            msg.isPending &&
            msg.sender_id === data.sender_id &&
            msg.content === data.content &&
            Math.abs(
              new Date(msg.created_at).getTime() -
                new Date(data.created_at).getTime()
            ) < 5000
        )

        if (optimisticIndex !== -1) {
          // Replace optimistic message with confirmed one
          console.log('[Chat] Replacing optimistic message with confirmed:', {
            optimisticId: prev[optimisticIndex].message_uuid,
            confirmedId: confirmedMessage.message_uuid,
          })
          const updated = [...prev]
          updated[optimisticIndex] = confirmedMessage
          return updated
        }

        // Check if message already exists (by message_uuid)
        const exists = prev.some(
          (msg) => msg.message_uuid === confirmedMessage.message_uuid
        )
        if (exists) {
          console.log(
            '[Chat] Duplicate message prevented:',
            confirmedMessage.message_uuid
          )
          return prev
        }

        // Add new message (from other user or different tab)
        console.log(
          '[Chat] Adding new message from WebSocket:',
          confirmedMessage.message_uuid
        )
        return [...prev, confirmedMessage]
      })

      // Mark as read if it's for the current user and not sent by them
      if (
        data.receiver_id === currentUserIdRef.current &&
        data.sender_id !== currentUserIdRef.current
      ) {
        // Use WebSocket or REST to mark as read
        if (isConnected) {
          sendWebSocketMessage({
            type: 'mark_read',
            data: {
              message_uuid: data.message_uuid,
            },
          })
        } else {
          fetch(`${getAPIUrl()}chat/messages/${data.message_uuid}/read`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }).catch((err) => console.error('Failed to mark as read:', err))
        }
      }
    },
    [isConnected, sendWebSocketMessage, access_token]
  )

  const handleUserTyping = useCallback((event: any) => {
    // Use refs to avoid recreating handler
    if (
      event.data.conversation_uuid === conversationIdRef.current &&
      event.data.user_id !== currentUserIdRef.current
    ) {
      setOtherUserTyping(event.data.is_typing)

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Auto dismiss typing indicator after 5 seconds
      if (event.data.is_typing) {
        typingTimeoutRef.current = setTimeout(() => {
          setOtherUserTyping(false)
        }, 5000)
      }
    }
  }, [])

  const handleMessageRead = useCallback((event: any) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.message_uuid === event.data.message_uuid
          ? {
              ...msg,
              read_receipt: {
                delivered_at: msg.read_receipt?.delivered_at || msg.created_at,
                read_at: event.data.read_at,
              },
            }
          : msg
      )
    )
  }, [])

  const handleMessageEdited = useCallback((event: any) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.message_uuid === event.data.message_uuid
          ? {
              ...msg,
              content: event.data.content,
              is_edited: true,
              updated_at: event.data.edited_at,
            }
          : msg
      )
    )
  }, [])

  const handleMessageDeleted = useCallback((event: any) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.message_uuid === event.data.message_uuid
          ? {
              ...msg,
              is_deleted: true,
              content: '',
            }
          : msg
      )
    )
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    if (!isLoadingMessages) {
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
        0
      )
    }
  }, [messages, isLoadingMessages])

  useEffect(() => {
    if (!isConnected) return

    console.log(
      '[Chat] Registering WebSocket listeners for conversation:',
      conversationId
    )

    addMessageListener('new_message', handleNewMessage)
    addMessageListener('user_typing', handleUserTyping)
    addMessageListener('message_read', handleMessageRead)
    addMessageListener('message_edited', handleMessageEdited)
    addMessageListener('message_deleted', handleMessageDeleted)

    return () => {
      console.log(
        '[Chat] Cleaning up WebSocket listeners for conversation:',
        conversationId
      )
      removeMessageListener('new_message', handleNewMessage)
      removeMessageListener('user_typing', handleUserTyping)
      removeMessageListener('message_read', handleMessageRead)
      removeMessageListener('message_edited', handleMessageEdited)
      removeMessageListener('message_deleted', handleMessageDeleted)
    }
  }, [
    isConnected,
    handleNewMessage,
    handleUserTyping,
    handleMessageRead,
    handleMessageEdited,
    handleMessageDeleted,
    addMessageListener,
    removeMessageListener,
    conversationId,
  ])

  const markMessageAsRead = async (messageUuid: string) => {
    try {
      if (isConnected) {
        sendWebSocketMessage({
          type: 'mark_read',
          data: {
            message_uuid: messageUuid,
          },
        })
      } else {
        await fetch(`${getAPIUrl()}chat/messages/${messageUuid}/read`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageInput.trim() || !conversation) return

    const messageContent = messageInput.trim()
    const clientId = crypto.randomUUID() // Generate temporary ID

    try {
      setIsSendingMessage(true)
      setError(null)

      const optimisticMessage: Message = {
        id: 0, // Temp ID
        message_uuid: `temp_${clientId}`,
        conversation_id: conversationId,
        sender_id: current_user_id || 0,
        receiver_id: conversation.other_participant.id,
        content: messageContent,
        message_type: 'text',
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: [],
        clientId: clientId,
        isPending: true, // Mark as pending confirmation
        read_receipt: {
          delivered_at: new Date().toISOString(),
        },
      }

      // Add optimistic message immediately
      setMessages((prev) => [...prev, optimisticMessage])
      setMessageInput('') // Clear input immediately for better UX

      const url = new URL(`${getAPIUrl()}chat/messages/send`)
      url.searchParams.append('org_id', String(org_id))
      url.searchParams.append('conversation_id', conversationId)
      url.searchParams.append(
        'receiver_id',
        String(conversation.other_participant.id)
      )
      url.searchParams.append('content', messageContent)
      url.searchParams.append('message_type', 'text')
      url.searchParams.append('reply_to_message_id', '0')

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (response.ok) {
        const serverMessage = await response.json()
        console.log(
          '[Chat] Message sent successfully:',
          serverMessage.message_uuid
        )

        // WebSocket will handle replacing optimistic message with confirmed one
        // (handleNewMessage will match by content + timestamp + sender)

        // Update conversation preview
        const updatedConversation = {
          ...conversation,
          last_message_at: serverMessage.created_at,
          last_message: {
            message_uuid: serverMessage.message_uuid,
            content: serverMessage.content,
            sender_id: serverMessage.sender_id,
            created_at: serverMessage.created_at,
            is_deleted: false,
          },
        }
        onConversationUpdate(updatedConversation)
      } else {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((msg) => msg.clientId !== clientId))
        setError(t('chat.message_failed'))
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.clientId !== clientId))
      setError(t('chat.message_failed'))
    } finally {
      setIsSendingMessage(false)
    }
  }

  const lastTypingRef = useRef<number>(0)

  const handleTyping = () => {
    if (!isConnected || !conversation) return

    // Throttle typing indicator to avoid flooding
    const now = Date.now()
    if (now - lastTypingRef.current < 1000) return

    lastTypingRef.current = now
    sendWebSocketMessage({
      type: 'typing_start',
      data: {
        conversation_uuid: conversationId,
      },
    })
  }

  const handleTypingStop = () => {
    if (!isConnected || !conversation) return

    sendWebSocketMessage({
      type: 'typing_stop',
      data: {
        conversation_uuid: conversationId,
      },
    })
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <img
            src={
              conversation.other_participant.avatar_image ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.other_participant.id}`
            }
            alt={conversation.other_participant.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h2 className="font-semibold text-gray-900">
              {conversation.other_participant.first_name ||
                conversation.other_participant.username}
              {conversation.other_participant.last_name &&
                ` ${conversation.other_participant.last_name}`}
            </h2>
            <p className="text-sm text-gray-500">
              @{conversation.other_participant.username}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>{t('chat.no_messages')}</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.clientId || message.message_uuid}
              className={`flex ${
                message.sender_id === current_user_id
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_id === current_user_id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                } ${message.isPending ? 'opacity-70' : ''}`}
              >
                {message.is_deleted ? (
                  <p className="italic text-gray-500">
                    {t('chat.message_deleted')}
                  </p>
                ) : (
                  <p>{message.content}</p>
                )}
                <div
                  className={`text-xs mt-1 flex items-center gap-1 ${
                    message.sender_id === current_user_id
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  <span>
                    {new Date(message.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {message.sender_id === current_user_id && (
                    <>
                      {message.isPending ? (
                        <Clock size={14} className="animate-pulse" />
                      ) : message.read_receipt?.read_at ? (
                        <CheckCheck size={14} />
                      ) : (
                        <Check size={14} />
                      )}
                    </>
                  )}
                  {message.is_edited && (
                    <span className="ml-auto">({t('chat.edited')})</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {sendError && (
        <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg mx-4 flex items-center gap-2 text-red-700">
          <AlertCircle size={16} />
          <span className="text-sm">{sendError}</span>
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          handleSendMessage(e)
          handleTypingStop()
        }}
        className="border-t border-gray-200 p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('chat.type_message')}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e as any)
                handleTypingStop()
              }
              handleTyping()
            }}
            onBlur={handleTypingStop}
            disabled={isSendingMessage}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSendingMessage || !messageInput.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingMessage ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatWindow
