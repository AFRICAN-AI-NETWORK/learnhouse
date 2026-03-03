'use client'
import React, { useState } from 'react'
import AISidebar from './AISidebar'
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { getAPIUrl } from '@services/config/config'
import { useTranslation } from 'react-i18next'

interface SmartArticleActivityProps {
  activity: any
  course: any
  isFocusMode?: boolean
  onComplete?: () => void
  isCompleted?: boolean
}

function SmartArticleActivity({
  activity,
  course,
  isFocusMode = false,
  onComplete,
  isCompleted = false,
}: SmartArticleActivityProps) {
  const { t } = useTranslation()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: 'ai',
      text: "I'm here to help you understand this chapter! Need me to explain a concept in simpler terms? Just ask.",
    },
  ])
  const [translatedSteps, setTranslatedSteps] = useState<
    Record<number, { title: string; content: string }>
  >({})

  // Backend returns steps as [{title: "...", content: "..."}, ...]
  const steps = activity?.content?.steps || [
    {
      title: 'No Content',
      content: 'No content available. Instructor must upload or create steps.',
    },
  ]

  const totalSteps = steps.length
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1)
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (onComplete) {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1)
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleTranslate = async (languageName: string) => {
    setIsTranslating(true)
    try {
      const currentStep = steps[currentStepIndex]
      const stepText = currentStep?.content || currentStep?.text || ''
      const stepTitle = currentStep?.title || ''

      const res = await fetch(`${getAPIUrl()}activities/ai_interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'translate',
          text: stepText,
          title: stepTitle,
          language: languageName,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setTranslatedSteps((prev) => ({
          ...prev,
          [currentStepIndex]: {
            title: data.title || stepTitle,
            content: data.result || stepText,
          },
        }))
      }
    } catch (err) {
      // console.error('Translation failed:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  const currentText =
    translatedSteps[currentStepIndex]?.content ||
    steps[currentStepIndex]?.content ||
    steps[currentStepIndex]?.text
  const currentTitle =
    translatedSteps[currentStepIndex]?.title || steps[currentStepIndex]?.title
  const currentStepContent =
    steps[currentStepIndex]?.content || steps[currentStepIndex]?.text || ''

  return (
    <div
      className={`flex w-full overflow-hidden relative transition-all duration-500 z-10 ${
        isFocusMode
          ? 'h-screen rounded-none border-none'
          : 'h-[calc(100vh-320px)] min-h-[550px] rounded-2xl border border-white/10 shadow-2xl bg-zinc-950 ring-1 ring-white/5'
      }`}
    >
      {/* Immersive CSS Background - Only show if NOT in Focus Mode to avoid duplication */}
      {!isFocusMode && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40 z-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(61, 54, 84) 1px, #0000 1px), linear-gradient(rgb(61, 54, 84) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage:
              'repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px), repeating-linear-gradient(black 0px, black 3px, transparent 3px, transparent 8px), radial-gradient(60% 60%, rgb(0, 0, 0) 30%, transparent 70%)',
            WebkitMaskImage:
              'repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px), repeating-linear-gradient(black 0px, black 3px, transparent 3px, transparent 8px), radial-gradient(60% 60%, rgb(0, 0, 0) 30%, transparent 70%)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'xor',
          }}
        />
      )}

      {/* Left : Reading Pane */}
      <div
        className={`h-full flex flex-col relative border-r border-white/10 transition-all duration-500 ease-in-out z-10 ${
          isSidebarOpen ? 'w-[62%]' : 'w-full'
        }`}
      >
        {/* Progress Header */}
        <div className="flex items-center justify-between px-10 py-5 border-b border-white/10 backdrop-blur-md bg-zinc-950/40 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              {course?.name || 'Smart Article'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-1.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                style={{
                  width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                }}
              ></div>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 font-mono">
              {currentStepIndex + 1} / {totalSteps}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-10 py-8 relative z-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent scroll-smooth"
        >
          {isTranslating ? (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="h-8 bg-white/5 rounded-lg w-1/3 animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-3 bg-white/5 rounded w-full animate-pulse delay-75"></div>
                <div className="h-3 bg-white/5 rounded w-full animate-pulse delay-150"></div>
                <div className="h-3 bg-white/5 rounded w-5/6 animate-pulse delay-300"></div>
                <div className="h-3 bg-white/5 rounded w-full animate-pulse delay-500"></div>
              </div>
            </div>
          ) : (
            <div
              className={`max-w-3xl mx-auto ${isFocusMode ? 'text-center' : ''}`}
            >
              <div className="prose prose-invert prose-zinc max-w-none">
                {currentTitle && (
                  <h1
                    className={`text-3xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-white/60 ${isFocusMode ? 'mx-auto' : ''}`}
                  >
                    {currentTitle}
                  </h1>
                )}
                <div className="text-zinc-200 text-lg leading-[1.8] font-medium whitespace-pre-line selection:bg-primary/30 selection:text-white antialiased drop-shadow-sm">
                  {currentText}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-10 py-6 border-t border-white/10 backdrop-blur-xl bg-zinc-950/60 flex items-center justify-between z-10">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`group flex items-center px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${isFirstStep ? 'opacity-20 cursor-not-allowed text-zinc-600' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'}`}
          >
            <ArrowLeft
              size={14}
              className={`mr-2 transition-transform ${!isFirstStep && 'group-hover:-translate-x-1'}`}
            />
            {t('activities.back')}
          </button>

          <button
            onClick={handleNext}
            className={`group flex items-center px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all nice-shadow ${
              isLastStep
                ? isCompleted
                  ? 'bg-zinc-800 text-zinc-400 cursor-default'
                  : 'bg-primary text-white hover:scale-[1.05] shadow-[0_10px_30px_rgba(var(--primary),0.3)]'
                : 'bg-white text-zinc-950 hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 shadow-[0_10px_20px_rgba(255,255,255,0.1)]'
            }`}
          >
            {isLastStep
              ? isCompleted
                ? t('activities.completed')
                : t('activities.complete_lesson')
              : t('activities.next_step')}
            {!isLastStep && (
              <ArrowRight
                size={14}
                className="ml-3 transition-transform group-hover:translate-x-1"
              />
            )}
          </button>
        </div>

        {/* Floating Toggle Button (Appears when sidebar is closed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute bottom-28 right-8 p-4 rounded-full bg-white text-zinc-950 shadow-2xl hover:scale-110 active:scale-95 transition-all z-60 flex items-center space-x-2 group"
          >
            <Sparkles size={20} className="animate-pulse" />
            <span className="max-w-0 group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 ml-0 group-hover:ml-2">
              {t('ai.ask_ai', 'Ask AI')}
            </span>
          </button>
        )}
      </div>

      {/* Right : AI Sidebar */}
      {isSidebarOpen && (
        <div className="w-[38%] h-full bg-zinc-900/30 backdrop-blur-md relative z-20">
          <AISidebar
            onTranslate={handleTranslate}
            isTranslating={isTranslating}
            currentStepContent={currentStepContent}
            onClose={() => setIsSidebarOpen(false)}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
          />
        </div>
      )}
    </div>
  )
}

export default SmartArticleActivity
