/**
 * Shared types for Chat system
 * Used by ChatWindow, FloatingChatWidget, and all chat-related components
 */

export interface Attachment {
  attachment_uuid: string
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  thumbnail_url?: string
  upload_status: string
}

export interface Message {
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
  reply_to_message_id?: number
  replied_message?: {
    message_uuid: string
    content: string
    sender_id: number
    created_at: string
    is_deleted: boolean
  }
}

export interface ParticipantUser {
  id: number
  user_uuid: string
  username: string
  first_name?: string
  last_name?: string
  avatar_image?: string
  role_name?: string
}

export interface Conversation {
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

export interface ChatWindowProps {
  conversationId: string
  onConversationUpdate: (conversation: Conversation) => void
  onBack?: () => void
}

export const SUPPORTED_CHAT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.webm',
  '.pdf',
]

export const CHAT_FILE_ACCEPT = SUPPORTED_CHAT_EXTENSIONS.join(',')
