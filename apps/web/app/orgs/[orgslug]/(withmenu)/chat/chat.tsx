'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'
import ConversationsList from '@components/Pages/Chat/ConversationsList'
import ChatWindow from '@components/Pages/Chat/ChatWindow'
import { useParams } from 'next/navigation'
import { MessageSquare } from 'lucide-react'

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

  const org_id = org?.id

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
        console.error('Failed to load conversations:', error)
      } finally {
        setIsLoadingConversations(false)
      }
    }

    loadConversations()
  }, [org_id, session?.data?.tokens?.access_token])

  const handleConversationSelect = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
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
        />
      </div>

      {/* Main Chat Area */}
      <div
        className={`${
          selectedConversationId ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col overflow-hidden`}
      >
        {selectedConversationId ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden px-4 py-3 border-b border-white/[0.06] bg-[#13131a] flex items-center gap-3">
              <button
                onClick={() => setSelectedConversationId(null)}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                {t('common.back')}
              </button>
            </div>
            <ChatWindow
              conversationId={selectedConversationId}
              onConversationUpdate={handleConversationUpdate}
            />
          </>
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
