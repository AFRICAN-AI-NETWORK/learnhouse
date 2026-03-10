import ChatClient from '../chat'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat',
}

function ChatConversationPage() {
  return (
    <div className="h-full">
      <ChatClient />
    </div>
  )
}

export default ChatConversationPage
