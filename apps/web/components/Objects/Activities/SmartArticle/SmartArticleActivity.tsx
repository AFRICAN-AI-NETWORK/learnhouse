'use client'
import React, { useState } from 'react'
import AISidebar from './AISidebar'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { getAPIUrl } from '@services/config/config'

interface SmartArticleActivityProps {
  activity: any
  course: any
}

function SmartArticleActivity({ activity, course }: SmartArticleActivityProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatedSteps, setTranslatedSteps] = useState<
    Record<number, string>
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
    if (!isLastStep) setCurrentStepIndex(currentStepIndex + 1)
  }

  const handlePrev = () => {
    if (!isFirstStep) setCurrentStepIndex(currentStepIndex - 1)
  }

  const handleTranslate = async (languageName: string) => {
    setIsTranslating(true)
    try {
      const stepText =
        steps[currentStepIndex]?.content || steps[currentStepIndex]?.text || ''
      const res = await fetch(`${getAPIUrl()}activities/ai_interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'translate',
          text: stepText,
          language: languageName,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setTranslatedSteps((prev) => ({
          ...prev,
          [currentStepIndex]: data.result,
        }))
      }
    } catch (err) {
      console.error('Translation failed:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  const currentText =
    translatedSteps[currentStepIndex] ||
    steps[currentStepIndex]?.content ||
    steps[currentStepIndex]?.text
  const currentTitle = steps[currentStepIndex]?.title
  const currentStepContent =
    steps[currentStepIndex]?.content || steps[currentStepIndex]?.text || ''

  return (
    <div className="flex w-full h-[calc(100vh-100px)] mt-4 rounded-xl overflow-hidden border border-border nice-shadow">
      {/* Left 60% : Reading Pane */}
      <div className="w-[60%] h-full bg-card text-card-foreground flex flex-col relative border-r border-border">
        {/* Progress Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {course?.name}
            </span>
          </div>
          <div className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {currentStepIndex + 1} / {totalSteps}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-12 py-10 relative">
          {isTranslating ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-lg leading-relaxed text-foreground whitespace-pre-line tracking-wide">
              {currentTitle && (
                <h2 className="text-2xl font-bold mb-4 text-foreground">
                  {currentTitle}
                </h2>
              )}
              {currentText}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-8 py-6 border-t border-border bg-muted/10 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`flex items-center px-4 py-2 rounded-md font-semibold text-sm transition-all ${isFirstStep ? 'opacity-30 cursor-not-allowed text-muted-foreground' : 'text-card-foreground hover:bg-muted'}`}
          >
            <ArrowLeft size={16} className="mr-2" />
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={isLastStep}
            className={`flex items-center px-6 py-3 rounded-lg font-bold text-sm transition-all nice-shadow ${isLastStep ? 'opacity-30 cursor-not-allowed bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'}`}
          >
            {isLastStep ? 'Finish' : 'Next Step'}
            {!isLastStep && <ArrowRight size={16} className="ml-2" />}
          </button>
        </div>
      </div>

      {/* Right 40% : AI Sidebar */}
      <div className="w-[40%] h-full bg-muted/20">
        <AISidebar
          onTranslate={handleTranslate}
          isTranslating={isTranslating}
          currentStepContent={currentStepContent}
        />
      </div>
    </div>
  )
}

export default SmartArticleActivity
