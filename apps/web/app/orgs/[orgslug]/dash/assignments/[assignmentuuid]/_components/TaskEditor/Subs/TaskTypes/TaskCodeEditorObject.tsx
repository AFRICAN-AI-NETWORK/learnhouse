import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import {
  useAssignmentsTask,
  useAssignmentsTaskDispatch,
} from '@components/Contexts/Assignments/AssignmentsTaskContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useAssignmentSubmission } from '@components/Contexts/Assignments/AssignmentSubmissionContext'
import {
  getAssignmentTask,
  getAssignmentTaskSubmissionsMe,
  getAssignmentTaskSubmissionsUser,
  updateAssignmentTask,
  handleAssignmentTaskSubmission,
  executeCode,
} from '@services/courses/assignments'
import {
  Code,
  Lightbulb,
  Minus,
  Plus,
  PlusCircle,
  X,
  Play,
  Terminal,
  AlertCircle,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import { useTranslation } from 'react-i18next'
import dynamic from 'next/dynamic'
import AssignmentBoxUI from '@components/Objects/Activities/Assignment/AssignmentBoxUI'

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

// Language options for code editor
const SUPPORTED_LANGUAGES = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'java', name: 'Java' },
  { id: 'c', name: 'C' },
  { id: 'cpp', name: 'C++' },
  { id: 'go', name: 'Go' },
  { id: 'ruby', name: 'Ruby' },
]

type CodeExerciseSchema = {
  exerciseUUID: string
  title: string
  description: string
  language: string
  starterCode: string
  solutionCode: string
  testCases: {
    testUUID: string
    input: string
    expectedOutput: string
    isHidden: boolean
    description: string
  }[]
}

type CodeSubmitSchema = {
  exercises: CodeExerciseSchema[]
  submissions: {
    exerciseUUID: string
    code: string
  }[]
  assignment_task_submission_uuid?: string
}

type TaskCodeEditorObjectProps = {
  view?: 'teacher' | 'student' | 'grading' | 'custom-grading'
  user_id?: string
  assignmentTaskUUID?: string
}

function TaskCodeEditorObject({
  view,
  assignmentTaskUUID,
  user_id,
}: TaskCodeEditorObjectProps) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const assignmentTask = useAssignmentsTask() as any
  const assignmentTaskStateHook = useAssignmentsTaskDispatch() as any
  const assignment = useAssignments() as any
  const submission = useAssignmentSubmission() as any
  const assignmentUUID = assignment?.assignment_object?.assignment_uuid

  // For student/grading views: fetch task data directly (like TaskQuizObject)
  const [assignmentTaskDirect, setAssignmentTaskDirect] = useState<any>(null)
  const initialFetchRef = React.useRef(false)

  // STUDENT: Submissions state
  const [studentSubmissions, setStudentSubmissions] = useState<
    { exerciseUUID: string; code: string }[]
  >(() => {
    const exercisesInTask =
      assignmentTask?.assignmentTask?.contents?.exercises || []

    if (view === 'student' && submission?.submission) {
      const submissionData = submission.submission as CodeSubmitSchema
      if (submissionData.submissions && submissionData.submissions.length > 0) {
        // Merge existing submissions with starter code for any new exercises
        return exercisesInTask.map((ex: CodeExerciseSchema) => {
          const existing = submissionData.submissions.find(
            (s) => s.exerciseUUID === ex.exerciseUUID
          )
          return {
            exerciseUUID: ex.exerciseUUID,
            code: existing ? existing.code : ex.starterCode || '',
          }
        })
      }
    }
    return exercisesInTask.map((ex: CodeExerciseSchema) => ({
      exerciseUUID: ex.exerciseUUID,
      code: ex.starterCode || '',
    }))
  })

  useEffect(() => {
    let isMounted = true
    if (
      (view === 'student' || view === 'grading' || view === 'custom-grading') &&
      !initialFetchRef.current &&
      assignmentTaskUUID &&
      access_token
    ) {
      initialFetchRef.current = true

      const fetchData = async () => {
        // Fetch Task
        const taskRes = await getAssignmentTask(
          assignmentTaskUUID,
          access_token
        )
        if (isMounted && taskRes.success) {
          setAssignmentTaskDirect(taskRes.data)
        }

        // Fetch Submission
        if (assignmentUUID) {
          let subRes
          if (view === 'student') {
            subRes = await getAssignmentTaskSubmissionsMe(
              assignmentTaskUUID,
              assignmentUUID,
              access_token
            )
          } else if (
            (view === 'grading' || view === 'custom-grading') &&
            user_id
          ) {
            subRes = await getAssignmentTaskSubmissionsUser(
              assignmentTaskUUID,
              user_id,
              assignmentUUID,
              access_token
            )
          }

          if (isMounted && subRes?.success && subRes.data?.task_submission) {
            const submissionData = subRes.data
              .task_submission as CodeSubmitSchema
            if (submissionData.submissions) {
              setStudentSubmissions(submissionData.submissions)
            }
          }
        }
      }

      fetchData()
    }
    return () => {
      isMounted = false
    }
  }, [view, assignmentTaskUUID, access_token, assignmentUUID, user_id])

  // Use directly fetched data for student/grading, context data for teacher
  const activeTaskData =
    view === 'student' || view === 'grading' || view === 'custom-grading'
      ? assignmentTaskDirect
      : assignmentTask?.assignmentTask

  const exercisesData = React.useMemo(
    () => activeTaskData?.contents?.exercises || [],
    [activeTaskData?.contents?.exercises]
  )

  // Execution Results state
  const [executionResults, setExecutionResults] = useState<
    Record<
      string,
      {
        stdout: string
        stderr: string
        exit_code: number
        execution_time_ms: number
        loading: boolean
      }
    >
  >({})

  // Create an empty exercise template
  function createEmptyExercise(): CodeExerciseSchema {
    return {
      exerciseUUID: 'exercise_' + uuidv4(),
      title: '',
      description: '',
      language: 'python',
      starterCode: '# Write your code here\n',
      solutionCode: '# Reference solution\n',
      testCases: [],
    }
  }

  // Create an empty test case template
  function createEmptyTestCase() {
    return {
      testUUID: 'test_' + uuidv4(),
      input: '',
      expectedOutput: '',
      isHidden: false,
      description: '',
    }
  }

  // TEACHER: Exercises state
  const [exercises, setExercises] = useState<CodeExerciseSchema[]>(() => {
    if (view === 'teacher' && assignmentTask?.assignmentTask?.contents) {
      const contents = assignmentTask.assignmentTask.contents as {
        exercises?: CodeExerciseSchema[]
      }
      if (contents.exercises && contents.exercises.length > 0) {
        return contents.exercises
      }
    }
    return [createEmptyExercise()]
  })

  // Update studentSubmissions when assignmentTask changes (e.g. on first load)
  React.useEffect(() => {
    if (
      view === 'student' &&
      exercisesData.length > 0 &&
      studentSubmissions.length === 0
    ) {
      setStudentSubmissions(
        exercisesData.map((ex: CodeExerciseSchema) => ({
          exerciseUUID: ex.exerciseUUID,
          code: ex.starterCode || '',
        }))
      )
    }
  }, [exercisesData, view, studentSubmissions.length, setStudentSubmissions])

  // Add a new exercise
  const addExercise = () => {
    if (exercises.length >= 10) {
      toast.error(t('dashboard.assignments.editor.max_exercises_reached'))
      return
    }
    setExercises([...exercises, createEmptyExercise()])
  }

  // Remove an exercise
  const removeExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index)
    setExercises(newExercises)
  }

  // Update exercise field
  const updateExercise = (
    index: number,
    field: keyof CodeExerciseSchema,
    value: any
  ) => {
    const newExercises = [...exercises]
    newExercises[index] = { ...newExercises[index], [field]: value }
    setExercises(newExercises)
  }

  // Add test case to exercise
  const addTestCase = (exerciseIndex: number) => {
    const newExercises = [...exercises]
    if (newExercises[exerciseIndex].testCases.length >= 20) {
      toast.error(t('dashboard.assignments.editor.max_test_cases_reached'))
      return
    }
    newExercises[exerciseIndex].testCases.push(createEmptyTestCase())
    setExercises(newExercises)
  }

  // Remove test case
  const removeTestCase = (exerciseIndex: number, testIndex: number) => {
    const newExercises = [...exercises]
    newExercises[exerciseIndex].testCases = newExercises[
      exerciseIndex
    ].testCases.filter((_, i) => i !== testIndex)
    setExercises(newExercises)
  }

  // Update test case
  const updateTestCase = (
    exerciseIndex: number,
    testIndex: number,
    field: string,
    value: any
  ) => {
    const newExercises = [...exercises]
    newExercises[exerciseIndex].testCases[testIndex] = {
      ...newExercises[exerciseIndex].testCases[testIndex],
      [field]: value,
    }
    setExercises(newExercises)
  }

  // Save function (teacher)
  const saveFC = async () => {
    try {
      const contents = { exercises }
      await updateAssignmentTask(
        { contents },
        assignmentTask.assignmentTask.assignment_task_uuid,
        assignment.assignment_object.assignment_uuid,
        access_token
      )
      toast.success(t('dashboard.assignments.editor.toasts.task_saved'))
    } catch (error) {
      toast.error(t('dashboard.assignments.editor.toasts.task_save_failed'))
    }
  }

  // Submit function (student)
  const submitFC = async () => {
    try {
      const submissionData: CodeSubmitSchema = {
        exercises: activeTaskData?.contents?.exercises || [],
        submissions: studentSubmissions,
      }

      await handleAssignmentTaskSubmission(
        { task_submission: submissionData },
        assignmentTaskUUID || activeTaskData?.assignment_task_uuid,
        assignment.assignment_object.assignment_uuid,
        access_token
      )
      toast.success(t('activities.submission_saved'))
    } catch (error) {
      toast.error(t('activities.submission_failed'))
    }
  }

  // Manual Grade function (instructor)
  const gradeCustomFC = async (grade: number) => {
    if (assignmentTaskUUID && access_token && assignmentUUID) {
      try {
        const submissionData: CodeSubmitSchema = {
          exercises: activeTaskData?.contents?.exercises || [],
          submissions: studentSubmissions,
        }

        await handleAssignmentTaskSubmission(
          {
            task_submission: submissionData,
            grade: grade,
            task_submission_grade_feedback: 'Graded by instructor',
          },
          assignmentTaskUUID,
          assignmentUUID,
          access_token
        )

        toast.success(
          t('dashboard.assignments.submissions.toasts.graded_success', {
            grade,
          })
        )
      } catch (error) {
        toast.error(t('dashboard.assignments.submissions.toasts.graded_failed'))
      }
    }
  }

  // Update student code
  const updateStudentCode = (exerciseUUID: string, code: string) => {
    setStudentSubmissions((prev) => {
      const existing = prev.find((s) => s.exerciseUUID === exerciseUUID)
      if (existing) {
        return prev.map((s) =>
          s.exerciseUUID === exerciseUUID ? { ...s, code } : s
        )
      } else {
        return [...prev, { exerciseUUID, code }]
      }
    })
  }

  // Run Code function
  const runCodeFC = async (exercise: CodeExerciseSchema) => {
    const studentCode =
      studentSubmissions.find((s) => s.exerciseUUID === exercise.exerciseUUID)
        ?.code || exercise.starterCode

    setExecutionResults((prev) => ({
      ...prev,
      [exercise.exerciseUUID]: {
        ...prev[exercise.exerciseUUID],
        loading: true,
        stdout: '',
        stderr: '',
        exit_code: 0,
        execution_time_ms: 0,
      },
    }))

    try {
      const res = await executeCode(
        {
          language: exercise.language,
          code: studentCode,
        },
        access_token
      )

      if (res.success) {
        setExecutionResults((prev) => ({
          ...prev,
          [exercise.exerciseUUID]: {
            loading: false,
            stdout: res.data.stdout,
            stderr: res.data.stderr,
            exit_code: res.data.exit_code,
            execution_time_ms: res.data.execution_time_ms,
          },
        }))
      } else {
        toast.error(t('activities.execution_failed'))
        setExecutionResults((prev) => ({
          ...prev,
          [exercise.exerciseUUID]: {
            ...prev[exercise.exerciseUUID],
            loading: false,
          },
        }))
      }
    } catch (error) {
      toast.error(t('activities.execution_error'))
      setExecutionResults((prev) => ({
        ...prev,
        [exercise.exerciseUUID]: {
          ...prev[exercise.exerciseUUID],
          loading: false,
        },
      }))
    }
  }

  // TEACHER VIEW
  if (view === 'teacher') {
    return (
      <AssignmentBoxUI
        type="code_editor"
        view="teacher"
        saveFC={saveFC}
        maxPoints={activeTaskData?.max_grade_value}
      >
        <div className="flex flex-col space-y-6 w-full max-w-full overflow-hidden mt-4 min-w-0">
          {exercises.map((exercise, exIndex) => (
            <div
              key={exercise.exerciseUUID}
              className="flex flex-col space-y-4 p-6 bg-gray-50 rounded-lg border border-gray-200 w-full min-w-0"
            >
              {/* Exercise Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-700">
                  {t('dashboard.assignments.editor.exercise')} {exIndex + 1}
                </h3>
                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(exIndex)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('dashboard.assignments.editor.title')}
                </label>
                <input
                  type="text"
                  value={exercise.title}
                  onChange={(e) =>
                    updateExercise(exIndex, 'title', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t(
                    'dashboard.assignments.editor.exercise_title_placeholder'
                  )}
                />
              </div>

              {/* Language Selector */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('dashboard.assignments.editor.language')}
                </label>
                <select
                  value={exercise.language}
                  onChange={(e) =>
                    updateExercise(exIndex, 'language', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('dashboard.assignments.editor.description')}
                </label>
                <textarea
                  value={exercise.description}
                  onChange={(e) =>
                    updateExercise(exIndex, 'description', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder={t(
                    'dashboard.assignments.editor.exercise_description_placeholder'
                  )}
                />
              </div>

              {/* Starter Code */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('dashboard.assignments.editor.starter_code')}
                </label>
                <div className="border border-gray-300 rounded-md overflow-hidden h-[200px] relative w-full mt-1">
                  <div className="absolute inset-0">
                    <Editor
                      height="100%"
                      width="100%"
                      language={exercise.language}
                      value={exercise.starterCode}
                      onChange={(value) =>
                        updateExercise(exIndex, 'starterCode', value || '')
                      }
                      theme="vs-light"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Solution Code */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('dashboard.assignments.editor.solution_code')}
                  <span className="text-xs text-gray-500 ml-2">
                    ({t('dashboard.assignments.editor.hidden_from_students')})
                  </span>
                </label>
                <div className="border border-gray-300 rounded-md overflow-hidden h-[200px] relative w-full mt-1">
                  <div className="absolute inset-0">
                    <Editor
                      height="100%"
                      width="100%"
                      language={exercise.language}
                      value={exercise.solutionCode}
                      onChange={(value) =>
                        updateExercise(exIndex, 'solutionCode', value || '')
                      }
                      theme="vs-light"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Test Cases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {t('dashboard.assignments.editor.test_cases')}
                  </label>
                  <button
                    onClick={() => addTestCase(exIndex)}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <PlusCircle size={16} />
                    <span>
                      {t('dashboard.assignments.editor.add_test_case')}
                    </span>
                  </button>
                </div>

                {exercise.testCases.map((testCase, testIndex) => (
                  <div
                    key={testCase.testUUID}
                    className="p-4 bg-white border border-gray-200 rounded-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        {t('dashboard.assignments.editor.test_case')}{' '}
                        {testIndex + 1}
                      </span>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={testCase.isHidden}
                            onChange={(e) =>
                              updateTestCase(
                                exIndex,
                                testIndex,
                                'isHidden',
                                e.target.checked
                              )
                            }
                            className="rounded"
                          />
                          <span>
                            {t('dashboard.assignments.editor.hidden')}
                          </span>
                        </label>
                        <button
                          onClick={() => removeTestCase(exIndex, testIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={testCase.description}
                      onChange={(e) =>
                        updateTestCase(
                          exIndex,
                          testIndex,
                          'description',
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                      placeholder={t(
                        'dashboard.assignments.editor.test_description_placeholder'
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">
                          {t('dashboard.assignments.editor.input')}
                        </label>
                        <textarea
                          value={testCase.input}
                          onChange={(e) =>
                            updateTestCase(
                              exIndex,
                              testIndex,
                              'input',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono"
                          rows={2}
                          placeholder="stdin input"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">
                          {t('dashboard.assignments.editor.expected_output')}
                        </label>
                        <textarea
                          value={testCase.expectedOutput}
                          onChange={(e) =>
                            updateTestCase(
                              exIndex,
                              testIndex,
                              'expectedOutput',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono"
                          rows={2}
                          placeholder="expected stdout"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add Exercise Button */}
          {exercises.length < 10 && (
            <button
              onClick={addExercise}
              className="flex items-center justify-center space-x-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              <Plus size={20} />
              <span>{t('dashboard.assignments.editor.add_exercise')}</span>
            </button>
          )}
        </div>
      </AssignmentBoxUI>
    )
  }

  // STUDENT VIEW
  if (view === 'student') {
    return (
      <AssignmentBoxUI
        type="code_editor"
        view="student"
        submitFC={submitFC}
        maxPoints={activeTaskData?.max_grade_value}
      >
        <div className="flex flex-col space-y-8 w-full max-w-full overflow-hidden mt-6 min-w-0 pb-4">
          {exercisesData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Code className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-800 font-bold text-sm uppercase tracking-wider mb-2">
                No Exercises Configured
              </h3>
              <p className="text-slate-500 text-xs max-w-[280px]">
                This task hasn't been set up with any coding exercises yet.
                Please contact your instructor.
              </p>
            </div>
          ) : (
            exercisesData.map((exercise: CodeExerciseSchema, index: number) => {
              const studentCode =
                studentSubmissions.find(
                  (s) => s.exerciseUUID === exercise.exerciseUUID
                )?.code || exercise.starterCode

              return (
                <div
                  key={exercise.exerciseUUID}
                  className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  {/* Exercise Title & Description */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      {exercise.title ||
                        `${t('dashboard.assignments.editor.exercise')} ${index + 1}`}
                    </h3>

                    {exercise.description && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                          {exercise.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Code Editor Container */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1 bg-slate-100 rounded-md">
                            <Code className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                            Code Editor ({exercise.language})
                          </span>
                        </div>
                        <div className="h-4 w-px bg-slate-200 mx-2"></div>
                        <div className="flex items-center space-x-2 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                            Auto-Saving
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => runCodeFC(exercise)}
                        disabled={
                          executionResults[exercise.exerciseUUID]?.loading
                        }
                        className={`flex items-center space-x-2 px-5 py-2 rounded-2xl font-bold text-[11px] transition-all duration-200 shadow-lg active:scale-95 ${
                          executionResults[exercise.exerciseUUID]?.loading
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
                        }`}
                      >
                        {executionResults[exercise.exerciseUUID]?.loading ? (
                          <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                        ) : (
                          <Play size={14} fill="currentColor" />
                        )}
                        <span>
                          {executionResults[exercise.exerciseUUID]?.loading
                            ? 'RUNNING...'
                            : 'RUN CODE'}
                        </span>
                      </button>
                    </div>
                    <div className="border border-slate-200 rounded-3xl overflow-hidden h-[450px] relative w-full shadow-lg shadow-slate-100 bg-white ring-4 ring-slate-50">
                      <div className="absolute inset-0">
                        <Editor
                          height="100%"
                          width="100%"
                          language={exercise.language}
                          value={studentCode}
                          onChange={(value) =>
                            updateStudentCode(
                              exercise.exerciseUUID,
                              value || ''
                            )
                          }
                          theme="vs-light"
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                            lineNumbers: 'on',
                            roundedSelection: true,
                            padding: { top: 20, bottom: 20 },
                            cursorBlinking: 'smooth',
                            cursorSmoothCaretAnimation: 'on',
                            renderLineHighlight: 'all',
                            fontFamily:
                              'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                          }}
                        />
                      </div>
                    </div>

                    {/* Console Output */}
                    {(executionResults[exercise.exerciseUUID]?.stdout ||
                      executionResults[exercise.exerciseUUID]?.stderr ||
                      executionResults[exercise.exerciseUUID]?.loading) && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/50">
                            <div className="flex items-center space-x-2.5">
                              <Terminal className="w-4 h-4 text-emerald-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Console Output
                              </span>
                            </div>
                            {executionResults[exercise.exerciseUUID]
                              ?.execution_time_ms > 0 && (
                              <span className="text-[9px] font-mono text-slate-500">
                                {
                                  executionResults[exercise.exerciseUUID]
                                    .execution_time_ms
                                }
                                ms
                              </span>
                            )}
                          </div>
                          <div className="p-5 min-h-[100px] max-h-[300px] overflow-auto font-mono text-sm leading-relaxed">
                            {executionResults[exercise.exerciseUUID]
                              ?.loading ? (
                              <div className="flex items-center space-x-2 text-slate-500 italic">
                                <span className="animate-pulse text-xs uppercase tracking-widest font-bold">
                                  Execution in progress...
                                </span>
                              </div>
                            ) : (
                              <>
                                {executionResults[exercise.exerciseUUID]
                                  ?.stdout && (
                                  <div className="text-emerald-400 whitespace-pre-wrap">
                                    {
                                      executionResults[exercise.exerciseUUID]
                                        .stdout
                                    }
                                  </div>
                                )}
                                {executionResults[exercise.exerciseUUID]
                                  ?.stderr && (
                                  <div className="text-rose-400 whitespace-pre-wrap mt-2">
                                    <div className="flex items-center space-x-1.5 mb-1 opacity-80">
                                      <AlertCircle size={14} />
                                      <span className="uppercase text-[10px] font-bold tracking-tight">
                                        Execution Error:
                                      </span>
                                    </div>
                                    {
                                      executionResults[exercise.exerciseUUID]
                                        .stderr
                                    }
                                  </div>
                                )}
                                {!executionResults[exercise.exerciseUUID]
                                  ?.stdout &&
                                  !executionResults[exercise.exerciseUUID]
                                    ?.stderr && (
                                    <div className="text-slate-500 italic opacity-50">
                                      Program finished with no output.
                                    </div>
                                  )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visible Test Cases */}
                  {exercise.testCases.filter((tc) => !tc.isHidden).length >
                    0 && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        <span>Visible Test Cases:</span>
                      </div>
                      <div className="space-y-3">
                        {exercise.testCases
                          .filter((tc) => !tc.isHidden)
                          .map((testCase, tcIndex) => (
                            <div
                              key={testCase.testUUID}
                              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start space-x-4 shadow-sm hover:border-slate-300 transition-colors"
                            >
                              <div className="p-2 bg-amber-100 rounded-full shrink-0">
                                <Lightbulb className="w-4 h-4 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate mb-1">
                                  Test {tcIndex + 1}:{' '}
                                  {testCase.description || 'General Scenario'}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-[10px] text-slate-500 font-mono">
                                    Expected: {testCase.expectedOutput}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Separator for multiple exercises */}
                  {index < exercisesData.length - 1 && (
                    <div className="py-4">
                      <div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent"></div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </AssignmentBoxUI>
    )
  }

  // GRADING VIEW
  if (view === 'grading' || view === 'custom-grading') {
    const gradingExercises = activeTaskData?.contents?.exercises || []

    return (
      <AssignmentBoxUI
        type="code_editor"
        view={view}
        maxPoints={activeTaskData?.max_grade_value}
        currentPoints={submission?.grade}
        gradeCustomFC={gradeCustomFC}
      >
        <div className="flex flex-col space-y-8 w-full max-w-full overflow-hidden mt-8 min-w-0">
          {gradingExercises.map(
            (exercise: CodeExerciseSchema, index: number) => {
              const studentCode =
                studentSubmissions.find(
                  (s) => s.exerciseUUID === exercise.exerciseUUID
                )?.code || ''

              return (
                <div
                  key={exercise.exerciseUUID}
                  className="flex flex-col space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-800">
                    {exercise.title ||
                      `${t('dashboard.assignments.editor.exercise')} ${index + 1}`}
                  </h3>

                  {/* Side-by-side view */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {t('dashboard.assignments.editor.student_code')}
                      </h4>
                      <div className="border border-gray-300 rounded-md overflow-hidden h-[300px] relative w-full">
                        <div className="absolute inset-0">
                          <Editor
                            height="100%"
                            width="100%"
                            language={exercise.language}
                            value={studentCode}
                            theme="vs-light"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 14,
                              automaticLayout: true,
                              scrollBeyondLastLine: false,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {t('dashboard.assignments.editor.reference_solution')}
                      </h4>
                      <div className="border border-gray-300 rounded-md overflow-hidden h-[300px] relative w-full">
                        <div className="absolute inset-0">
                          <Editor
                            height="100%"
                            width="100%"
                            language={exercise.language}
                            value={exercise.solutionCode}
                            theme="vs-light"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 14,
                              automaticLayout: true,
                              scrollBeyondLastLine: false,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          )}
        </div>
      </AssignmentBoxUI>
    )
  }

  return null
}

export default TaskCodeEditorObject
