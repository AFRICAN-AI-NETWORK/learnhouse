'use client'
import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Loader2 } from 'lucide-react'
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
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading,
  orgslug,
}) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)

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
    if (!conversation.last_message) {
      return t('chat.no_messages')
    }
    if (conversation.last_message.is_deleted) {
      return t('chat.message_deleted')
    }
    return conversation.last_message.content.substring(0, 50)
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold mb-4">{t('chat.chats')}</h2>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder={t('chat.search_conversations')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowNewChatDialog(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('chat.create_new_chat')}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <p>{t('chat.no_conversations')}</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.conversation_uuid}
                onClick={() =>
                  onSelectConversation(conversation.conversation_uuid)
                }
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedConversationId === conversation.conversation_uuid
                    ? 'bg-blue-50'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <img
                      src={
                        conversation.other_participant.avatar_image ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.other_participant.id}`
                      }
                      alt={conversation.other_participant.username}
                      className="w-12 h-12 rounded-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.other_participant.first_name ||
                          conversation.other_participant.username}
                        {conversation.other_participant.last_name &&
                          ` ${conversation.other_participant.last_name}`}
                      </h3>
                      {conversation.last_message_at && (
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {getPreviewText(conversation)}
                    </p>
                  </div>
                  {conversation.unread_count > 0 && (
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                      {conversation.unread_count > 9
                        ? '9+'
                        : conversation.unread_count}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Chat Dialog */}
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
