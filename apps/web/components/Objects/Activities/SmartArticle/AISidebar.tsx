'use client'
import React, { useState, useEffect } from 'react'
import {
  Languages,
  Send,
  Sparkles,
  MessageSquare,
  Loader2,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { AVAILABLE_LANGUAGES } from '@/lib/languages'
import { getAPIUrl } from '@services/config/config'
import { useTranslation } from 'react-i18next'

interface AISidebarProps {
  onTranslate: (languageName: string) => void
  isTranslating: boolean
  currentStepContent: string
  onClose?: () => void
  chatMessages: any[]
  setChatMessages: React.Dispatch<React.SetStateAction<any[]>>
  selectedLanguage: string
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>
}

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

function AISidebar({
  onTranslate,
  isTranslating,
  currentStepContent,
  onClose,
  chatMessages,
  setChatMessages,
  selectedLanguage,
  setSelectedLanguage,
}: AISidebarProps) {
  const { t } = useTranslation()
  const [chatInput, setChatInput] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [dynamicLabels, setDynamicLabels] = useState({
    greeting:
      "I'm here to help you understand this chapter! Need me to explain a concept in simpler terms? Just ask.",
    thinking: 'Thinking...',
    placeholder: 'Ask AI about this step...',
  })

  // When selectedLanguage changes, translate the initial greeting and other UI elements via AI
  useEffect(() => {
    if (selectedLanguage === 'English') {
      setDynamicLabels({
        greeting:
          "I'm here to help you understand this chapter! Need me to explain a concept in simpler terms? Just ask.",
        thinking: 'Thinking...',
        placeholder: 'Ask AI about this step...',
      })
      setChatMessages([
        {
          role: 'ai',
          text: "I'm here to help you understand this chapter! Need me to explain a concept in simpler terms? Just ask.",
        },
      ])
      return
    }

    const translateUI = async () => {
      try {
        const res = await fetch(`${getAPIUrl()}activities/ai_interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'translate',
            text: `[
              "I'm here to help you understand this chapter! Need me to explain a concept in simpler terms? Just ask.",
              "Thinking...",
              "Ask AI about this step..."
            ]`,
            language: selectedLanguage,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          try {
            const translated = JSON.parse(data.result)
            if (Array.isArray(translated) && translated.length === 3) {
              setDynamicLabels({
                greeting: translated[0],
                thinking: translated[1],
                placeholder: translated[2],
              })
              setChatMessages([
                {
                  role: 'ai',
                  text: translated[0],
                },
              ])
            }
          } catch (e) {
            // Fallback if AI doesn't return clean JSON array
          }
        }
      } catch (err) {
        // AI translation failed for UI labels
      }
    }
    translateUI()
  }, [selectedLanguage, setChatMessages])

  const handleLanguageSelect = (langName: string) => {
    setSelectedLanguage(langName)
    onTranslate(langName)
  }

  const handleAskAI = async () => {
    const question = chatInput.trim()
    if (!question || isAsking) return

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
          language: selectedLanguage, // Backend now respects this
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
            text: 'Error occurred. Please try again.',
          },
        ])
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Connection error. Please try again.',
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
    <div className="h-full w-full flex flex-col bg-zinc-950/20 backdrop-blur-xl">
      {/* Sidebar Header: Tools */}
      <div className="p-6 border-b border-white/10 bg-zinc-950/40 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black flex items-center text-white text-xs uppercase tracking-[0.2em] opacity-80">
            <Sparkles
              size={14}
              className="mr-3 text-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
            />
            {t('ai.ask_ai', 'AI Learning Companion')}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Translation Tool */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
          <div className="flex items-center mb-4">
            <Languages size={14} className="text-primary mr-2.5 opacity-80" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {t('common.language', 'Select Language')}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isTranslating}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-zinc-200 hover:bg-zinc-800 hover:border-white/10 transition-all disabled:opacity-50 group"
              >
                <span className="font-medium">
                  {isTranslating
                    ? `${t('common.loading', 'Translating...')}`
                    : selectedLanguage}
                </span>
                <Languages
                  size={14}
                  className="text-zinc-500 group-hover:text-primary transition-colors"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-zinc-900 border-white/10 text-zinc-300 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 backdrop-blur-2xl">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.nativeName)}
                  className="cursor-pointer hover:bg-white/5 py-2.5 px-4 focus:bg-white/10 transition-colors"
                >
                  <span className="font-semibold">{lang.nativeName}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''} max-w-[92%] ${msg.role === 'user' ? 'ml-auto' : ''}`}
          >
            {msg.role === 'ai' && (
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mr-4 mt-0.5 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                <Sparkles size={16} />
              </div>
            )}
            <div
              className={`rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-xl border ${
                msg.role === 'ai'
                  ? 'bg-zinc-900/50 border-white/10 text-zinc-200 rounded-tl-none backdrop-blur-sm'
                  : 'bg-primary text-white border-primary/20 rounded-tr-none shadow-primary/20'
              }`}
            >
              <p className="whitespace-pre-line overflow-hidden wrap-break-word">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        {isAsking && (
          <div className="flex items-start max-w-[92%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mr-4 mt-0.5 border border-primary/20">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl rounded-tl-none px-5 py-4 text-sm text-zinc-400 backdrop-blur-sm shadow-xl">
              <div className="flex items-center space-x-3">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="font-medium tracking-wide italic">
                  {dynamicLabels.thinking}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-6 bg-zinc-950/40 backdrop-blur-xl border-t border-white/10">
        <div className="relative flex items-center group">
          <MessageSquare
            size={16}
            className="absolute left-5 text-zinc-500 group-focus-within:text-primary transition-colors"
          />
          <input
            type="text"
            placeholder={dynamicLabels.placeholder}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAsking}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-14 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-zinc-600 disabled:opacity-50"
          />
          <button
            className="absolute right-2.5 p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
            onClick={handleAskAI}
            disabled={isAsking || !chatInput.trim()}
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </div>
        <div className="mt-4 text-[10px] text-center text-zinc-600 font-bold uppercase tracking-widest opacity-50">
          Powered by African AI Engine
        </div>
      </div>
    </div>
  )
}

export default AISidebar
