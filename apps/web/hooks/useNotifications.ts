import { createElement, useContext } from 'react'
import toast from 'react-hot-toast'
import { useRouter, useParams } from 'next/navigation'
import { NotificationContext } from '@components/Contexts/NotificationContext'
import MessageNotificationToast from '@components/Objects/StyledElements/Toast/MessageNotificationToast'
import {
  playNotificationSound,
  showBrowserNotification,
  requestNotificationPermission,
} from '@/utils/notification'

interface ShowToastOptions {
  duration?: number
}

interface ShowNotificationOptions extends ShowToastOptions {
  body?: string
  conversationId?: string
  userId?: number
  playSound?: boolean
  showDesktop?: boolean
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  const router = useRouter()
  const params = useParams()

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }

  const navigateToChat = (conversationId: string) => {
    const orgslug = params?.orgslug as string
    if (orgslug && conversationId) {
      const chatUrl = `/chat/${conversationId}`
      router.push(chatUrl)
    }
  }

  const showToast = (
    message: string,
    options: ShowToastOptions & { type?: 'success' | 'error' | 'info' } = {}
  ) => {
    const { duration = 4000, type = 'info' } = options

    if (type === 'success') {
      toast.success(message, { duration })
    } else if (type === 'error') {
      toast.error(message, { duration })
    } else {
      toast(message, { duration })
    }
  }

  const showMessageNotification = (
    senderName: string,
    messagePreview: string,
    options: ShowNotificationOptions = {}
  ) => {
    const {
      duration = 5000,
      playSound = true,
      showDesktop = true,
      conversationId,
    } = options

    const handleOpenConversation = () => {
      if (conversationId) {
        navigateToChat(conversationId)
      }
    }

    // Show in-app custom toast for chat messages
    toast.custom(
      (toastInstance) =>
        createElement(MessageNotificationToast, {
          senderName,
          messagePreview,
          onClick: () => {
            handleOpenConversation()
            toast.dismiss(toastInstance.id)
          },
          onClose: () => toast.dismiss(toastInstance.id),
        }),
      {
        duration,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
          right: 0,
        },
      }
    )

    // Play sound if enabled
    if (playSound) {
      playNotificationSound()
    }

    // Show desktop notification if app is not focused
    if (showDesktop && !context.windowFocused) {
      showBrowserNotification(senderName, {
        body: messagePreview,
        tag: `message-${conversationId}`,
        onClick: handleOpenConversation,
      })
    }

    // Increment unread count for app title badge
    if (!context.windowFocused) {
      context.incrementUnreadCount()
    }
  }

  const dismissAllToasts = () => {
    toast.remove()
  }

  return {
    showToast,
    showMessageNotification,
    dismissAllToasts,
    requestNotificationPermission,
    unreadCount: context.unreadCount,
    setUnreadCount: context.setUnreadCount,
    resetUnreadCount: context.resetUnreadCount,
    windowFocused: context.windowFocused,
  }
}
