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
      setChatMessages((prev) => {
        if (prev.length <= 1) {
          return [
            {
              role: 'ai',
              text: "I'm here to help you understand this chapter! Need me to explain a concept in simpler terms? Just ask.",
            },
          ]
        }
        return prev
      })
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
              setChatMessages((prev) => {
                if (prev.length <= 1) {
                  return [
                    {
                      role: 'ai',
                      text: translated[0],
                    },
                  ]
                }
                return prev
              })
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
    <div className="h-full w-full flex flex-col bg-transparent">
      {/* Sidebar Header: Tools */}
      <div className="p-6 border-b border-slate-200/60 bg-white/50 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black flex items-center text-slate-800 text-xs uppercase tracking-[0.2em]">
            <Sparkles
              size={14}
              className="mr-3 text-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.2)]"
            />
            {t('ai.ask_ai', 'AI Learning Companion')}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Translation Tool */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center mb-4">
            <Languages size={14} className="text-blue-600 mr-2.5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t('common.language', 'Select Language')}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isTranslating}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 group shadow-sm"
              >
                <span className="font-medium">
                  {isTranslating
                    ? `${t('common.loading', 'Translating...')}`
                    : selectedLanguage}
                </span>
                <Languages
                  size={14}
                  className="text-slate-400 group-hover:text-blue-600 transition-colors"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-white border-slate-200 text-slate-700 max-h-[400px] overflow-y-auto shadow-xl rounded-xl backdrop-blur-2xl">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.nativeName)}
                  className="cursor-pointer hover:bg-slate-50 py-2.5 px-4 focus:bg-slate-100 transition-colors"
                >
                  <span className="font-semibold">{lang.nativeName}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''} max-w-[92%] ${msg.role === 'user' ? 'ml-auto' : ''}`}
          >
            {msg.role === 'ai' && (
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-4 mt-0.5 border border-blue-100 shadow-sm">
                <Sparkles size={16} />
              </div>
            )}
            <div
              className={`rounded-2xl px-5 py-4 text-sm leading-relaxed border shadow-sm ${
                msg.role === 'ai'
                  ? 'bg-white border-slate-200 text-slate-700 rounded-tl-none'
                  : 'bg-blue-600 text-white border-blue-700 rounded-tr-none shadow-blue-600/20'
              }`}
            >
              <p className="whitespace-pre-line overflow-hidden wrap-break-word font-medium">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        {isAsking && (
          <div className="flex items-start max-w-[92%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-4 mt-0.5 border border-blue-100">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-4 text-sm text-slate-500 shadow-sm">
              <div className="flex items-center space-x-3">
                <Loader2 size={14} className="animate-spin text-blue-600" />
                <span className="font-medium tracking-wide italic">
                  {dynamicLabels.thinking}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-6 bg-slate-50/80 backdrop-blur-xl border-t border-slate-200/60">
        <div className="relative flex items-center group">
          <MessageSquare
            size={16}
            className="absolute left-5 text-slate-400 group-focus-within:text-blue-600 transition-colors"
          />
          <input
            type="text"
            placeholder={dynamicLabels.placeholder}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAsking}
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-14 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 transition-all placeholder:text-slate-400 disabled:opacity-50 shadow-sm font-medium"
          />
          <button
            className="absolute right-2.5 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md shadow-blue-600/20"
            onClick={handleAskAI}
            disabled={isAsking || !chatInput.trim()}
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </div>
        <div className="mt-4 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
          Powered by African AI Engine
        </div>
      </div>
    </div>
  )
}

export default AISidebar
