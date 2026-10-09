'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, ArrowRight } from 'lucide-react'

interface QuizBlockProps {
  step: any
}

export default function QuizBlock({ step }: QuizBlockProps) {
  // Support both new `questions` array and old single question structure
  const questions = step.questions || [
    {
      content: step.content || step.text || '',
      options: step.options || [],
      correctOptionIndex: step.correctOptionIndex ?? 0,
    },
  ]

  const [selectedOptions, setSelectedOptions] = useState<
    Record<number, number | null>
  >({})
  const [submittedStatus, setSubmittedStatus] = useState<
    Record<number, boolean>
  >({})

  const storageKey = `quiz-state-${(questions[0]?.content || '').slice(0, 30).replace(/[^a-zA-Z0-9]/g, '')}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    const restoreTimeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey)
        if (!saved) return
        const parsed = JSON.parse(saved)
        if (parsed.selectedOptions) setSelectedOptions(parsed.selectedOptions)
        if (parsed.submittedStatus) setSubmittedStatus(parsed.submittedStatus)
      } catch {
        return
      }
    }, 0)

    return () => window.clearTimeout(restoreTimeout)
  }, [storageKey])

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    if (submittedStatus[qIndex]) return
    setSelectedOptions((prev) => {
      const next = { ...prev, [qIndex]: optIndex }
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ selectedOptions: next, submittedStatus })
        )
      }
      return next
    })
  }

  const handleSubmit = (qIndex: number) => {
    if (
      selectedOptions[qIndex] === undefined ||
      selectedOptions[qIndex] === null
    )
      return
    setSubmittedStatus((prev) => {
      const next = { ...prev, [qIndex]: true }
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ selectedOptions, submittedStatus: next })
        )
      }
      return next
    })
  }

  const getOptionStyle = (
    qIndex: number,
    optIndex: number,
    correctOptionIndex: number
  ) => {
    const isSubmitted = submittedStatus[qIndex]
    const selectedOption = selectedOptions[qIndex]

    if (!isSubmitted) {
      return selectedOption === optIndex
        ? 'border-blue-600 bg-blue-50 text-blue-700'
        : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
    }

    if (optIndex === correctOptionIndex) {
      return 'border-emerald-500 bg-emerald-50 text-emerald-700'
    }

    if (selectedOption === optIndex && optIndex !== correctOptionIndex) {
      return 'border-red-500 bg-red-50 text-red-700'
    }

    return 'border-slate-100 opacity-50 text-slate-400 cursor-not-allowed'
  }

  return (
    <div className="w-full max-w-3xl py-8 space-y-12">
      {questions.map((q: any, qIndex: number) => {
        const isSubmitted = submittedStatus[qIndex]
        const selectedOption = selectedOptions[qIndex]
        const correctOptionIndex = q.correctOptionIndex ?? 0

        return (
          <div key={qIndex} className="quiz-question">
            <div className="mb-8">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                Knowledge Check {questions.length > 1 ? ` ${qIndex + 1}` : ''}
              </p>
              <h3 className="text-xl font-bold text-slate-900 leading-relaxed">
                {q.content}
              </h3>
            </div>

            <div className="space-y-3 mb-8">
              {q.options.map((option: string, optIndex: number) => {
                const letter = String.fromCharCode(65 + optIndex) // A, B, C...

                return (
                  <button
                    key={optIndex}
                    onClick={() => handleSelectOption(qIndex, optIndex)}
                    disabled={isSubmitted}
                    className={`w-full flex items-center p-4 rounded-2xl border transition-all duration-300 group text-left ${getOptionStyle(qIndex, optIndex, correctOptionIndex)}`}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 text-sm font-black transition-colors ${
                        isSubmitted && optIndex === correctOptionIndex
                          ? 'bg-emerald-100 text-emerald-600'
                          : isSubmitted &&
                              selectedOption === optIndex &&
                              optIndex !== correctOptionIndex
                            ? 'bg-red-100 text-red-600'
                            : selectedOption === optIndex
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      {isSubmitted && optIndex === correctOptionIndex ? (
                        <Check size={16} strokeWidth={3} />
                      ) : isSubmitted &&
                        selectedOption === optIndex &&
                        optIndex !== correctOptionIndex ? (
                        <X size={16} strokeWidth={3} />
                      ) : (
                        letter
                      )}
                    </div>
                    <span className="flex-1 text-lg font-medium">{option}</span>
                  </button>
                )
              })}
            </div>

            {!isSubmitted ? (
              <button
                onClick={() => handleSubmit(qIndex)}
                disabled={
                  selectedOption === undefined || selectedOption === null
                }
                className={`flex items-center justify-center w-full md:w-auto px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-sm border ${
                  selectedOption !== undefined && selectedOption !== null
                    ? 'bg-blue-600 text-white hover:scale-[1.02] hover:bg-blue-700 border-transparent shadow-[0_4px_14px_rgba(37,99,235,0.3)]'
                    : 'bg-white text-slate-400 cursor-not-allowed border-slate-200 hover:bg-slate-50'
                }`}
              >
                Check Answer
                <ArrowRight size={14} className="ml-2" />
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-2xl border ${
                  selectedOption === correctOptionIndex
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <p
                  className={`font-semibold flex items-center gap-2 mb-1 ${
                    selectedOption === correctOptionIndex
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  {selectedOption === correctOptionIndex
                    ? 'Excellent! That is the correct answer.'
                    : 'Not quite. Review the material and try again.'}
                </p>
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )
}
