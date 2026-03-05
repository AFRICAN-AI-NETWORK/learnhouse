import React from 'react'
import ChatClient from './chat'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat',
}

function ChatPage() {
  return (
    <div className="h-screen">
      <ChatClient />
    </div>
  )
}

export default ChatPage
