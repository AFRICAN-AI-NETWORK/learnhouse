'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, X, ArrowRight, HelpCircle } from 'lucide-react'
import { handleAssignmentTaskSubmission } from '@services/courses/assignments'
import { useLHSession } from '@components/Contexts/LHSessionContext'

interface QuizBlockProps {
  step: any
  matchingTask?: any
  assignmentUUID?: string
  onPassChange?: (passed: boolean, score?: number) => void
}

export default function QuizBlock({
  step,
  matchingTask,
  assignmentUUID,
  onPassChange,
}: QuizBlockProps) {
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  // Normalize questions to support both array of strings and object options, and both content/questionText
  const questions = useMemo(() => {
    const rawList = step?.questions || [
      {
        content: step?.content || step?.questionText || step?.text || '',
        options: step?.options || [],
        correctOptionIndex: step?.correctOptionIndex ?? 0,
        explanation: step?.explanation || '',
      },
    ]

    return rawList.map((q: any) => {
      const content = q.content || q.questionText || q.text || q.prompt || ''
      const rawOptions = q.options || []
      const options = rawOptions.map((opt: any) =>
        typeof opt === 'string' ? opt : opt.text || opt.content || ''
      )

      let correctIdx = q.correctOptionIndex
      if (
        correctIdx === undefined ||
        correctIdx === null ||
        correctIdx === -1
      ) {
        const found = rawOptions.findIndex(
          (opt: any) => typeof opt === 'object' && opt?.assigned_right_answer
        )
        correctIdx = found !== -1 ? found : 0
      }

      return {
        content,
        options,
        correctOptionIndex: correctIdx,
        explanation: q.explanation || '',
      }
    })
  }, [step])

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
      } catch (error) {
        console.error('Failed to load quiz state', error)
      }
    }, 0)

    return () => window.clearTimeout(restoreTimeout)
  }, [storageKey])

  // Report quiz completion/pass status to parent container:
  // A quiz gates progression until all questions are answered/submitted (allAnswered).
  // Once submitted, progression is unlocked even if incorrect (the student's grade/points
  // are affected instead via handleAssignmentTaskSubmission recording grade 0 vs 100).
  useEffect(() => {
    if (!questions || questions.length === 0) {
      onPassChange?.(true, 100)
      return
    }
    const allAnswered = questions.every(
      (_: any, idx: number) => submittedStatus[idx]
    )
    const correctCount = questions.filter(
      (q: any, idx: number) =>
        submittedStatus[idx] && selectedOptions[idx] === q.correctOptionIndex
    ).length
    const score = Math.round((correctCount / questions.length) * 100)

    onPassChange?.(allAnswered, score)
  }, [questions, submittedStatus, selectedOptions, onPassChange])

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

  const handleSubmit = async (qIndex: number) => {
    if (
      selectedOptions[qIndex] === undefined ||
      selectedOptions[qIndex] === null
    )
      return

    const updatedSubmitted = { ...submittedStatus, [qIndex]: true }
    setSubmittedStatus(updatedSubmitted)

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          selectedOptions,
          submittedStatus: updatedSubmitted,
        })
      )
    }

    // Optional background sync with linked assignment task
    if (matchingTask?.assignment_task_uuid && assignmentUUID && access_token) {
      try {
        const q = questions[qIndex]
        const isCorrect = selectedOptions[qIndex] === q.correctOptionIndex
        await handleAssignmentTaskSubmission(
          {
            assignment_task_submission_uuid: null,
            task_submission: {
              question_index: qIndex,
              selected_option: selectedOptions[qIndex],
              is_correct: isCorrect,
            },
            grade: isCorrect ? 100 : 0,
            task_submission_grade_feedback: isCorrect
              ? 'Correct answer submitted.'
              : 'Incorrect answer submitted.',
          },
          matchingTask.assignment_task_uuid,
          assignmentUUID,
          access_token
        )
      } catch (e) {
        // Silent catch for background sync
      }
    }
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
        ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/20'
        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-white/5 bg-white dark:bg-[#141414]'
    }

    if (optIndex === correctOptionIndex) {
      return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/30'
    }

    if (selectedOption === optIndex && optIndex !== correctOptionIndex) {
      return 'border-red-500 bg-red-50 dark:bg-red-500/15 text-red-800 dark:text-red-300 ring-1 ring-red-500/30'
    }

    return 'border-slate-100 dark:border-white/5 opacity-50 text-slate-400 dark:text-zinc-500 cursor-not-allowed bg-slate-50/50 dark:bg-white/[0.02]'
  }

  return (
    <div className="w-full max-w-3xl py-6 space-y-12">
      {questions.map((q: any, qIndex: number) => {
        const isSubmitted = submittedStatus[qIndex]
        const selectedOption = selectedOptions[qIndex]
        const correctOptionIndex = q.correctOptionIndex ?? 0

        return (
          <div
            key={qIndex}
            className="quiz-question bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm"
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                  <HelpCircle size={13} />
                  Knowledge Check{' '}
                  {questions.length > 1
                    ? `${qIndex + 1} of ${questions.length}`
                    : ''}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {q.content || 'Select the correct answer:'}
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              {q.options.map((option: string, optIndex: number) => {
                const letter = String.fromCharCode(65 + optIndex) // A, B, C...

                return (
                  <button
                    key={optIndex}
                    onClick={() => handleSelectOption(qIndex, optIndex)}
                    disabled={isSubmitted}
                    className={`w-full flex items-center p-4 rounded-xl border transition-all duration-200 group text-left ${getOptionStyle(
                      qIndex,
                      optIndex,
                      correctOptionIndex
                    )}`}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 text-sm font-black transition-colors ${
                        isSubmitted && optIndex === correctOptionIndex
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : isSubmitted &&
                              selectedOption === optIndex &&
                              optIndex !== correctOptionIndex
                            ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                            : selectedOption === optIndex
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 group-hover:bg-slate-200 dark:group-hover:bg-white/15'
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
                    <span className="flex-1 text-base sm:text-lg font-medium leading-normal">
                      {option}
                    </span>
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
                className={`flex items-center justify-center w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${
                  selectedOption !== undefined && selectedOption !== null
                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.01] shadow-blue-500/25 active:scale-95'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-200 dark:border-white/5'
                }`}
              >
                Check Answer
                <ArrowRight size={14} className="ml-2" />
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 sm:p-5 rounded-xl border ${
                  selectedOption === correctOptionIndex
                    ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                    : 'border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-200'
                }`}
              >
                <p className="font-bold flex items-center gap-2 mb-1">
                  {selectedOption === correctOptionIndex ? (
                    <>
                      <Check
                        size={18}
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                      Excellent! That is the correct answer.
                    </>
                  ) : (
                    <>
                      <X size={18} className="text-red-600 dark:text-red-400" />
                      Not quite. Review the explanation below:
                    </>
                  )}
                </p>
                {q.explanation && (
                  <p className="text-sm mt-2 opacity-90 leading-relaxed font-normal">
                    {q.explanation}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )
}
