'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import AISidebar from './AISidebar'
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  PlayCircle,
  CheckCircle2,
  Brain,
  Lightbulb,
  Globe,
  MapPin,
  Youtube,
  ShieldAlert,
  ScanFace,
  Mic,
  ListChecks,
  Check,
  MessageSquare,
  Circle,
  ChevronRight,
} from 'lucide-react'
import { getAPIUrl, getUriWithOrg } from '@services/config/config'
import { useTranslation } from 'react-i18next'
import {
  QuizBlock,
  CodeExerciseBlock,
  CustomAnswerBlock,
  FileSubmissionBlock,
} from './Blocks'

import TaskQuizObject from 'app/orgs/[orgslug]/dash/assignments/[assignmentuuid]/_components/TaskEditor/Subs/TaskTypes/TaskQuizObject'
import TaskCodeEditorObject from 'app/orgs/[orgslug]/dash/assignments/[assignmentuuid]/_components/TaskEditor/Subs/TaskTypes/TaskCodeEditorObject'
import TaskFormObject from 'app/orgs/[orgslug]/dash/assignments/[assignmentuuid]/_components/TaskEditor/Subs/TaskTypes/TaskFormObject'
import TaskFileObject from 'app/orgs/[orgslug]/dash/assignments/[assignmentuuid]/_components/TaskEditor/Subs/TaskTypes/TaskFileObject'

interface SmartArticleActivityProps {
  activity: any
  course: any
  isFocusMode?: boolean
  onComplete?: () => void
  isCompleted?: boolean
  prevActivity?: any
  nextActivity?: any
  currentIndex?: number
  totalActivities?: number
  orgslug?: string
  assignment?: any
  contributorStatus?: string
}

function SmartArticleActivity({
  activity,
  course,
  isFocusMode = false,
  onComplete,
  isCompleted = false,
  prevActivity,
  nextActivity,
  currentIndex = 0,
  totalActivities = 1,
  orgslug = '',
  assignment = null,
  contributorStatus,
}: SmartArticleActivityProps) {
  const { t } = useTranslation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: 'ai',
      text: "I'm here to help you understand this chapter! Need me to explain a concept in simpler terms? Just ask.",
    },
  ])
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  // Backend returns steps as [{title: "...", content: "..."}, ...]
  const steps = activity?.content?.steps || [
    {
      type: 'introduction',
      label: 'Start Here',
      title: 'No Content',
      content: 'No content available. Instructor must upload or create steps.',
    },
  ]

  const totalSteps = steps.length

  // Track which steps have been visited
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    new Set([0])
  )

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return

      const scrollPosition = contentRef.current.scrollTop
      const containerHeight = contentRef.current.clientHeight

      let newActiveIndex = 0
      let minDistance = Infinity

      steps.forEach((_: any, index: number) => {
        const element = document.getElementById(`step-${index}`)
        if (element) {
          const distance = Math.abs(
            element.offsetTop - scrollPosition - containerHeight * 0.2
          )
          if (distance < minDistance) {
            minDistance = distance
            newActiveIndex = index
          }
        }
      })

      setActiveStepIndex(newActiveIndex)
      setCompletedSteps((prev) => {
        const newSet = new Set(prev)
        // Mark current and all previous steps as completed
        for (let i = 0; i <= newActiveIndex; i++) {
          newSet.add(i)
        }
        return newSet
      })
    }

    const currentRef = contentRef.current
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll)
      return () => currentRef.removeEventListener('scroll', handleScroll)
    }
  }, [steps])

  const handleTranslate = async (languageName: string) => {
    setIsTranslating(true)
    try {
      const stepText = steps
        .map((s: any) => s.content || s.text || '')
        .join('\n')

      const res = await fetch(`${getAPIUrl()}activities/ai_interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'translate',
          text: stepText,
          title: activity?.name || 'Document',
          language: languageName,
        }),
      })
      if (res.ok) {
        // Translation logic would go here if we were replacing all blocks.
        // For now, we keep the structure intact.
      }
    } catch (err) {
      console.error('Translation failed:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  const renderBlock = (step: any, index: number) => {
    const type = step.type || 'text'
    const label = step.label || ''
    const title = step.title || ''

    const instructorLink =
      contributorStatus === 'ACTIVE' && assignment?.assignment_uuid ? (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-800 mb-2 sm:mb-0">
            <ShieldAlert size={16} />
            <span className="text-sm font-semibold">Instructor View:</span>
            <span className="text-sm text-emerald-700/80 hidden sm:inline">
              See student submissions in the dashboard
            </span>
          </div>
          <Link
            href={getUriWithOrg(
              orgslug,
              `/dash/assignments/${assignment.assignment_uuid.replace('assignment_', '')}`
            )}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            View Submissions
          </Link>
        </div>
      ) : null

    switch (type) {
      case 'introduction':
        return (
          <div
            id={`step-${index}`}
            className="mb-12 bg-blue-50/50 border border-blue-100 rounded-2xl p-8 lg:p-12 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    {index + 1}
                  </span>
                  {label || 'Start Here'}
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  {title}
                </h2>
                <p className="text-slate-600 leading-relaxed text-lg font-medium">
                  {step.content}
                </p>
              </div>
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-blue-100 flex items-center justify-center">
                  <PlayCircle size={64} className="text-blue-500 opacity-80" />
                </div>
              </div>
            </div>
          </div>
        )

      case 'learning_objectives':
        return (
          <div
            id={`step-${index}`}
            className="mb-12 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-8 lg:p-12 relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    {index + 1}
                  </span>
                  {label || 'Learning Objectives'}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  By the end of this lesson, you should be able to:
                </h2>
                <ul className="space-y-4">
                  {(step.objectives || []).map((obj: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-slate-700 font-medium"
                    >
                      <CheckCircle2
                        className="text-emerald-500 shrink-0 mt-0.5"
                        size={20}
                      />
                      <span className="leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden md:block w-40">
                <Target
                  size={120}
                  className="text-emerald-200"
                  strokeWidth={1.5}
                />
              </div>
            </div>
          </div>
        )

      case 'concept':
        return (
          <div
            id={`step-${index}`}
            className="mb-12 bg-white border border-slate-200 shadow-sm rounded-2xl p-8 lg:p-12"
          >
            <div className="flex flex-col md:flex-row gap-12">
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    {label || 'Understand'}
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    {title}
                  </h2>
                </div>

                <div className="space-y-8">
                  {(step.subsections || []).map((sub: any, i: number) => (
                    <div key={i} className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {sub.heading}
                      </h3>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {sub.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:flex w-1/3 items-center justify-center">
                <Brain size={140} className="text-slate-100" strokeWidth={1} />
              </div>
            </div>
          </div>
        )

      case 'analogy':
        return (
          <div
            id={`step-${index}`}
            className="mb-12 bg-rose-50/30 border border-rose-100 rounded-2xl p-8 lg:p-10 relative"
          >
            <div className="absolute top-8 right-8 text-rose-200">
              <Lightbulb size={64} strokeWidth={1} />
            </div>
            <div className="space-y-4 relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                  {index + 1}
                </span>
                {label || 'Think About It'}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
              <p className="text-slate-600 leading-relaxed font-medium">
                {step.content}
              </p>
              {step.example && (
                <div className="mt-6 p-6 bg-white rounded-xl border border-rose-100 shadow-sm text-slate-700 font-medium leading-relaxed italic">
                  "{step.example}"
                </div>
              )}
            </div>
          </div>
        )

      case 'real_world_examples':
        return (
          <div
            id={`step-${index}`}
            className="mb-12 bg-amber-50/30 border border-amber-100 rounded-2xl p-8 lg:p-12"
          >
            <div className="space-y-8">
              <div className="space-y-2 text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                    {index + 1}
                  </span>
                  {label || 'Real-World Examples'}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {(step.examples || []).map((ex: any, i: number) => {
                  // Fallback icons logic based on common names
                  let Icon = Globe
                  if (ex.name.toLowerCase().includes('map')) Icon = MapPin
                  if (
                    ex.name.toLowerCase().includes('youtube') ||
                    ex.name.toLowerCase().includes('video')
                  )
                    Icon = Youtube
                  if (
                    ex.name.toLowerCase().includes('bank') ||
                    ex.name.toLowerCase().includes('fraud')
                  )
                    Icon = ShieldAlert
                  if (ex.name.toLowerCase().includes('face')) Icon = ScanFace
                  if (ex.name.toLowerCase().includes('voice')) Icon = Mic

                  return (
                    <div
                      key={i}
                      className="bg-white p-6 rounded-xl border border-amber-100 shadow-sm flex flex-col sm:flex-row items-start text-left gap-5 transition-transform hover:-translate-y-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <Icon size={24} />
                      </div>
                      <div className="space-y-2 mt-1">
                        <h4 className="font-bold text-slate-900 text-base">
                          {ex.name}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {ex.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )

      case 'summary':
        return (
          <div
            id={`step-${index}`}
            className="mb-12 bg-teal-50/30 border border-teal-100 rounded-2xl p-8 lg:p-12"
          >
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="hidden md:block w-32">
                <ListChecks
                  size={100}
                  className="text-teal-200"
                  strokeWidth={1.5}
                />
              </div>
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">
                    {index + 1}
                  </span>
                  {label || 'Quick Recap'}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                <ul className="space-y-4">
                  {(step.items || []).map((item: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-slate-700 font-medium"
                    >
                      <Check
                        className="text-teal-500 shrink-0 mt-1"
                        size={18}
                      />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )

      case 'QUIZ': {
        // Try to find a matching assignment task for this quiz block
        // In case of multiple quizzes, match them sequentially
        const quizBlocks = steps.filter((s: any) => s.type === 'QUIZ')
        const myQuizIndex = quizBlocks.indexOf(step)
        const quizTasks =
          assignment?.assignment_tasks?.filter(
            (t: any) => t.assignment_type === 'QUIZ'
          ) || []
        const matchingTask = quizTasks[myQuizIndex] || quizTasks[0]

        if (matchingTask) {
          return (
            <div id={`step-${index}`} className="mb-12">
              {instructorLink}
              <TaskQuizObject
                view="student"
                assignmentTaskUUID={matchingTask.assignment_task_uuid}
                isFocusMode={isFocusMode}
              />
            </div>
          )
        }

        return (
          <div id={`step-${index}`} className="mb-12">
            {instructorLink}
            <QuizBlock step={step} />
          </div>
        )
      }
      case 'CODE_EXERCISE': {
        const codeBlocks = steps.filter((s: any) => s.type === 'CODE_EXERCISE')
        const myCodeIndex = codeBlocks.indexOf(step)
        const codeTasks =
          assignment?.assignment_tasks?.filter(
            (t: any) => t.assignment_type === 'CODE_EDITOR'
          ) || []
        const matchingTask = codeTasks[myCodeIndex] || codeTasks[0]

        if (matchingTask) {
          return (
            <div id={`step-${index}`} className="mb-12">
              {instructorLink}
              <TaskCodeEditorObject
                view="student"
                assignmentTaskUUID={matchingTask.assignment_task_uuid}
                isFocusMode={isFocusMode}
              />
            </div>
          )
        }
        return (
          <div id={`step-${index}`} className="mb-12">
            {instructorLink}
            <CodeExerciseBlock step={step} />
          </div>
        )
      }
      case 'CUSTOM_ANSWER': {
        const answerBlocks = steps.filter(
          (s: any) => s.type === 'CUSTOM_ANSWER'
        )
        const myAnswerIndex = answerBlocks.indexOf(step)
        const formTasks =
          assignment?.assignment_tasks?.filter(
            (t: any) => t.assignment_type === 'FORM'
          ) || []
        const matchingTask = formTasks[myAnswerIndex] || formTasks[0]

        if (matchingTask) {
          return (
            <div id={`step-${index}`} className="mb-12">
              {instructorLink}
              <TaskFormObject
                view="student"
                assignmentTaskUUID={matchingTask.assignment_task_uuid}
                isFocusMode={isFocusMode}
              />
            </div>
          )
        }
        return (
          <div id={`step-${index}`} className="mb-12">
            {instructorLink}
            <CustomAnswerBlock step={step} />
          </div>
        )
      }
      case 'FILE_SUBMISSION': {
        const fileBlocks = steps.filter(
          (s: any) => s.type === 'FILE_SUBMISSION'
        )
        const myFileIndex = fileBlocks.indexOf(step)
        const fileTasks =
          assignment?.assignment_tasks?.filter(
            (t: any) => t.assignment_type === 'FILE_UPLOAD'
          ) || []
        const matchingTask = fileTasks[myFileIndex] || fileTasks[0]

        if (matchingTask) {
          return (
            <div id={`step-${index}`} className="mb-12">
              {instructorLink}
              <TaskFileObject
                view="student"
                assignmentTaskUUID={matchingTask.assignment_task_uuid}
                isFocusMode={isFocusMode}
              />
            </div>
          )
        }
        return (
          <div id={`step-${index}`} className="mb-12">
            {instructorLink}
            <FileSubmissionBlock step={step} />
          </div>
        )
      }
      case 'IMAGE':
        return (
          <div
            id={`step-${index}`}
            className="mb-12 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-hidden flex flex-col items-center"
          >
            <div className="w-full max-w-4xl rounded-xl overflow-hidden bg-slate-50 flex justify-center">
              <img
                src={step.url || step.content}
                alt={step.caption || title || 'Article Image'}
                className="max-w-full h-auto object-contain max-h-[70vh]"
              />
            </div>
            {step.caption && (
              <p className="mt-4 text-sm text-slate-500 font-medium text-center max-w-2xl">
                {step.caption}
              </p>
            )}
          </div>
        )

      case 'EMBED':
        let embedUrl = step.url || step.content || ''
        // basic youtube conversion if it's a watch url
        if (embedUrl.includes('youtube.com/watch?v=')) {
          embedUrl = embedUrl.replace('watch?v=', 'embed/')
        } else if (embedUrl.includes('youtu.be/')) {
          embedUrl = embedUrl.replace('youtu.be/', 'youtube.com/embed/')
        }
        return (
          <div
            id={`step-${index}`}
            className="mb-12 bg-[#0f0f13] border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex justify-center w-full"
          >
            <div
              className="w-full aspect-video"
              style={{ maxHeight: '50vh', maxWidth: 'calc(50vh * 16 / 9)' }}
            >
              <iframe
                src={embedUrl}
                title={title || 'Embedded Content'}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )

      default:
        // Fallback for basic text/unknown blocks
        return (
          <div
            id={`step-${index}`}
            className="mb-12 p-8 lg:p-10 bg-white border border-slate-200 rounded-2xl shadow-sm"
          >
            <div className="space-y-4">
              {title && (
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    {label || 'Section'}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                </div>
              )}
              <div className="prose prose-slate max-w-none text-slate-700 text-lg leading-relaxed font-medium whitespace-pre-line">
                {step.content || step.text}
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={`flex w-full flex-1 min-h-0 bg-[#F8FAFC]`}>
      {/* Left : Reading Pane */}
      <div
        className={`flex-1 min-w-0 min-h-0 flex flex-col relative transition-all duration-500 ease-in-out`}
      >
        {/* Header Breadcrumb */}
        <div className="px-8 lg:px-12 py-8 bg-white border-b border-slate-200 flex flex-col gap-4 shrink-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
              <span className="truncate max-w-[200px] hover:text-slate-900 transition-colors cursor-pointer">
                {course?.name || 'AINA Course'}
              </span>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="text-slate-800 truncate max-w-[250px]">
                {activity?.name || 'Lesson'}
              </span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              {prevActivity ? (
                <Link
                  href={getUriWithOrg(
                    orgslug || '',
                    `/course/${course?.course_uuid?.replace('course_', '')}/activity/${prevActivity.cleanUuid}`
                  )}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <ArrowLeft size={16} /> Previous Lesson
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
                >
                  <ArrowLeft size={16} /> Previous Lesson
                </button>
              )}
              <span className="text-xs font-bold text-slate-400">
                {currentIndex + 1} / {totalActivities}
              </span>
              {nextActivity ? (
                <Link
                  href={getUriWithOrg(
                    orgslug || '',
                    `/course/${course?.course_uuid?.replace('course_', '')}/activity/${nextActivity.cleanUuid}`
                  )}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
                >
                  Next Lesson <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed"
                >
                  Next Lesson <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-black text-slate-900 mt-2">
            {activity?.name || 'Smart Article'}
          </h1>
          <p className="text-slate-600 font-medium">
            Complete the activities below to finish this lesson.
          </p>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative min-h-0">
          <div
            ref={contentRef}
            className="absolute inset-0 overflow-y-auto px-8 lg:px-12 pt-4"
          >
            <div className="max-w-7xl mx-auto pb-4">
              {steps.map((step: any, index: number) => (
                <React.Fragment key={index}>
                  {renderBlock(step, index)}
                </React.Fragment>
              ))}

              {/* Completion Block */}
              <div className="mt-16 mb-16 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 mb-1">
                      Lesson Complete!
                    </h2>
                    <p className="text-slate-500 text-sm max-w-lg">
                      You've reached the end of this lesson. Great work!
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onComplete && !isCompleted) onComplete()
                    // Optionally scroll to top or navigate if nextActivity exists
                  }}
                  disabled={isCompleted}
                  className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-sm shrink-0 ${
                    isCompleted
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {isCompleted ? 'Completed' : 'Mark as Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right : Sidebar Progress & AI */}
      <div
        className={`w-80 shrink-0 bg-transparent flex flex-col gap-6 px-6 py-8 overflow-y-auto border-l border-slate-200`}
      >
        {/* Lesson Progress (Top Half) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">Lesson Progress</h3>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${isCompleted ? 100 : Math.max(10, (activeStepIndex / Math.max(1, totalSteps - 1)) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              {isCompleted
                ? 100
                : Math.round(
                    (activeStepIndex / Math.max(1, totalSteps - 1)) * 100
                  )}
              %
            </span>
          </div>

          <div className="space-y-1 relative">
            <div className="absolute left-[11px] top-4 bottom-4 w-px bg-slate-200 z-0"></div>
            {steps.map((step: any, index: number) => {
              const isActive = index === activeStepIndex
              const isPast =
                isCompleted ||
                (completedSteps.has(index) && index !== activeStepIndex)
              return (
                <div
                  key={index}
                  className="flex items-center gap-4 relative z-10 py-2"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border-2 transition-colors ${
                      isActive && !isCompleted
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : isPast
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 text-slate-400 bg-white'
                    }`}
                  >
                    {isPast ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <Circle size={12} strokeWidth={3} />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors ${isActive && !isCompleted ? 'text-blue-700 font-bold' : isPast ? 'text-slate-700' : 'text-slate-400'}`}
                  >
                    {step.label || step.title || `Section ${index + 1}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Need Help? Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">
                Ask AI Tutor
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Get instant help with this lesson
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* AI Tutor Chat Overlay (shown when requested) */}
      {isSidebarOpen && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white/95 backdrop-blur-3xl shadow-[-10px_0_40px_rgba(0,0,0,0.05)] border-l border-slate-200/50 z-50 flex flex-col animate-in slide-in-from-right-8 duration-300">
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <AISidebar
              onTranslate={handleTranslate}
              isTranslating={isTranslating}
              currentStepContent={
                steps[activeStepIndex]?.content ||
                steps[activeStepIndex]?.text ||
                ''
              }
              onClose={() => setIsSidebarOpen(false)}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default SmartArticleActivity
