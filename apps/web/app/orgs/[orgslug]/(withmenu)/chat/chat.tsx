'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'
import ConversationsList from '@components/Pages/Chat/ConversationsList'
import ChatWindow from '@components/Pages/Chat/ChatWindow'
import { useParams } from 'next/navigation'

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

  // Load conversations on mount
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
    <div className="flex h-full bg-background">
      {/* Conversations List - Left Sidebar (visible on all screens) */}
      <div
        className={`${selectedConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-1/4 border-r border-gray-200 flex flex-col`}
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

      {/* Chat Window - Right Content Area (visible on all screens when selected) */}
      <div
        className={`${selectedConversationId ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col`}
      >
        {selectedConversationId ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden p-2 border-b border-gray-200 flex items-center">
              <button
                onClick={() => setSelectedConversationId(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← {t('common.back')}
              </button>
            </div>
            <ChatWindow
              conversationId={selectedConversationId}
              onConversationUpdate={handleConversationUpdate}
            />
          </>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-gray-400">
            <p>{t('chat.select_user')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatClient
