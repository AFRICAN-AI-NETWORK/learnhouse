'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Search, Loader2 } from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'

interface User {
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
  other_participant: User
  last_message?: {
    message_uuid: string
    content: string
    sender_id: number
    created_at: string
    is_deleted: boolean
  }
}

interface NewChatDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (conversation: Conversation) => void
  orgslug: string
}

const NewChatDialog: React.FC<NewChatDialogProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  orgslug,
}) => {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)

  const org_id = org?.id

  // Load chatable users
  useEffect(() => {
    if (!isOpen || !org_id || !session?.data?.tokens?.access_token) return

    const loadUsers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          `${getAPIUrl()}chat/conversations/chatable-users?org_id=${org_id}`,
          {
            headers: {
              Authorization: `Bearer ${session.data.tokens.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
          setFilteredUsers(data)
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [isOpen, org_id, session?.data?.tokens?.access_token])

  // Filter users based on search
  useEffect(() => {
    const query = searchQuery.toLowerCase()
    const filtered = users.filter((user) => {
      const name =
        `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      const username = user.username.toLowerCase()
      return name.includes(query) || username.includes(query)
    })
    setFilteredUsers(filtered)
  }, [searchQuery, users])

  const handleSelectUser = useCallback(
    async (user: User) => {
      try {
        setIsCreatingConversation(true)
        const response = await fetch(
          `${getAPIUrl()}chat/conversations/?org_id=${org_id}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.data.tokens.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              participant_two_id: user.id,
            }),
          }
        )

        if (response.ok) {
          const conversation = await response.json()
          onSelectUser(conversation)
          onClose()
          setSearchQuery('')
        } else if (response.status === 403) {
          alert(t('chat.not_allowed_to_chat'))
        }
      } catch (error) {
        console.error('Failed to create conversation:', error)
        alert(t('common.something_went_wrong'))
      } finally {
        setIsCreatingConversation(false)
      }
    },
    [org_id, session?.data?.tokens?.access_token, onSelectUser, onClose, t]
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('chat.start_new_chat')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder={t('chat.search_users')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Users List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <p>{t('chat.no_conversations')}</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  disabled={isCreatingConversation}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <img
                    src={
                      user.avatar_image ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                    }
                    alt={user.username}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {user.first_name || user.username}
                      {user.last_name && ` ${user.last_name}`}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      @{user.username}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewChatDialog
