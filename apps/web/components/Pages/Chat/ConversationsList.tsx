'use client'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Loader2, MessageSquareDashed } from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getBackendUrl } from '@services/config/config'
import useWebSocket from '@/hooks/useWebSocket'
import NewChatDialog from './NewChatDialog'

interface Participant {
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
  other_participant: Participant
  last_message?: {
    message_uuid: string
    content: string
    sender_id: number
    created_at: string
    is_deleted: boolean
  }
}

interface ConversationsListProps {
  conversations: Conversation[]
  selectedConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onNewConversation: (conversation: Conversation) => void
  isLoading: boolean
  orgslug: string
  typingUsers: Map<string, number>
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading,
  orgslug,
  typingUsers,
}) => {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)

  const access_token = session?.data?.tokens?.access_token
  const org_id = org?.id

  const { isConnected } = useWebSocket(access_token, org_id)

  const ensureAbsoluteUrl = (url?: string) => {
    if (!url) return '/empty_avatar.png'
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('blob:')
    ) {
      return url
    }
    const backendOrigin = new URL(getBackendUrl()).origin
    const path = url.startsWith('/') ? url : `/${url}`
    return `${backendOrigin}${path}`
  }

  const filteredConversations = conversations.filter((conv) => {
    const participantName =
      `${conv.other_participant.first_name || ''} ${conv.other_participant.last_name || ''}`.toLowerCase()
    const username = conv.other_participant.username.toLowerCase()
    const query = searchQuery.toLowerCase()
    return participantName.includes(query) || username.includes(query)
  })

  const formatTime = (dateString: string) => {
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
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return t('chat.yesterday')
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  const getPreviewText = (conversation: Conversation) => {
    // Check if someone is typing in this conversation
    const isTyping = typingUsers.has(conversation.conversation_uuid)
    if (isTyping) {
      return (
        <span className="flex items-center gap-1">
          <span className="text-indigo-400 italic">{t('chat.typing')}</span>
          <span className="flex gap-0.5">
            <span
              className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </span>
        </span>
      )
    }

    if (!conversation.last_message) return t('chat.no_messages')
    if (conversation.last_message.is_deleted) return t('chat.message_deleted')
    return conversation.last_message.content.substring(0, 50)
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white tracking-tight">
              {t('chat.chats')}
            </h2>
            <button
              onClick={() => setShowNewChatDialog(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
              title={t('chat.create_new_chat')}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
            />
            <input
              type="text"
              placeholder={t('chat.search_conversations')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/25 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all duration-200"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-indigo-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <MessageSquareDashed size={20} className="text-white/20" />
              </div>
              <p className="text-white/30 text-sm">
                {t('chat.no_conversations')}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const isSelected =
                selectedConversationId === conversation.conversation_uuid
              const displayName = conversation.other_participant.first_name
                ? `${conversation.other_participant.first_name}${conversation.other_participant.last_name ? ' ' + conversation.other_participant.last_name : ''}`
                : conversation.other_participant.username

              return (
                <div
                  key={conversation.conversation_uuid}
                  onClick={() =>
                    onSelectConversation(conversation.conversation_uuid)
                  }
                  className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-indigo-500/15 border border-indigo-500/25'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={ensureAbsoluteUrl(
                        conversation.other_participant.avatar_image
                      )}
                      alt={conversation.other_participant.username}
                      className="w-11 h-11 rounded-full ring-2 ring-white/[0.06] object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-white/20'} border-2 border-[#13131a]`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-white/80'}`}
                      >
                        {displayName}
                      </span>
                      {conversation.last_message_at && (
                        <span className="text-[11px] text-white/30 flex-shrink-0 tabular-nums">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`text-xs truncate ${conversation.unread_count > 0 || typingUsers.has(conversation.conversation_uuid) ? 'text-white/60 font-medium' : 'text-white/30'}`}
                      >
                        {getPreviewText(conversation)}
                      </div>
                      {conversation.unread_count > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center leading-none">
                          {conversation.unread_count > 9
                            ? '9+'
                            : conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <NewChatDialog
        isOpen={showNewChatDialog}
        onClose={() => setShowNewChatDialog(false)}
        onSelectUser={onNewConversation}
        orgslug={orgslug}
      />
    </>
  )
}

export default ConversationsList
