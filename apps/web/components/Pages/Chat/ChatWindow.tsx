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
  Paperclip,
  X,
  File,
  Image as ImageIcon,
  Video,
  FileText,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'
import useWebSocket from '@/hooks/useWebSocket'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'

interface Attachment {
  attachment_uuid: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  thumbnail_url?: string
  upload_status: string
}

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
  attachments: Attachment[]
  clientId?: string
  isPending?: boolean
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
  last_message?: {
    message_uuid: string
    content: string
    sender_id: number
    created_at: string
    is_deleted: boolean
  }
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false)
  const [deleteTargetMessage, setDeleteTargetMessage] =
    useState<Message | null>(null)
  const [isDeletingMessage, setIsDeletingMessage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const blobUrlsRef = useRef<Map<string, string>>(new Map())

  const access_token = session?.data?.tokens?.access_token
  const org_id = org?.id
  const current_user_id = session?.data?.user?.id

  const conversationIdRef = useRef(conversationId)
  const currentUserIdRef = useRef(current_user_id)

  useEffect(() => {
    conversationIdRef.current = conversationId
    currentUserIdRef.current = current_user_id
  }, [conversationId, current_user_id])

  const {
    isConnected,
    sendMessage: sendWebSocketMessage,
    addMessageListener,
    removeMessageListener,
  } = useWebSocket(access_token, org_id)

  const fetchFullMessage = useCallback(
    async (messageUuid: string): Promise<Message | null> => {
      try {
        const response = await fetch(
          `${getAPIUrl()}chat/messages/${messageUuid}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (response.ok) {
          return await response.json()
        }
      } catch (error) {
        // Error fetching full message
      }
      return null
    },
    [access_token]
  )

  const ensureAbsoluteUrl = useCallback((url: string): string => {
    if (!url) return url
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('blob:')
    ) {
      return url
    }
    const backendOrigin = new URL(getAPIUrl()).origin
    const path = url.startsWith('/') ? url : `/${url}`
    return `${backendOrigin}${path}`
  }, [])

  const openFileInNewTab = useCallback(
    (fileUrl: string) => {
      window.open(ensureAbsoluteUrl(fileUrl), '_blank', 'noopener,noreferrer')
    },
    [ensureAbsoluteUrl]
  )

  useEffect(() => {
    const blobUrls = blobUrlsRef.current
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url))
      blobUrls.clear()
    }
  }, [])

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
        // Error loading conversation
      }
    }

    loadConversation()
  }, [org_id, access_token, conversationId, onConversationUpdate])

  const markMessageAsRead = useCallback(
    async (messageUuid: string) => {
      try {
        if (isConnected) {
          sendWebSocketMessage({
            type: 'mark_read',
            data: { message_uuid: messageUuid },
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
        // Error marking message as read
      }
    },
    [isConnected, sendWebSocketMessage, access_token]
  )

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
        // Error loading messages
      } finally {
        setIsLoadingMessages(false)
      }
    }

    loadMessages()
  }, [access_token, conversationId, current_user_id, markMessageAsRead])

  const handleNewMessage = useCallback(
    async (event: any) => {
      const data = event.data
      if (data.conversation_id !== conversationIdRef.current) return

      const fullMessage = await fetchFullMessage(data.message_uuid)

      const confirmedMessage: Message = fullMessage ?? {
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
        read_receipt: { delivered_at: data.created_at, read_at: undefined },
      }

      setMessages((prev) => {
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
          const updated = [...prev]
          updated[optimisticIndex] = { ...confirmedMessage, isPending: false }
          return updated
        }
        const exists = prev.some(
          (msg) => msg.message_uuid === confirmedMessage.message_uuid
        )
        if (exists) return prev
        return [...prev, confirmedMessage]
      })

      if (
        data.receiver_id === currentUserIdRef.current &&
        data.sender_id !== currentUserIdRef.current
      ) {
        if (isConnected) {
          sendWebSocketMessage({
            type: 'mark_read',
            data: { message_uuid: data.message_uuid },
          })
        } else {
          fetch(`${getAPIUrl()}chat/messages/${data.message_uuid}/read`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }).catch(() => {
            // Error marking as read
          })
        }
      }
    },
    [isConnected, sendWebSocketMessage, access_token, fetchFullMessage]
  )

  const handleUserTyping = useCallback((event: any) => {
    if (
      event.data.conversation_uuid === conversationIdRef.current &&
      event.data.user_id !== currentUserIdRef.current
    ) {
      setOtherUserTyping(event.data.is_typing)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (event.data.is_typing) {
        typingTimeoutRef.current = setTimeout(
          () => setOtherUserTyping(false),
          5000
        )
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

    setEditingMessage((prev) => {
      if (!prev || prev.message_uuid !== event.data.message_uuid) return prev
      return {
        ...prev,
        content: event.data.content,
        is_edited: true,
        updated_at: event.data.edited_at,
      }
    })
  }, [])

  const handleMessageDeleted = useCallback((event: any) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.message_uuid === event.data.message_uuid
          ? { ...msg, is_deleted: true, content: '' }
          : msg
      )
    )

    setEditingMessage((prev) =>
      prev?.message_uuid === event.data.message_uuid ? null : prev
    )

    setDeleteTargetMessage((prev) =>
      prev?.message_uuid === event.data.message_uuid ? null : prev
    )
  }, [])

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
    addMessageListener('new_message', handleNewMessage)
    addMessageListener('user_typing', handleUserTyping)
    addMessageListener('message_read', handleMessageRead)
    addMessageListener('message_edited', handleMessageEdited)
    addMessageListener('message_deleted', handleMessageDeleted)
    return () => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(files)])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const startEditMessage = (message: Message) => {
    if (message.is_deleted || message.isPending) return
    setEditingMessage(message)
    setMessageInput(message.content)
    setSelectedFiles([])
    setError(null)
    setTimeout(() => messageInputRef.current?.focus(), 0)
  }

  const cancelEditMessage = () => {
    setEditingMessage(null)
    setMessageInput('')
  }

  const handleEditMessage = async () => {
    if (!editingMessage || !messageInput.trim()) return

    const newContent = messageInput.trim()
    const oldContent = editingMessage.content
    const editedAt = new Date().toISOString()

    setIsUpdatingMessage(true)
    setError(null)

    setMessages((prev) =>
      prev.map((msg) =>
        msg.message_uuid === editingMessage.message_uuid
          ? {
              ...msg,
              content: newContent,
              is_edited: true,
              updated_at: editedAt,
            }
          : msg
      )
    )

    setEditingMessage(null)
    setMessageInput('')

    try {
      const response = await fetch(
        `${getAPIUrl()}chat/messages/${editingMessage.message_uuid}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: newContent }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to edit message')
      }

      const serverMessage = await response.json()
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_uuid === editingMessage.message_uuid
            ? {
                ...msg,
                content: serverMessage.content,
                is_edited: serverMessage.is_edited ?? true,
                updated_at: serverMessage.updated_at || editedAt,
              }
            : msg
        )
      )
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_uuid === editingMessage.message_uuid
            ? {
                ...msg,
                content: oldContent,
                is_edited: editingMessage.is_edited,
                updated_at: editingMessage.updated_at,
              }
            : msg
        )
      )
      setError(t('chat.message_failed'))
    } finally {
      setIsUpdatingMessage(false)
    }
  }

  const handleDeleteMessage = async () => {
    if (!deleteTargetMessage) return

    const target = deleteTargetMessage
    setIsDeletingMessage(true)
    setError(null)

    setMessages((prev) =>
      prev.map((msg) =>
        msg.message_uuid === target.message_uuid
          ? { ...msg, is_deleted: true, content: '' }
          : msg
      )
    )

    setDeleteTargetMessage(null)
    if (editingMessage?.message_uuid === target.message_uuid) {
      cancelEditMessage()
    }

    try {
      const response = await fetch(
        `${getAPIUrl()}chat/messages/${target.message_uuid}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_uuid === target.message_uuid
            ? {
                ...msg,
                is_deleted: target.is_deleted,
                content: target.content,
              }
            : msg
        )
      )
      setError(t('chat.message_failed'))
    } finally {
      setIsDeletingMessage(false)
    }
  }

  const uploadAttachment = async (
    messageUuid: string,
    file: File
  ): Promise<Attachment> => {
    const formData = new FormData()
    formData.append('file', file)

    const url = new URL(
      `${getAPIUrl()}chat/messages/${messageUuid}/attachments`
    )
    url.searchParams.append('org_id', String(org_id))

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Failed to upload attachment: ${response.status} ${errorText}`
      )
    }

    return await response.json()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon
    if (fileType.startsWith('video/')) return Video
    if (fileType.includes('pdf') || fileType.includes('document'))
      return FileText
    return File
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || !conversation)
      return

    const messageContent = messageInput.trim()
    const clientId = crypto.randomUUID()
    const filesToUpload = [...selectedFiles]
    const hasFiles = filesToUpload.length > 0

    try {
      setIsSendingMessage(true)
      setError(null)

      const localAttachmentPreviews: Attachment[] = filesToUpload.map(
        (file) => {
          let blobUrl: string | undefined
          if (file.type.startsWith('image/')) {
            blobUrl = URL.createObjectURL(file)
            blobUrlsRef.current.set(file.name, blobUrl)
          }
          return {
            attachment_uuid: `preview_${crypto.randomUUID()}`,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_url: '',
            thumbnail_url: blobUrl,
            upload_status: 'pending',
          }
        }
      )

      const optimisticMessage: Message = {
        id: 0,
        message_uuid: `temp_${clientId}`,
        conversation_id: conversationId,
        sender_id: current_user_id || 0,
        receiver_id: conversation.other_participant.id,
        content: messageContent,
        message_type: hasFiles ? 'file' : 'text',
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: localAttachmentPreviews,
        clientId,
        isPending: true,
        read_receipt: { delivered_at: new Date().toISOString() },
      }

      setMessages((prev) => [...prev, optimisticMessage])
      setMessageInput('')
      setSelectedFiles([])

      const url = new URL(`${getAPIUrl()}chat/messages/send`)
      url.searchParams.append('org_id', String(org_id))
      url.searchParams.append('conversation_id', conversationId)
      url.searchParams.append(
        'receiver_id',
        String(conversation.other_participant.id)
      )
      url.searchParams.append('content', messageContent)
      url.searchParams.append('message_type', hasFiles ? 'file' : 'text')
      url.searchParams.append('reply_to_message_id', '0')

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (!response.ok) {
        setMessages((prev) => prev.filter((msg) => msg.clientId !== clientId))
        setError(t('chat.message_failed'))
        return
      }

      const serverMessage = await response.json()

      if (hasFiles) {
        const uploadedAttachments: Attachment[] = []
        for (const file of filesToUpload) {
          try {
            const attachment = await uploadAttachment(
              serverMessage.message_uuid,
              file
            )
            uploadedAttachments.push(attachment)
          } catch (error) {
            // Error uploading file
          }
        }

        const fullMessage = await fetchFullMessage(serverMessage.message_uuid)
        const resolvedAttachments = (
          fullMessage?.attachments ?? uploadedAttachments
        ).map((att) => {
          const blobUrl = blobUrlsRef.current.get(att.file_name)
          if (att.thumbnail_url && blobUrl) {
            URL.revokeObjectURL(blobUrl)
            blobUrlsRef.current.delete(att.file_name)
          }
          return {
            ...att,
            thumbnail_url: att.thumbnail_url || blobUrl,
          }
        })

        setMessages((prev) =>
          prev.map((msg) =>
            msg.clientId === clientId
              ? {
                  ...(fullMessage ?? { ...serverMessage }),
                  attachments: resolvedAttachments,
                  isPending: false,
                  clientId,
                }
              : msg
          )
        )
      } else {
        // Text-only: just confirm the optimistic message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.clientId === clientId
              ? { ...msg, ...serverMessage, isPending: false }
              : msg
          )
        )
      }

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
    } catch (error) {
      // Error sending message
      setMessages((prev) => prev.filter((msg) => msg.clientId !== clientId))
      setError(t('chat.message_failed'))
    } finally {
      setIsSendingMessage(false)
    }
  }

  const lastTypingRef = useRef<number>(0)

  const handleTyping = () => {
    if (!isConnected || !conversation) return
    const now = Date.now()
    if (now - lastTypingRef.current < 1000) return
    lastTypingRef.current = now
    sendWebSocketMessage({
      type: 'typing_start',
      data: { conversation_uuid: conversationId },
    })
  }

  const handleTypingStop = () => {
    if (!isConnected || !conversation) return
    sendWebSocketMessage({
      type: 'typing_stop',
      data: { conversation_uuid: conversationId },
    })
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0f0f13]">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    )
  }

  const otherParticipant = conversation.other_participant
  const displayName = otherParticipant.first_name
    ? `${otherParticipant.first_name}${otherParticipant.last_name ? ' ' + otherParticipant.last_name : ''}`
    : otherParticipant.username

  return (
    <div className="flex flex-col h-full bg-[#0f0f13]">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-white/[0.06] bg-[#13131a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={
                otherParticipant.avatar_image ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant.id}`
              }
              alt={otherParticipant.username}
              className="w-9 h-9 rounded-full ring-2 ring-white/[0.06] object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#13131a]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white leading-tight">
              {displayName}
            </h2>
            <p className="text-xs text-white/35 leading-tight mt-0.5">
              @{otherParticipant.username}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-white/20'}`}
          />
          <span className="text-xs text-white/25">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={22} className="animate-spin text-indigo-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <span className="text-xl">👋</span>
            </div>
            <p className="text-white/30 text-sm">{t('chat.no_messages')}</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === current_user_id
            return (
              <div
                key={message.clientId || message.message_uuid}
                className={`group flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}
              >
                {!isMine && (
                  <img
                    src={
                      otherParticipant.avatar_image ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant.id}`
                    }
                    alt={otherParticipant.username}
                    className="w-7 h-7 rounded-full self-end flex-shrink-0 ring-1 ring-white/[0.06]"
                  />
                )}

                <div
                  className={`max-w-[70%] lg:max-w-[60%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`flex items-start gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity duration-200 ${
                        isMine
                          ? `bg-indigo-500 text-white rounded-br-sm shadow-lg shadow-indigo-500/20 ${message.isPending ? 'opacity-60' : 'opacity-100'}`
                          : 'bg-white/[0.07] text-white/85 rounded-bl-sm border border-white/[0.06]'
                      }`}
                    >
                      {message.is_deleted ? (
                        <span className="italic text-white/30 text-xs">
                          {t('chat.message_deleted')}
                        </span>
                      ) : (
                        <>
                          {message.content && <span>{message.content}</span>}
                          {message.attachments &&
                            message.attachments.length > 0 && (
                              <div
                                className={`space-y-2 ${message.content ? 'mt-2' : ''}`}
                              >
                                {message.attachments.map((attachment) => {
                                  const IconComponent = getFileIcon(
                                    attachment.file_type
                                  )
                                  const isImage =
                                    attachment.file_type.startsWith('image/')
                                  const absoluteFileUrl = attachment.file_url
                                    ? ensureAbsoluteUrl(attachment.file_url)
                                    : ''
                                  const absoluteThumbUrl = ensureAbsoluteUrl(
                                    attachment.thumbnail_url ||
                                      attachment.file_url ||
                                      ''
                                  )
                                  return (
                                    <div
                                      key={attachment.attachment_uuid}
                                      className={`flex items-center gap-2 p-2 rounded-lg ${isMine ? 'bg-indigo-600/30' : 'bg-white/[0.08]'}`}
                                    >
                                      {isImage && absoluteFileUrl ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openFileInNewTab(absoluteFileUrl)
                                          }
                                          className="block group cursor-pointer p-0 border-0 bg-transparent"
                                          title={`Open ${attachment.file_name}`}
                                        >
                                          <img
                                            src={absoluteThumbUrl}
                                            alt={attachment.file_name}
                                            className="max-w-[200px] max-h-[200px] rounded-md object-cover group-hover:opacity-80 transition-opacity"
                                          />
                                        </button>
                                      ) : (
                                        <>
                                          <IconComponent
                                            size={18}
                                            className="flex-shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">
                                              {attachment.file_name}
                                            </p>
                                            <p className="text-[10px] opacity-60">
                                              {formatFileSize(
                                                attachment.file_size
                                              )}
                                            </p>
                                          </div>
                                          {absoluteFileUrl && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openFileInNewTab(
                                                  absoluteFileUrl
                                                )
                                              }
                                              className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors bg-transparent border-0 cursor-pointer"
                                              title={`Download ${attachment.file_name}`}
                                            >
                                              <Download size={14} />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                        </>
                      )}
                    </div>

                    {isMine && !message.isPending && !message.is_deleted && (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-md border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/60"
                            aria-label="Message actions"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align={isMine ? 'end' : 'start'}
                          className="w-40"
                        >
                          <DropdownMenuItem
                            onClick={() => startEditMessage(message)}
                          >
                            <Pencil size={14} />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTargetMessage(message)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash2 size={14} />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Timestamp + status */}
                  <div
                    className={`flex items-center gap-1 mt-1 px-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <span className="text-[11px] text-white/20 tabular-nums">
                      {new Date(message.created_at).toLocaleTimeString(
                        'en-US',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                    {isMine && (
                      <span className="text-white/30">
                        {message.isPending ? (
                          <Clock size={11} className="animate-pulse" />
                        ) : message.read_receipt?.read_at ? (
                          <CheckCheck size={11} className="text-indigo-400" />
                        ) : (
                          <Check size={11} />
                        )}
                      </span>
                    )}
                    {message.is_edited && (
                      <span className="text-[11px] text-white/20">
                        · {t('chat.edited')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Typing indicator */}
        {otherUserTyping && (
          <div className="flex justify-start gap-2">
            <img
              src={
                otherParticipant.avatar_image ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant.id}`
              }
              alt={otherParticipant.username}
              className="w-7 h-7 rounded-full self-end flex-shrink-0 ring-1 ring-white/[0.06]"
            />
            <div className="bg-white/[0.07] border border-white/[0.06] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {sendError && (
        <div className="mx-4 mb-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400">
          <AlertCircle size={14} />
          <span className="text-xs font-medium">{sendError}</span>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06] bg-[#13131a]">
        {editingMessage && (
          <div className="mb-3 p-3 rounded-xl border border-amber-500/25 bg-amber-500/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300/90">
                  Editing message
                </p>
                <p className="text-xs text-white/70 mt-1 line-clamp-2">
                  {editingMessage.content || t('chat.message_deleted')}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEditMessage}
                className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white/90"
                aria-label="Cancel editing"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => {
              const IconComponent = getFileIcon(file.type)
              const isImage = file.type.startsWith('image/')
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white/[0.08] border border-white/[0.10] rounded-lg px-3 py-2 text-xs"
                >
                  {isImage ? (
                    <ImageIcon size={14} className="text-white/60" />
                  ) : (
                    <IconComponent size={14} className="text-white/60" />
                  )}
                  <span className="text-white/80 max-w-[120px] truncate">
                    {file.name}
                  </span>
                  <span className="text-white/40">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <X size={12} className="text-white/60" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingMessage) {
              handleEditMessage()
            } else {
              handleSendMessage()
            }
            handleTypingStop()
          }}
          className="flex items-center gap-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSendingMessage || isUpdatingMessage}
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-white/60 hover:text-white/80 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Paperclip size={18} />
          </button>
          <div className="flex-1 relative">
            <input
              ref={messageInputRef}
              type="text"
              placeholder={t('chat.type_message')}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (editingMessage) {
                    handleEditMessage()
                  } else {
                    handleSendMessage()
                  }
                  handleTypingStop()
                }
                handleTyping()
              }}
              onBlur={handleTypingStop}
              disabled={isSendingMessage || isUpdatingMessage}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/20 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all duration-200 disabled:opacity-40 pr-12"
            />
          </div>
          <button
            type="submit"
            disabled={
              isSendingMessage ||
              isUpdatingMessage ||
              (!messageInput.trim() && selectedFiles.length === 0)
            }
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
          >
            {isSendingMessage || isUpdatingMessage ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
      </div>

      <Dialog
        open={!!deleteTargetMessage}
        onOpenChange={(open) => {
          if (!open && !isDeletingMessage) {
            setDeleteTargetMessage(null)
          }
        }}
      >
        <DialogContent className="max-w-md bg-[#17171f] border border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete message?</DialogTitle>
            <DialogDescription className="text-white/70">
              This action cannot be undone. The message will be replaced with a
              deleted placeholder for everyone in this conversation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTargetMessage(null)}
              disabled={isDeletingMessage}
              className="h-9 px-4 rounded-md border border-white/[0.12] text-white/80 hover:bg-white/[0.06] disabled:opacity-40"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteMessage}
              disabled={isDeletingMessage}
              className="h-9 px-4 rounded-md bg-red-500/90 hover:bg-red-500 text-white disabled:opacity-40"
            >
              {isDeletingMessage ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {t('common.delete')}
                </span>
              ) : (
                t('common.delete')
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChatWindow
