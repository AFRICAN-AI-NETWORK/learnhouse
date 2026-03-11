'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Search, Loader2, UserSearch } from 'lucide-react'
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
  existingConversations?: Conversation[]
}

const NewChatDialog: React.FC<NewChatDialogProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  orgslug,
  existingConversations = [],
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
        // Error loading users
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [isOpen, org_id, session?.data?.tokens?.access_token])

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
      const existing = existingConversations.find(
        (conv) => conv.other_participant.id === user.id
      )
      if (existing) {
        onSelectUser(existing)
        onClose()
        setSearchQuery('')
        return
      }

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
            body: JSON.stringify({ participant_two_id: user.id }),
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
        // Error creating conversation
        alert(t('common.something_went_wrong'))
      } finally {
        setIsCreatingConversation(false)
      }
    },
    [
      org_id,
      session?.data?.tokens?.access_token,
      onSelectUser,
      onClose,
      t,
      existingConversations,
    ]
  )

  const getRoleBadge = (roleName?: string) => {
    const normalized = (roleName || '').toLowerCase()

    if (normalized === 'instructor') {
      return {
        label: 'Instructor',
        className:
          'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md border border-sky-400/35 bg-sky-500/15 text-sky-300',
      }
    }

    if (normalized === 'admin') {
      return {
        label: 'Admin',
        className:
          'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md border border-rose-400/35 bg-rose-500/15 text-rose-300',
      }
    }

    if (normalized === 'maintainer') {
      return {
        label: 'Maintainer',
        className:
          'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md border border-amber-400/35 bg-amber-500/15 text-amber-300',
      }
    }

    return {
      label: 'User',
      className:
        'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md border border-gray-400/35 bg-gray-500/15 text-gray-300',
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#17171f] border border-white/8 shadow-2xl shadow-black/60 rounded-2xl p-0 overflow-hidden [&>button]:bg-indigo-500 [&>button]:text-white [&>button]:border [&>button]:border-indigo-300/70 [&>button]:opacity-100 [&>button]:rounded-md [&>button]:p-1 [&>button]:right-4 [&>button]:top-4 [&>button:hover]:bg-indigo-400 [&>button:focus]:ring-2 [&>button:focus]:ring-indigo-300">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-white font-semibold text-lg tracking-tight">
            {t('chat.start_new_chat')}
          </DialogTitle>
          <p className="text-white/35 text-sm mt-1">Find someone to message</p>
        </DialogHeader>

        <div className="px-6 pt-4 pb-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
            />
            <input
              type="text"
              placeholder={t('chat.search_users')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
              autoFocus
              className="w-full bg-white/5 border border-white/8 text-white placeholder-white/25 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500/60 focus:bg-white/7 transition-all duration-200 disabled:opacity-40"
            />
          </div>

          {/* Users List */}
          <div className="max-h-80 overflow-y-auto -mx-1 px-1 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="animate-spin text-indigo-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/4 border border-white/6 flex items-center justify-center">
                  <UserSearch size={18} className="text-white/20" />
                </div>
                <p className="text-white/30 text-sm">
                  {t('chat.no_conversations')}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const displayName = user.first_name
                  ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
                  : user.username
                const roleBadge = getRoleBadge(user.role_name)

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    disabled={isCreatingConversation}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-150 disabled:opacity-40 group text-left"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={user.avatar_image || '/empty_avatar.png'}
                        alt={user.username}
                        className="w-10 h-10 rounded-full ring-2 ring-white/6 object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="text-sm font-semibold text-white/80 group-hover:text-white truncate transition-colors duration-150">
                          {displayName}
                        </div>
                        {roleBadge && (
                          <span className={roleBadge.className}>
                            {roleBadge.label}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/30 truncate">
                        @{user.username}
                      </div>
                    </div>
                    {isCreatingConversation && (
                      <Loader2
                        size={14}
                        className="animate-spin text-indigo-400 shrink-0"
                      />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewChatDialog
