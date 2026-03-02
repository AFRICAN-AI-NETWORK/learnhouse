'use client'
import React, { useState } from 'react'
import { Languages, Send, Sparkles, MessageSquare, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { AVAILABLE_LANGUAGES } from '@/lib/languages'
import { getAPIUrl } from '@services/config/config'

interface AISidebarProps {
  onTranslate: (languageKey: string) => void
  isTranslating: boolean
  currentStepContent: string
}

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

function AISidebar({
  onTranslate,
  isTranslating,
  currentStepContent,
}: AISidebarProps) {
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: "I'm here to help you understand this chapter! Need me to explain a concept in simpler terms? Just ask.",
    },
  ])
  const [isAsking, setIsAsking] = useState(false)

  const handleAskAI = async () => {
    const question = chatInput.trim()
    if (!question || isAsking) return

    // Add user message
    setChatMessages((prev) => [...prev, { role: 'user', text: question }])
    setChatInput('')
    setIsAsking(true)

    try {
      const res = await fetch(`${getAPIUrl()}activities/ai_interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'ask',
          text: currentStepContent,
          question: question,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setChatMessages((prev) => [...prev, { role: 'ai', text: data.result }])
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: 'Sorry, I encountered an error. Please try again.',
          },
        ])
      }
    } catch (err) {
      // Error handled in chat UI below
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Sorry, I could not connect to the AI service. Please try again.',
        },
      ])
    } finally {
      setIsAsking(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAskAI()
    }
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Sidebar Header: Tools */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center text-card-foreground">
            <Sparkles size={16} className="mr-2 text-primary" />
            AI Learning Companion
          </h3>
        </div>

        {/* Translation Tool */}
        <div className="bg-muted/50 p-4 rounded-xl border border-border nice-shadow">
          <div className="flex items-center mb-3">
            <Languages size={14} className="text-primary mr-2" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Translate Page
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isTranslating}
                className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <span>
                  {isTranslating ? 'Translating...' : 'Select Language...'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full bg-card border-border">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => onTranslate(lang.nativeName)}
                  className="cursor-pointer text-card-foreground hover:bg-muted"
                >
                  {lang.nativeName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-background space-y-4">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''} max-w-[90%] ${msg.role === 'user' ? 'ml-auto' : ''}`}
          >
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mr-3 mt-1 outline outline-primary/30">
                <Sparkles size={14} />
              </div>
            )}
            <div
              className={`rounded-2xl p-4 text-sm leading-relaxed nice-shadow whitespace-pre-line ${
                msg.role === 'ai'
                  ? 'bg-card border border-border rounded-tl-sm text-card-foreground'
                  : 'bg-primary text-primary-foreground rounded-tr-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isAsking && (
          <div className="flex items-start max-w-[90%]">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mr-3 mt-1 outline outline-primary/30">
              <Sparkles size={14} />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 text-sm text-card-foreground nice-shadow">
              <div className="flex items-center space-x-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-card border-t border-border">
        <div className="relative flex items-center">
          <MessageSquare
            size={16}
            className="absolute left-4 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Ask AI about this step..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAsking}
            className="w-full bg-background border border-border rounded-full py-3 pl-10 pr-12 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-inner placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-transform hover:scale-105 disabled:opacity-50"
            onClick={handleAskAI}
            disabled={isAsking || !chatInput.trim()}
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AISidebar
