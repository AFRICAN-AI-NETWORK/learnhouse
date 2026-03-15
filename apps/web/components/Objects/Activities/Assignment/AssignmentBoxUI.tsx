import { useAssignmentSubmission } from '@components/Contexts/Assignments/AssignmentSubmissionContext'
import {
  BookPlus,
  BookUser,
  Code,
  EllipsisVertical,
  FileUp,
  Forward,
  InfoIcon,
  ListTodo,
  Save,
  Type,
} from 'lucide-react'
import React from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useTranslation } from 'react-i18next'

type AssignmentBoxProps = {
  type: 'quiz' | 'file' | 'form' | 'code_editor'
  view?: 'teacher' | 'student' | 'grading' | 'custom-grading'
  maxPoints?: number
  currentPoints?: number
  saveFC?: () => void
  submitFC?: () => void
  gradeFC?: () => void
  gradeCustomFC?: (grade: number) => void
  showSavingDisclaimer?: boolean
  isFocusMode?: boolean
  children: React.ReactNode
}

function AssignmentBoxUI({
  type,
  view,
  currentPoints,
  maxPoints,
  saveFC,
  submitFC,
  gradeFC,
  gradeCustomFC,
  showSavingDisclaimer,
  isFocusMode = false,
  children,
}: AssignmentBoxProps) {
  const { t } = useTranslation()
  const [customGrade, setCustomGrade] = React.useState<number>(0)
  const submission = useAssignmentSubmission() as any
  const session = useLHSession() as any

  // Check if user is authenticated
  const isAuthenticated = session?.status === 'authenticated'

  return (
    <div
      className={`flex flex-col px-3 sm:px-6 py-4 nice-shadow rounded-md w-full max-w-full lg:max-w-4xl mx-auto min-w-0 ${isFocusMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100/30'}`}
    >
      <div
        className={`flex flex-col sm:flex-row sm:justify-between sm:space-x-2 pb-2 sm:items-center ${isFocusMode ? 'text-zinc-400' : 'text-slate-400'}`}
      >
        {/* Left side with type and badges */}
        <div className="flex flex-wrap gap-2 items-center mb-2 sm:mb-0">
          <div className="text-lg font-semibold">
            {type === 'quiz' && (
              <div className="flex space-x-1.5 items-center">
                <ListTodo
                  size={17}
                  className={isFocusMode ? 'text-zinc-300' : ''}
                />
                <p className={isFocusMode ? 'text-zinc-100' : ''}>
                  {t('activities.quiz')}
                </p>
              </div>
            )}
            {type === 'file' && (
              <div className="flex space-x-1.5 items-center">
                <FileUp
                  size={17}
                  className={isFocusMode ? 'text-zinc-300' : ''}
                />
                <p className={isFocusMode ? 'text-zinc-100' : ''}>
                  {t('activities.file_submission')}
                </p>
              </div>
            )}
            {type === 'form' && (
              <div className="flex space-x-1.5 items-center">
                <Type
                  size={17}
                  className={isFocusMode ? 'text-zinc-300' : ''}
                />
                <p className={isFocusMode ? 'text-zinc-100' : ''}>
                  {t('activities.form')}
                </p>
              </div>
            )}
            {type === 'code_editor' && (
              <div className="flex space-x-1.5 items-center">
                <Code
                  size={17}
                  className={isFocusMode ? 'text-zinc-300' : ''}
                />
                <p className={isFocusMode ? 'text-zinc-100' : ''}>
                  {t('activities.code_editor')}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <EllipsisVertical size={15} />
          </div>
          {view === 'teacher' && (
            <div className="flex bg-amber-200/20 text-xs rounded-full space-x-1 px-2 py-0.5 font-bold items-center text-amber-600 outline-1 outline-amber-300/40">
              <BookUser size={12} />
              <p>{t('activities.teacher_view')}</p>
            </div>
          )}
          {maxPoints && (
            <div
              className={`flex text-xs rounded-full space-x-1 px-3 py-1 font-bold items-center transition-colors ${isFocusMode ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'bg-emerald-200/20 text-emerald-600 outline-1 outline-emerald-300/40'}`}
            >
              <BookPlus size={12} />
              <p>
                {maxPoints} {t('assignments.points')}
              </p>
            </div>
          )}
        </div>

        {/* Right side with buttons and actions */}
        <div className="flex flex-wrap gap-2 items-center">
          {showSavingDisclaimer && (
            <div
              className={`flex space-x-2 items-center font-semibold px-3 py-1 rounded-full w-full sm:w-auto mb-2 sm:mb-0 ${isFocusMode ? 'bg-red-400/10 border border-red-400/20 text-red-300 shadow-[0_0_10px_rgba(248,113,113,0.1)]' : 'outline-dashed outline-red-200 text-red-400 sm:mr-5'}`}
            >
              <InfoIcon size={14} />
              <p className="text-xs">{t('activities.dont_forget_to_save')}</p>
            </div>
          )}

          {/* Teacher button */}
          {view === 'teacher' && (
            <div
              onClick={() => saveFC && saveFC()}
              className={`flex px-2 py-1 cursor-pointer rounded-md space-x-2 items-center bg-linear-to-bl hover:bg-opacity-80 hover:outline-offset-4 active:outline-offset-1 linear transition-all outline-offset-2 outline-dashed ${isFocusMode ? 'text-emerald-400 bg-emerald-400/10 outline-emerald-400/40' : 'text-emerald-700 bg-emerald-300/20 outline-emerald-500/60'}`}
            >
              <Save size={14} />
              <p className="text-xs font-semibold">{t('common.save')}</p>
            </div>
          )}

          {/* Student button - only show if authenticated */}
          {view === 'student' && isAuthenticated && (
            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              {currentPoints !== undefined && currentPoints !== null && (
                <div
                  className={`flex space-x-2 items-center font-semibold px-3 py-1 rounded-full ${isFocusMode ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'bg-emerald-200/20 text-emerald-600 outline-1 outline-emerald-300/40'}`}
                >
                  <BookPlus size={12} />
                  <p className="text-xs">
                    {t('assignments.current_points', { points: currentPoints })}
                  </p>
                </div>
              )}
              <div
                onClick={() => submitFC && submitFC()}
                className={`flex px-4 py-1.5 cursor-pointer rounded-full space-x-2 items-center justify-center mx-auto w-full sm:w-auto transition-all hover:scale-105 active:scale-95 border-2 border-dashed ${isFocusMode ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/40 hover:bg-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'text-emerald-700 bg-emerald-300/20 border-emerald-500/60 hover:bg-emerald-300/30'}`}
              >
                <Forward size={14} />
                <p className="text-[11px] font-bold uppercase tracking-wider">
                  {submission && submission.length > 0
                    ? t('activities.resubmit')
                    : t('activities.save_your_progress')}
                </p>
              </div>
            </div>
          )}

          {/* Grading button */}
          {view === 'grading' && (
            <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto px-0.5 py-0.5 cursor-pointer rounded-md gap-2 sm:space-x-2 items-center bg-linear-to-bl hover:outline-offset-4 active:outline-offset-1 linear transition-all outline-offset-2 outline-dashed outline-orange-500/60">
              <p className="font-semibold px-2 text-xs text-orange-700">
                {t('assignments.current_points', { points: currentPoints })}
              </p>
              <div
                onClick={() => gradeFC && gradeFC()}
                className="bg-linear-to-bl text-orange-700 bg-orange-300/20 hover:bg-orange-300/10 items-center flex rounded-md px-2 py-1 space-x-2 ml-auto"
              >
                <BookPlus size={14} />
                <p className="text-xs font-semibold">
                  {t('assignments.grade')}
                </p>
              </div>
            </div>
          )}

          {/* CustomGrading button */}
          {view === 'custom-grading' && maxPoints && (
            <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto px-0.5 py-0.5 cursor-pointer rounded-md gap-2 sm:space-x-2 items-center bg-linear-to-bl hover:outline-offset-4 active:outline-offset-1 linear transition-all outline-offset-2 outline-dashed outline-orange-500/60">
              <p className="font-semibold px-2 text-xs text-orange-700 w-full sm:w-auto">
                {t('assignments.current_points', { points: currentPoints })}
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  onChange={(e) => setCustomGrade(parseInt(e.target.value))}
                  placeholder={maxPoints.toString()}
                  className="w-full sm:w-[100px] light-shadow text-sm py-0.5 outline outline-gray-200 rounded-lg px-2"
                  type="number"
                />
                <div
                  onClick={() => gradeCustomFC && gradeCustomFC(customGrade)}
                  className="bg-linear-to-bl text-orange-700 bg-orange-300/20 hover:bg-orange-300/10 items-center flex rounded-md px-2 py-1 space-x-2 whitespace-nowrap"
                >
                  <BookPlus size={14} />
                  <p className="text-xs font-semibold">
                    {t('assignments.grade')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

export default AssignmentBoxUI
