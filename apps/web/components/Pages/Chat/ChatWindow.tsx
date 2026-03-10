'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getUserAvatarMediaDirectory } from '@services/media/media'
import {
  Send,
  Loader2,
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  Paperclip,
  X,
  Image as ImageIcon,
  Download,
  Reply,
} from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl, getBackendUrl } from '@services/config/config'
import useWebSocket from '@/hooks/useWebSocket'
import toast from 'react-hot-toast'
import { useNotifications } from '@/hooks/useNotifications'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import {
  Attachment,
  Message,
  ChatWindowProps,
  CHAT_FILE_ACCEPT,
} from '../../../types/chatTypes'
import { getFileIcon, formatFileSize } from '../../Utils/chatUtils'
import {
  useClipboardMedia,
  useFileUpload,
  useInputPaste,
} from '../../Hooks/chatHooks'
import { MessageActions } from './components/chat/MessageActions'
import { TypingIndicator } from './components/chat/TypingIndicator'

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  conversationData,
  onConversationUpdate,
  onBack,
}) => {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const [messages, setMessages] = useState<Message[]>([])
  const conversation = conversationData ?? null
  const [messageInput, setMessageInput] = useState('')
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [sendError, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false)
  const [deleteTargetMessage, setDeleteTargetMessage] =
    useState<Message | null>(null)
  const [isDeletingMessage, setIsDeletingMessage] = useState(false)
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(
    null
  )
  const [highlightedMessageUuid, setHighlightedMessageUuid] = useState<
    string | null
  >(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const blobUrlsRef = useRef<Map<string, string>>(new Map())
  const messageItemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const messageCacheRef = useRef<Map<string, Message[]>>(new Map())
  const { copyAttachmentBlob, copyText } = useClipboardMedia()
  const {
    selectedFiles,
    error: fileUploadError,
    addFiles,
    removeFile,
    clearFiles,
    clearError,
  } = useFileUpload()

  const {
    showMessageNotification,
    requestNotificationPermission,
    windowFocused,
  } = useNotifications()

  const access_token = session?.data?.tokens?.access_token
  const org_id = org?.id
  const current_user_id = session?.data?.user?.id

  const conversationIdRef = useRef(conversationId)
  const currentUserIdRef = useRef(current_user_id)

  useEffect(() => {
    conversationIdRef.current = conversationId
    currentUserIdRef.current = current_user_id
  }, [conversationId, current_user_id])

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission()
  }, [requestNotificationPermission])

  useEffect(() => {
    if (fileUploadError) {
      setError(fileUploadError)
    }
  }, [fileUploadError])

  const onFilesPasted = useCallback(
    (files: File[]) => {
      const result = addFiles(files)
      if (result.accepted.length > 0) {
        toast.success('File added to message', {
          duration: 2000,
          position: 'bottom-center',
        })
      }
    },
    [addFiles]
  )

  const { handlePaste } = useInputPaste({ onFilesAdded: onFilesPasted })

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
    if (url.startsWith('blob:')) {
      return url
    }

    const backendOrigin = new URL(getBackendUrl()).origin

    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url)
        if (parsed.pathname.startsWith('/content/')) {
          return `${backendOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`
        }
      } catch {
        return url
      }
      return url
    }

    const path = url.startsWith('/') ? url : `/${url}`
    return `${backendOrigin}${path}`
  }, [])

  const openFileInNewTab = useCallback(
    (fileUrl: string) => {
      window.open(ensureAbsoluteUrl(fileUrl), '_blank', 'noopener,noreferrer')
    },
    [ensureAbsoluteUrl]
  )

  const downloadFile = useCallback(
    async (fileUrl: string, fileName: string) => {
      try {
        // Extract the path from the URL
        let path = fileUrl
        try {
          const urlObj = new URL(fileUrl)
          path = urlObj.pathname // Extract just the path part
        } catch {
          // If it's not a valid URL, treat it as a path
          path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
        }

        const backendOrigin = new URL(getBackendUrl()).origin
        const absoluteUrl = `${backendOrigin}${path}`

        const response = await fetch(absoluteUrl, {
          headers: access_token
            ? { Authorization: `Bearer ${access_token}` }
            : {},
        })

        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`)
        }

        // Create a blob from the response
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)

        // Create a temporary link and trigger download
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName // Use the original filename from DB
        document.body.appendChild(link)
        link.click()

        // Cleanup
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
      } catch (error) {
        setError(t('chat.download_failed'))
      }
    },
    [access_token, t]
  )

  useEffect(() => {
    const blobUrls = blobUrlsRef.current
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url))
      blobUrls.clear()
    }
  }, [])

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

    const cachedMessages = messageCacheRef.current.get(conversationId)
    if (cachedMessages) {
      setMessages(cachedMessages)
      setIsLoadingMessages(false)
    } else {
      setMessages([])
      setIsLoadingMessages(true)
    }

    const loadMessages = async () => {
      try {
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
          const normalizedMessages = data.reverse()
          messageCacheRef.current.set(conversationId, normalizedMessages)
          setMessages(normalizedMessages)
          normalizedMessages.forEach((msg: Message) => {
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

  useEffect(() => {
    if (!conversationId) return

    if (messages.length > 0 || messageCacheRef.current.has(conversationId)) {
      messageCacheRef.current.set(conversationId, messages)
    }
  }, [conversationId, messages])

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
        reply_to_message_id: data.reply_to_message_id,
        replied_message: data.replied_message,
      }

      setMessages((prev) => {
        const optimisticIndex = prev.findIndex(
          (msg) =>
            msg.isPending &&
            msg.sender_id === data.sender_id &&
            (msg.content === data.content ||
              (msg.message_type === 'file' &&
                data.message_type === 'file' &&
                (msg.content === '' || msg.content === '📎'))) &&
            Math.abs(
              new Date(msg.created_at).getTime() -
                new Date(data.created_at).getTime()
            ) < 5000
        )
        if (optimisticIndex !== -1) {
          const updated = [...prev]
          const optimisticMsg = updated[optimisticIndex]
          updated[optimisticIndex] = {
            ...confirmedMessage,
            isPending: false,
            clientId: optimisticMsg.clientId,
          }
          return updated
        }
        const exists = prev.some(
          (msg) => msg.message_uuid === confirmedMessage.message_uuid
        )
        if (exists) return prev
        return [...prev, confirmedMessage]
      })

      // Mark as read if message is for current user (notifications handled by GlobalChatProvider)
      if (data.sender_id !== currentUserIdRef.current) {
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

  const handleMessageAttachmentsUpdated = useCallback((event: any) => {
    const data = event.data
    if (!data || data.conversation_id !== conversationIdRef.current) return

    setMessages((prev) =>
      prev.map((msg) =>
        msg.message_uuid === data.message_uuid
          ? {
              ...msg,
              attachments: data.attachments || [],
              updated_at: data.updated_at || msg.updated_at,
            }
          : msg
      )
    )
  }, [])

  const scrollToLatestMessage = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const container = messagesContainerRef.current
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior })
      }
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    },
    []
  )

  useEffect(() => {
    if (!conversationId) return

    const immediateId = window.setTimeout(() => {
      scrollToLatestMessage('auto')
    }, 0)
    const settleId = window.setTimeout(() => {
      scrollToLatestMessage('auto')
    }, 120)

    return () => {
      window.clearTimeout(immediateId)
      window.clearTimeout(settleId)
    }
  }, [conversationId, scrollToLatestMessage])

  useEffect(() => {
    if (!isLoadingMessages) {
      const frameId = window.requestAnimationFrame(() => {
        scrollToLatestMessage('auto')
      })

      const settleId = window.setTimeout(() => {
        scrollToLatestMessage('auto')
      }, 120)

      return () => {
        window.cancelAnimationFrame(frameId)
        window.clearTimeout(settleId)
      }
    }
  }, [messages, isLoadingMessages, scrollToLatestMessage])

  useEffect(() => {
    if (!isConnected) return
    addMessageListener('new_message', handleNewMessage)
    addMessageListener('user_typing', handleUserTyping)
    addMessageListener('message_read', handleMessageRead)
    addMessageListener('message_edited', handleMessageEdited)
    addMessageListener('message_deleted', handleMessageDeleted)
    addMessageListener(
      'message_attachments_updated',
      handleMessageAttachmentsUpdated
    )
    return () => {
      removeMessageListener('new_message', handleNewMessage)
      removeMessageListener('user_typing', handleUserTyping)
      removeMessageListener('message_read', handleMessageRead)
      removeMessageListener('message_edited', handleMessageEdited)
      removeMessageListener('message_deleted', handleMessageDeleted)
      removeMessageListener(
        'message_attachments_updated',
        handleMessageAttachmentsUpdated
      )
    }
  }, [
    isConnected,
    handleNewMessage,
    handleUserTyping,
    handleMessageRead,
    handleMessageEdited,
    handleMessageDeleted,
    handleMessageAttachmentsUpdated,
    addMessageListener,
    removeMessageListener,
    conversationId,
    showMessageNotification,
    windowFocused,
  ])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      addFiles(Array.from(files))
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeSelectedFile = (index: number) => {
    removeFile(index)
  }

  const startEditMessage = (message: Message) => {
    if (message.is_deleted || message.isPending) return
    setEditingMessage(message)
    setMessageInput(message.content)
    clearFiles()
    setReplyingToMessage(null)
    clearError()
    setError(null)
    setTimeout(() => messageInputRef.current?.focus(), 0)
  }

  const cancelEditMessage = () => {
    setEditingMessage(null)
    setMessageInput('')
  }

  const startReplyToMessage = (message: Message) => {
    if (message.is_deleted || message.isPending) return
    setReplyingToMessage(message)
    setEditingMessage(null)
    setError(null)
    setTimeout(() => messageInputRef.current?.focus(), 0)
  }

  const cancelReply = () => {
    setReplyingToMessage(null)
  }

  const setMessageItemRef = useCallback(
    (messageUuid: string, node: HTMLDivElement | null) => {
      const refs = messageItemRefs.current
      if (node) {
        refs.set(messageUuid, node)
      } else {
        refs.delete(messageUuid)
      }
    },
    []
  )

  const scrollToParentMessage = useCallback((parentMessageUuid?: string) => {
    if (!parentMessageUuid) return

    const targetNode = messageItemRefs.current.get(parentMessageUuid)
    if (!targetNode) return

    targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedMessageUuid(parentMessageUuid)

    window.setTimeout(() => {
      setHighlightedMessageUuid((current) =>
        current === parentMessageUuid ? null : current
      )
    }, 1200)
  }, [])

  useEffect(() => {
    if (!editingMessage && !replyingToMessage) return

    const focusInput = () => {
      const input = messageInputRef.current
      if (!input) return
      input.focus()

      // Keep cursor at end so user can continue typing immediately.
      const cursorPos = input.value.length
      input.setSelectionRange(cursorPos, cursorPos)
    }

    // Run after state update and menu close focus handling settle.
    const rafId = window.requestAnimationFrame(focusInput)
    const timeoutId = window.setTimeout(focusInput, 40)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [editingMessage, replyingToMessage])

  /**
   * Copy message with proper media blob handling
   * Mimics WhatsApp/Discord behavior:
   * - For images: Copy actual blob (can be pasted as file)
   * - For text: Copy as plain text
   * - For text + images: Prefer blob copy if possible
   */
  const copyMessageContent = async (message: Message) => {
    if (message.is_deleted) return

    const textContent = message.content
    const hasAttachments = message.attachments && message.attachments.length > 0
    const hasNonImageAttachments =
      hasAttachments &&
      message.attachments.some(
        (attachment) => !attachment.file_type.startsWith('image/')
      )

    try {
      // Strategy 1: Try to copy the first attachment as a real clipboard blob.
      // This works for images and, when browser support allows it, documents.
      if (hasAttachments) {
        let clipboardFailureReason:
          | 'clipboard-write-unavailable'
          | 'clipboard-item-unavailable'
          | 'mime-unsupported'
          | 'write-failed'
          | null = null

        for (const attachment of message.attachments) {
          try {
            const absoluteUrl = ensureAbsoluteUrl(attachment.file_url)
            const response = await fetch(absoluteUrl, {
              headers: access_token
                ? { Authorization: `Bearer ${access_token}` }
                : {},
            })

            if (response.ok) {
              const blob = await response.blob()
              const result = await copyAttachmentBlob({
                blob,
                fileName: attachment.file_name,
                mimeType: attachment.file_type,
              })

              if (result.ok) {
                toast.success(t('chat.copied') || 'Copied', {
                  duration: 2000,
                  position: 'bottom-center',
                })
                return
              }

              clipboardFailureReason = result.reason
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to copy attachment:', error)
          }
        }

        // Strategy 2: Fallback - copy text with attachment info
        // (Better UX than just filename)
        const attachmentInfo = message.attachments
          .map((att) => `📎 ${att.file_name}`)
          .join('\n')
        const textToCopy =
          textContent && textContent.trim()
            ? `${textContent}\n\n${attachmentInfo}`
            : attachmentInfo

        const didCopyText = await copyText(textToCopy)
        if (!didCopyText) {
          throw new Error('Failed to copy attachment fallback text')
        }

        if (hasNonImageAttachments) {
          const fallbackMessage =
            clipboardFailureReason === 'mime-unsupported' ||
            clipboardFailureReason === 'clipboard-item-unavailable' ||
            clipboardFailureReason === 'clipboard-write-unavailable'
              ? 'Document copied as text only. This browser cannot place that file type on the clipboard as a pasteable file.'
              : 'Could not copy the document file itself. Copied its details as text instead.'

          toast(fallbackMessage, {
            duration: 3500,
            position: 'bottom-center',
            icon: '📋',
          })
        } else {
          toast.success(t('chat.copied') || 'Copied', {
            duration: 2000,
            position: 'bottom-center',
          })
        }
        return
      }

      // Strategy 3: No attachments, just copy text
      const textToCopy = textContent.trim() || '[Empty message]'
      await copyText(textToCopy)
      toast.success(t('chat.copied') || 'Copied', {
        duration: 2000,
        position: 'bottom-center',
      })
    } catch (error) {
      // Ultimate fallback for older browsers (IE/Edge legacy)
      try {
        const textToCopy = textContent.trim() || '[Empty message]'
        const textarea = document.createElement('textarea')
        textarea.value = textToCopy
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        toast.success(t('chat.copied') || 'Copied', {
          duration: 2000,
          position: 'bottom-center',
        })
      } catch (fallbackError) {
        // eslint-disable-next-line no-console
        console.error('Copy failed:', fallbackError)
        toast.error('Failed to copy', {
          duration: 2000,
          position: 'bottom-center',
        })
      }
    }
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
      let errorText = ''
      try {
        const errorJson = await response.json()
        errorText =
          typeof errorJson?.detail === 'string'
            ? errorJson.detail
            : JSON.stringify(errorJson)
      } catch {
        errorText = await response.text()
      }
      throw new Error(
        `Failed to upload attachment: ${response.status} ${errorText}`
      )
    }

    return await response.json()
  }

  const handleSendMessage = async () => {
    if (isSendingMessage || isUpdatingMessage) return
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
        content: messageContent || (hasFiles ? '📎' : ''),
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
      clearFiles()

      const url = new URL(`${getAPIUrl()}chat/messages/send`)
      url.searchParams.append('org_id', String(org_id))
      url.searchParams.append('conversation_id', conversationId)
      url.searchParams.append(
        'receiver_id',
        String(conversation.other_participant.id)
      )
      url.searchParams.append('content', messageContent)
      url.searchParams.append('message_type', hasFiles ? 'file' : 'text')
      if (replyingToMessage?.id) {
        url.searchParams.append(
          'reply_to_message_id',
          String(replyingToMessage.id)
        )
      }

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

      // Clear reply state after successful send
      setReplyingToMessage(null)

      if (hasFiles) {
        const uploadedAttachments: Attachment[] = []
        const failedUploads: string[] = []
        for (const file of filesToUpload) {
          try {
            const attachment = await uploadAttachment(
              serverMessage.message_uuid,
              file
            )
            uploadedAttachments.push(attachment)
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : 'Unknown upload error'
            failedUploads.push(`${file.name} (${reason})`)
          }
        }

        if (failedUploads.length > 0) {
          setError(
            `Some attachments failed to upload: ${failedUploads.join('; ')}`
          )
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

        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.clientId === clientId ||
            msg.message_uuid === serverMessage.message_uuid
              ? {
                  ...(fullMessage ?? { ...serverMessage }),
                  attachments: resolvedAttachments,
                  isPending: false,
                  clientId: msg.clientId ?? clientId,
                }
              : msg
          )

          const deduped = new Map<string, Message>()
          for (const msg of updated) {
            const existing = deduped.get(msg.message_uuid)
            if (!existing) {
              deduped.set(msg.message_uuid, msg)
              continue
            }

            const existingAttachmentCount = existing.attachments?.length ?? 0
            const currentAttachmentCount = msg.attachments?.length ?? 0
            const shouldReplace =
              currentAttachmentCount > existingAttachmentCount ||
              (!!msg.clientId && !existing.clientId)

            if (shouldReplace) {
              deduped.set(msg.message_uuid, msg)
            }
          }

          return Array.from(deduped.values())
        })
      } else {
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
      setTimeout(() => messageInputRef.current?.focus(), 0)
    }
  }

  const lastTypingRef = useRef<number>(0)

  const getDateSeparatorLabel = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )

    if (messageDate.getTime() === today.getTime()) {
      return t('chat.today') || 'Today'
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return t('chat.yesterday') || 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  }

  const shouldShowDateSeparator = (
    currentMessage: Message,
    previousMessage?: Message
  ): boolean => {
    if (!previousMessage) return true

    const currentDate = new Date(currentMessage.created_at)
    const previousDate = new Date(previousMessage.created_at)

    return (
      currentDate.getFullYear() !== previousDate.getFullYear() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getDate() !== previousDate.getDate()
    )
  }

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
          {/* Back button for mobile/tablet - visible only on small to medium devices */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden flex-shrink-0 -ml-1 p-1 text-indigo-400 hover:text-indigo-300 transition-colors"
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
          <div className="relative">
            <img
              src={
                otherParticipant.avatar_image
                  ? getUserAvatarMediaDirectory(
                      otherParticipant.user_uuid,
                      otherParticipant.avatar_image
                    )
                  : '/empty_avatar.png'
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
        style={{
          backgroundImage: "url('/chat-wallpaper.png')",
          backgroundSize: 'auto',
          backgroundRepeat: 'repeat',
        }}
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
          messages.map((message, index) => {
            const isMine = message.sender_id === current_user_id
            const showDateSeparator = shouldShowDateSeparator(
              message,
              index > 0 ? messages[index - 1] : undefined
            )
            return (
              <React.Fragment key={message.clientId || message.message_uuid}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">
                      <span className="text-[11px] font-medium text-white/40 uppercase tracking-wide">
                        {getDateSeparatorLabel(message.created_at)}
                      </span>
                    </div>
                  </div>
                )}
                <div
                  ref={(node) => setMessageItemRef(message.message_uuid, node)}
                  data-message-uuid={message.message_uuid}
                  className={`group flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {!isMine && (
                    <img
                      src={
                        otherParticipant.avatar_image
                          ? getUserAvatarMediaDirectory(
                              otherParticipant.user_uuid,
                              otherParticipant.avatar_image
                            )
                          : '/empty_avatar.png'
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
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all duration-200 overflow-hidden ${
                          isMine
                            ? `bg-indigo-500 text-white rounded-br-sm shadow-lg shadow-indigo-500/20 ${message.isPending ? 'opacity-60' : 'opacity-100'}`
                            : 'bg-white/[0.07] text-white/85 rounded-bl-sm border border-white/[0.06]'
                        } ${
                          highlightedMessageUuid === message.message_uuid
                            ? 'ring-2 ring-amber-300/70 ring-offset-1 ring-offset-transparent'
                            : ''
                        }`}
                      >
                        {message.is_deleted ? (
                          <span className="italic text-white/30 text-xs">
                            {t('chat.message_deleted')}
                          </span>
                        ) : (
                          <>
                            {/* Reply context */}
                            {message.replied_message && (
                              <button
                                type="button"
                                onClick={() =>
                                  scrollToParentMessage(
                                    message.replied_message?.message_uuid
                                  )
                                }
                                className={`mb-2 w-full text-left p-2 rounded-lg border-l-2 transition-colors ${
                                  isMine
                                    ? 'bg-indigo-600/30 border-white/40 hover:bg-indigo-600/40'
                                    : 'bg-white/[0.08] border-indigo-400/60 hover:bg-white/[0.12]'
                                }`}
                              >
                                <div className="flex items-center gap-1 mb-0.5">
                                  <Reply size={10} className="opacity-60" />
                                  <span className="text-[10px] font-medium opacity-60">
                                    {message.replied_message.sender_id ===
                                    current_user_id
                                      ? t('chat.you')
                                      : otherParticipant.first_name ||
                                        otherParticipant.username}
                                  </span>
                                </div>
                                <p className="text-xs opacity-75 line-clamp-2">
                                  {message.replied_message.is_deleted
                                    ? '[Deleted message]'
                                    : message.replied_message.content}
                                </p>
                              </button>
                            )}
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
                                    // Don't double-process URLs - backend already returns absolute URLs
                                    const absoluteFileUrl = ensureAbsoluteUrl(
                                      attachment.file_url || ''
                                    )
                                    const absoluteThumbUrl = ensureAbsoluteUrl(
                                      attachment.thumbnail_url ||
                                        attachment.file_url ||
                                        ''
                                    )
                                    return (
                                      <div
                                        key={attachment.attachment_uuid}
                                        className={`flex items-center gap-2 p-2 rounded-lg w-full max-w-[240px] ${isMine ? 'bg-indigo-600/30' : 'bg-white/[0.08]'}`}
                                      >
                                        {isImage && absoluteFileUrl ? (
                                          <div className="relative group">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openFileInNewTab(
                                                  absoluteFileUrl
                                                )
                                              }
                                              className="block cursor-pointer p-0 border-0 bg-transparent"
                                              title={`Open ${attachment.file_name}`}
                                            >
                                              <img
                                                src={absoluteThumbUrl}
                                                alt={attachment.file_name}
                                                className="max-w-[200px] max-h-[200px] rounded-md object-cover group-hover:opacity-80 transition-opacity"
                                              />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                downloadFile(
                                                  attachment.file_url,
                                                  attachment.file_name
                                                )
                                              }
                                              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded transition-colors opacity-0 group-hover:opacity-100 border-0 cursor-pointer"
                                              title={`Download ${attachment.file_name}`}
                                            >
                                              <Download
                                                size={14}
                                                className="text-white"
                                              />
                                            </button>
                                          </div>
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
                                                  downloadFile(
                                                    attachment.file_url,
                                                    attachment.file_name
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

                      {!message.is_deleted && !message.isPending && (
                        <MessageActions
                          message={message}
                          isMine={isMine}
                          onReply={() => startReplyToMessage(message)}
                          onCopy={() => copyMessageContent(message)}
                          onEdit={
                            isMine ? () => startEditMessage(message) : undefined
                          }
                          onDelete={
                            isMine
                              ? () => setDeleteTargetMessage(message)
                              : undefined
                          }
                          t={t}
                        />
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
              </React.Fragment>
            )
          })
        )}

        {/* Typing indicator */}
        {otherUserTyping && (
          <div className="flex justify-start gap-2">
            <img
              src={
                otherParticipant.avatar_image
                  ? getUserAvatarMediaDirectory(
                      otherParticipant.user_uuid,
                      otherParticipant.avatar_image
                    )
                  : '/empty_avatar.png'
              }
              alt={otherParticipant.username}
              className="w-7 h-7 rounded-full self-end flex-shrink-0 ring-1 ring-white/[0.06]"
            />
            <TypingIndicator isVisible={otherUserTyping} />
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

        {replyingToMessage && (
          <div className="mb-3 p-3 rounded-xl border border-indigo-500/25 bg-indigo-500/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Reply
                    size={12}
                    className="text-indigo-300/90 flex-shrink-0"
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-300/90">
                    Replying to{' '}
                    {replyingToMessage.sender_id === current_user_id
                      ? 'yourself'
                      : otherParticipant.first_name ||
                        otherParticipant.username}
                  </p>
                </div>
                <p className="text-xs text-white/70 line-clamp-2">
                  {replyingToMessage.content || '[Attachment]'}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelReply}
                className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white/90 flex-shrink-0"
                aria-label="Cancel reply"
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
            accept={CHAT_FILE_ACCEPT}
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
              onPaste={handlePaste}
              onBlur={handleTypingStop}
              disabled={isUpdatingMessage}
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
