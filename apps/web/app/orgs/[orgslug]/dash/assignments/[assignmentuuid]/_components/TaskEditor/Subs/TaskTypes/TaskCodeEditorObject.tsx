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
  Wand2,
  ShieldAlert,
  Trash2,
  Sparkles,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { debounce } from '@/lib/utils'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import { useTranslation } from 'react-i18next'
import dynamic from 'next/dynamic'
import AssignmentBoxUI from '@components/Objects/Activities/Assignment/AssignmentBoxUI'
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })
const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.DiffEditor),
  { ssr: false }
)
const FrontendExerciseBlock = dynamic(
  () =>
    import(
      '@components/Objects/Activities/SmartArticle/Blocks/FrontendExerciseBlock'
    ),
  { ssr: false }
)

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
  strictMode?: boolean
  testCases?: {
    testUUID: string
    input: string
    expectedOutput: string
    isHidden: boolean
    description: string
  }[]
  datasetFiles?: {
    name: string
    content: string
    size: number
  }[]
  stepType?: 'CODE_EXERCISE' | 'FRONTEND_EXERCISE' | string
  template?: 'react' | 'static' | string
  files?: Record<string, string>
  tests?: Array<{
    id: string
    description: string
    type?: string
    selector?: string
    target?: string
    expected?: any
    classes?: string
    action?: string
    attribute?: string
    value?: string
    points?: number
    rule?: string
  }>
  passingScore?: number
  instructions?: string
}

type CodeSubmitSchema = {
  exercises: CodeExerciseSchema[]
  submissions: {
    exerciseUUID: string
    code: string
  }[]
  history?: {
    timestamp: string
    submissions: {
      exerciseUUID: string
      code: string
    }[]
  }[]
  assignment_task_submission_uuid?: string
  grading_results?: any[]
}

type TaskCodeEditorObjectProps = {
  view?: 'teacher' | 'student' | 'grading' | 'custom-grading'
  user_id?: string
  assignmentTaskUUID?: string
  isFocusMode?: boolean
}

function TaskCodeEditorObject({
  view,
  assignmentTaskUUID,
  user_id,
  isFocusMode = false,
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
  const initialFetchRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSubmissionResult, setLastSubmissionResult] = useState<any>(null)

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
            if (submissionData.grading_results) {
              setLastSubmissionResult(submissionData.grading_results)
            }
            if (submissionData.history) {
              setHistoryTimeline(submissionData.history)
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

  // Console output state — keyed by exerciseUUID
  type ConsoleResult = {
    stdout: string
    stderr: string
    exit_code: number
    execution_time_ms: number
    isRunning: boolean
    hasRun: boolean
    error?: string
    test_results?: any[]
    passed_count?: number
    total_count?: number
  }
  const [consoleOutput, setConsoleOutput] = useState<
    Record<string, ConsoleResult>
  >({})

  // Custom stdin for students testing their own code
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [showCustomInput, setShowCustomInput] = useState<
    Record<string, boolean>
  >({})

  // Theme state
  const [editorTheme, setEditorTheme] = useState<string>('vs-light')
  useEffect(() => {
    const saved = localStorage.getItem('learnhouse_editor_theme')
    if (saved) setEditorTheme(saved)
  }, [])
  const handleThemeChange = (val: string) => {
    setEditorTheme(val)
    localStorage.setItem('learnhouse_editor_theme', val)
  }

  // Editor refs for formatting/actions
  const editorRefs = useRef<Record<string, any>>({})

  const formatCode = useCallback(
    (exerciseUUID: string, language: string) => {
      const editor = editorRefs.current[exerciseUUID]
      if (!editor) return

      if (language === 'python') {
        // Basic Python cleaner since Monaco doesn't have a built-in one out-of-the-box
        const currentValue = editor.getValue()
        const cleaned =
          currentValue
            .split('\n')
            .map((line: string) => line.trimEnd())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
            .trim() + '\n'

        if (cleaned !== currentValue) {
          editor.setValue(cleaned)
          toast.success(
            t('activities.code_formatted', 'Code cleaned and formatted')
          )
        } else {
          toast.success(t('activities.already_formatted', 'Code already clean'))
        }
      } else {
        // Trigger Monaco's native formatter (works for JS, TS, CSS, JSON, etc.)
        editor
          .getAction('editor.action.formatDocument')
          .run()
          .then(() =>
            toast.success(t('activities.code_formatted', 'Code formatted'))
          )
          .catch(() =>
            toast.error(
              t(
                'activities.format_not_supported',
                'Formatting not supported for this language'
              )
            )
          )
      }
    },
    [t]
  )

  // History tracking state
  const [historyTimeline, setHistoryTimeline] = useState<any[]>([])
  const [viewingHistoryIdx, setViewingHistoryIdx] = useState<
    Record<string, number | null>
  >({})

  // Watch for history in loaded submission
  useEffect(() => {
    if (submission?.submission?.task_submission?.history) {
      setHistoryTimeline(submission.submission.task_submission.history)
    } else if (lastSubmissionResult && activeTaskData) {
      // If we just saved and the server responded, it might not be in the initial load context yet,
      // but standard mutate() re-fetches it.
    }
  }, [submission, activeTaskData, lastSubmissionResult])

  // Restore history snapshot
  const restoreHistory = (
    exerciseUUID: string,
    historyIndex: number | null
  ) => {
    setViewingHistoryIdx((prev) => ({ ...prev, [exerciseUUID]: historyIndex }))

    if (historyIndex === null) {
      // Revert to current (most recently saved/staged)
      const currentSub = studentSubmissions.find(
        (s) => s.exerciseUUID === exerciseUUID
      )
      if (currentSub) {
        // Force re-render of editor with current code
        setStudentSubmissions([...studentSubmissions])
      }
      toast.success(
        t('activities.restored_current', 'Restored current workspace')
      )
    } else {
      // Load from history
      const historyItem = historyTimeline[historyIndex]
      const historicSub = historyItem?.submissions?.find(
        (s: any) => s.exerciseUUID === exerciseUUID
      )
      if (historicSub) {
        updateStudentCode(exerciseUUID, historicSub.code)
        toast.success(
          `Loaded code from ${new Date(historyItem.timestamp).toLocaleTimeString()}`
        )
      }
    }
  }

  // Debounced auto-save
  const debouncedSubmit = useMemo(
    () =>
      debounce(
        async (submissions: { exerciseUUID: string; code: string }[]) => {
          if (view !== 'student' || !access_token || !assignmentUUID) return

          setIsSaving(true)
          try {
            const submissionData: CodeSubmitSchema = {
              exercises: activeTaskData?.contents?.exercises || [],
              submissions: submissions,
            }

            const res = await handleAssignmentTaskSubmission(
              { task_submission: submissionData },
              assignmentTaskUUID || activeTaskData?.assignment_task_uuid,
              assignmentUUID,
              access_token
            )
            if (res?.success) {
              setLastSubmissionResult(
                res.data?.task_submission?.grading_results
              )
              if (res.data?.task_submission?.history) {
                setHistoryTimeline(res.data.task_submission.history)
              }
              // Mutate task submissions list to update activity-level UI
              mutate(
                `${getAPIUrl()}assignments/${assignmentUUID}/tasks/submissions/me`
              )
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[AutoSave] Failed:', error)
          } finally {
            setIsSaving(false)
          }
        },
        2000
      ),
    [view, access_token, assignmentUUID, activeTaskData, assignmentTaskUUID]
  )

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
      datasetFiles: [],
      stepType: 'CODE_EXERCISE',
    }
  }

  // Create an empty frontend exercise template
  function createEmptyFrontendExercise(): CodeExerciseSchema {
    const starterReact = `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-8 text-center font-sans">\n      <h1 className="text-2xl font-bold">Hello World</h1>\n    </div>\n  );\n}`
    return {
      exerciseUUID: 'exercise_' + uuidv4(),
      title: '',
      description: '',
      language: 'javascript',
      template: 'react',
      starterCode: starterReact,
      solutionCode: '',
      stepType: 'FRONTEND_EXERCISE',
      files: {
        '/App.js': starterReact,
      },
      tests: [
        {
          id: `test_${Date.now()}`,
          description: 'Heading renders text',
          type: 'dom_text',
          selector: 'h1',
          expected: 'Hello World',
        },
      ],
      passingScore: 100,
      testCases: [],
      datasetFiles: [],
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

  // TEACHER: Active file being edited per frontend exercise
  const [activeFrontendFiles, setActiveFrontendFiles] = useState<
    Record<number, string>
  >({})

  // TEACHER: Exercises state with defensive fallbacks
  const [exercises, setExercises] = useState<CodeExerciseSchema[]>(() => {
    if (view === 'teacher' && assignmentTask?.assignmentTask?.contents) {
      const contents = assignmentTask.assignmentTask.contents as {
        exercises?: CodeExerciseSchema[]
      }
      if (contents.exercises && contents.exercises.length > 0) {
        return contents.exercises.map((ex) => ({
          ...ex,
          testCases: Array.isArray(ex.testCases) ? ex.testCases : [],
          datasetFiles: Array.isArray(ex.datasetFiles) ? ex.datasetFiles : [],
          tests: Array.isArray((ex as any).tests) ? (ex as any).tests : [],
          files:
            (ex as any).files && typeof (ex as any).files === 'object'
              ? (ex as any).files
              : {},
          stepType:
            ex.stepType ||
            ((ex as any).template ||
            (ex as any).tests?.length ||
            ((ex as any).files && Object.keys((ex as any).files).length > 0)
              ? 'FRONTEND_EXERCISE'
              : 'CODE_EXERCISE'),
        }))
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

  // Add a new frontend exercise
  const addFrontendExercise = () => {
    if (exercises.length >= 10) {
      toast.error(t('dashboard.assignments.editor.max_exercises_reached'))
      return
    }
    setExercises([...exercises, createEmptyFrontendExercise()])
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
    const currentTestCases = newExercises[exerciseIndex].testCases || []
    if (currentTestCases.length >= 20) {
      toast.error(t('dashboard.assignments.editor.max_test_cases_reached'))
      return
    }
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      testCases: [...currentTestCases, createEmptyTestCase()],
    }
    setExercises(newExercises)
  }

  // Remove test case
  const removeTestCase = (exerciseIndex: number, testIndex: number) => {
    const newExercises = [...exercises]
    const currentTestCases = newExercises[exerciseIndex].testCases || []
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      testCases: currentTestCases.filter((_, i) => i !== testIndex),
    }
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
    const currentTestCases = [...(newExercises[exerciseIndex].testCases || [])]
    currentTestCases[testIndex] = {
      ...currentTestCases[testIndex],
      [field]: value,
    }
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      testCases: currentTestCases,
    }
    setExercises(newExercises)
  }

  // Frontend: Add test assertion
  const addFrontendTest = (exerciseIndex: number) => {
    const newExercises = [...exercises]
    const currentTests = (newExercises[exerciseIndex] as any).tests || []
    const updatedTests = [
      ...currentTests,
      {
        id: `test_${Date.now()}`,
        description: `Assertion ${currentTests.length + 1}`,
        type: 'dom_text',
        selector: 'h1',
        expected: 'Expected Text',
      },
    ]
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      tests: updatedTests,
    }
    setExercises(newExercises)
  }

  // Frontend: Remove test assertion
  const removeFrontendTest = (exerciseIndex: number, testIndex: number) => {
    const newExercises = [...exercises]
    const currentTests = (newExercises[exerciseIndex] as any).tests || []
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      tests: currentTests.filter((_: any, i: number) => i !== testIndex),
    }
    setExercises(newExercises)
  }

  // Frontend: Update test assertion
  const updateFrontendTest = (
    exerciseIndex: number,
    testIndex: number,
    field: string,
    value: any
  ) => {
    const newExercises = [...exercises]
    const currentTests = [...((newExercises[exerciseIndex] as any).tests || [])]
    currentTests[testIndex] = {
      ...currentTests[testIndex],
      [field]: value,
    }
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      tests: currentTests,
    }
    setExercises(newExercises)
  }

  // Frontend: Update file content
  const updateFrontendFile = (
    exerciseIndex: number,
    fileName: string,
    code: string
  ) => {
    const newExercises = [...exercises]
    const currentFiles = {
      ...((newExercises[exerciseIndex] as any).files || {}),
      [fileName]: code,
    }
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      files: currentFiles,
      starterCode: code,
    }
    setExercises(newExercises)
  }

  // Handle dataset file upload
  const handleDatasetUpload = (
    exerciseIndex: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate size (500KB limit)
    if (file.size > 512000) {
      toast.error('File size must be under 500KB')
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (!['csv', 'json', 'txt'].includes(extension)) {
      toast.error('Only .csv, .json, and .txt files are supported')
      return
    }

    const newExercises = [...exercises]
    const currentDatasets = newExercises[exerciseIndex].datasetFiles || []

    if (currentDatasets.length >= 3) {
      toast.error('Maximum 3 dataset files allowed per exercise')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      newExercises[exerciseIndex].datasetFiles = [
        ...currentDatasets,
        {
          name: file.name,
          content: content,
          size: file.size,
        },
      ]
      setExercises(newExercises)
      toast.success(`Attached ${file.name} to exercise.`)
    }
    reader.readAsText(file)
  }

  const removeDatasetFile = (exerciseIndex: number, datasetIndex: number) => {
    const newExercises = [...exercises]
    const currentDatasets = newExercises[exerciseIndex].datasetFiles || []
    newExercises[exerciseIndex].datasetFiles = currentDatasets.filter(
      (_, i) => i !== datasetIndex
    )
    setExercises(newExercises)
  }

  // Save function (teacher)
  const saveFC = async () => {
    if (!assignmentUUID) return
    try {
      const contents = {
        exercises: exercises.map((ex) => ({
          ...ex,
          testCases: ex.testCases || [],
          datasetFiles: ex.datasetFiles || [],
          tests: (ex as any).tests || [],
          files: (ex as any).files || {},
        })),
      }
      await updateAssignmentTask(
        { contents },
        assignmentTask.assignmentTask.assignment_task_uuid,
        assignmentUUID,
        access_token
      )
      toast.success(t('dashboard.assignments.editor.toasts.task_saved'))
    } catch (error) {
      toast.error(t('dashboard.assignments.editor.toasts.task_save_failed'))
    }
  }

  // Submit function (student) - used by AssignmentBoxUI save button
  const submitFC = async () => {
    if (view !== 'student' || !access_token || !assignmentUUID) return

    setIsSaving(true)
    try {
      const submissionData: CodeSubmitSchema = {
        exercises: activeTaskData?.contents?.exercises || [],
        submissions: studentSubmissions,
      }

      const res = await handleAssignmentTaskSubmission(
        { task_submission: submissionData },
        assignmentTaskUUID || activeTaskData?.assignment_task_uuid,
        assignmentUUID,
        access_token
      )
      if (res?.success) {
        const gradingResults = res.data?.task_submission?.grading_results
        setLastSubmissionResult(gradingResults)
        if (res.data?.task_submission?.history) {
          setHistoryTimeline(res.data.task_submission.history)
        }

        // Mutate task submissions list to update activity-level UI
        mutate(
          `${getAPIUrl()}assignments/${assignmentUUID}/tasks/submissions/me`
        )

        // Show grade in toast for immediate feedback
        if (gradingResults && gradingResults.length > 0) {
          const totalPassed = gradingResults.reduce(
            (acc: number, r: any) => acc + (r.passed_count || 0),
            0
          )
          const totalTests = gradingResults.reduce(
            (acc: number, r: any) => acc + (r.total_count || 0),
            0
          )
          const grade = res.data?.grade ?? 0
          const maxGrade = activeTaskData?.max_grade_value ?? 100
          toast.success(
            `Auto-graded: ${totalPassed}/${totalTests} tests passed — Score: ${grade}/${maxGrade}`
          )
        } else {
          toast.success(t('activities.submission_saved'))
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[ManualSave] Failed:', error)
      toast.error(t('activities.submission_failed'))
    } finally {
      setIsSaving(false)
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

  // Run Code — clean implementation
  const runCode = useCallback(
    async (exercise: CodeExerciseSchema) => {
      const studentCode =
        studentSubmissions.find((s) => s.exerciseUUID === exercise.exerciseUUID)
          ?.code || exercise.starterCode

      // Set running state
      setConsoleOutput((prev) => ({
        ...prev,
        [exercise.exerciseUUID]: {
          stdout: '',
          stderr: '',
          exit_code: 0,
          execution_time_ms: 0,
          isRunning: true,
          hasRun: true,
        },
      }))

      try {
        const res = await executeCode(
          {
            language: exercise.language,
            code: studentCode,
            stdin: customInputs[exercise.exerciseUUID] || '',
            test_cases: (exercise.testCases || []).filter((tc) => !tc.isHidden),
            dataset_files: exercise.datasetFiles || [],
          },
          access_token
        )

        if (res.success) {
          setConsoleOutput((prev) => ({
            ...prev,
            [exercise.exerciseUUID]: {
              stdout: res.data.stdout || '',
              stderr: res.data.stderr || '',
              exit_code: res.data.exit_code ?? 0,
              execution_time_ms: res.data.execution_time_ms ?? 0,
              isRunning: false,
              hasRun: true,
              test_results: res.data.test_results,
              passed_count: res.data.passed_count,
              total_count: res.data.total_count,
            },
          }))

          // Update grading summary
          setLastSubmissionResult((prev: any) => {
            const current = Array.isArray(prev) ? prev : []
            const newRes = {
              exerciseUUID: exercise.exerciseUUID,
              passed_count: res.data.passed_count,
              total_count: res.data.total_count,
            }
            const idx = current.findIndex(
              (r: any) => r.exerciseUUID === exercise.exerciseUUID
            )
            if (idx > -1) {
              const next = [...current]
              next[idx] = newRes
              return next
            }
            return [...current, newRes]
          })
        } else {
          // API returned success:false
          setConsoleOutput((prev) => ({
            ...prev,
            [exercise.exerciseUUID]: {
              stdout: '',
              stderr: '',
              exit_code: 1,
              execution_time_ms: 0,
              isRunning: false,
              hasRun: true,
              error:
                res.data?.detail || 'Code execution failed. Please try again.',
            },
          }))
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[RunCode] Exception:', err)
        setConsoleOutput((prev) => ({
          ...prev,
          [exercise.exerciseUUID]: {
            stdout: '',
            stderr: '',
            exit_code: 1,
            execution_time_ms: 0,
            isRunning: false,
            hasRun: true,
            error: err?.message || 'An unexpected error occurred.',
          },
        }))
      }
    },
    [studentSubmissions, access_token, setLastSubmissionResult, customInputs]
  )

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
          {exercises.map((exercise, exIndex) => {
            const isFrontend =
              exercise.stepType === 'FRONTEND_EXERCISE' ||
              Boolean(
                (exercise as any).template ||
                  (exercise as any).tests?.length ||
                  ((exercise as any).files &&
                    Object.keys((exercise as any).files).length > 0)
              )

            return (
              <div
                key={exercise.exerciseUUID}
                className="flex flex-col space-y-4 p-6 bg-gray-50 rounded-lg border border-gray-200 w-full min-w-0"
              >
                {/* Exercise Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('dashboard.assignments.editor.exercise')} {exIndex + 1}
                    </h3>
                    {isFrontend ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Sparkles size={12} className="text-emerald-600" />
                        Frontend Sandpack Challenge
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        <Terminal size={12} className="text-blue-600" />
                        Backend Piston Code
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isFrontend) {
                          updateExercise(exIndex, 'stepType', 'CODE_EXERCISE')
                        } else {
                          updateExercise(
                            exIndex,
                            'stepType',
                            'FRONTEND_EXERCISE'
                          )
                          if (!(exercise as any).template) {
                            updateExercise(exIndex, 'template' as any, 'react')
                          }
                          if (!(exercise as any).files) {
                            updateExercise(exIndex, 'files' as any, {
                              '/App.js':
                                exercise.starterCode ||
                                `import React from 'react';\n\nexport default function App() {\n  return <div>Hello World</div>;\n}`,
                            })
                          }
                        }
                      }}
                      className="text-xs px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-100 text-gray-600 font-medium transition-colors"
                    >
                      Switch to{' '}
                      {isFrontend ? 'Backend Code' : 'Frontend Sandpack'}
                    </button>
                    {exercises.length > 1 && (
                      <button
                        onClick={() => removeExercise(exIndex)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove Exercise"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('dashboard.assignments.editor.title')}
                  </label>
                  <input
                    type="text"
                    value={exercise.title || ''}
                    onChange={(e) =>
                      updateExercise(exIndex, 'title', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                    placeholder={t(
                      'dashboard.assignments.editor.exercise_title_placeholder'
                    )}
                  />
                </div>

                {isFrontend ? (
                  /* ==============================================
                     FRONTEND EXERCISE EDITOR (REACT / STATIC HTML)
                     ============================================== */
                  <>
                    {/* Sandbox Template & Passing Score */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Sandbox Template
                        </label>
                        <select
                          value={(exercise as any).template || 'react'}
                          onChange={(e) =>
                            updateExercise(
                              exIndex,
                              'template' as any,
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                        >
                          <option value="react">
                            React 19 + Tailwind CSS (In-Browser)
                          </option>
                          <option value="static">
                            Static HTML5 / CSS / Vanilla JS
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Passing Score (%)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={(exercise as any).passingScore ?? 100}
                          onChange={(e) =>
                            updateExercise(
                              exIndex,
                              'passingScore' as any,
                              parseInt(e.target.value, 10) || 100
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                        />
                      </div>
                    </div>

                    {/* Instructions / Description */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {t('dashboard.assignments.editor.description')}
                      </label>
                      <textarea
                        value={
                          exercise.description ||
                          (exercise as any).instructions ||
                          ''
                        }
                        onChange={(e) => {
                          updateExercise(exIndex, 'description', e.target.value)
                          updateExercise(
                            exIndex,
                            'instructions' as any,
                            e.target.value
                          )
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1 text-sm font-sans"
                        rows={3}
                        placeholder="Describe the frontend challenge instructions and requirements..."
                      />
                    </div>

                    {/* Starter Code & File Tabs */}
                    {(() => {
                      const exTemplate = (exercise as any).template || 'react'
                      const defaultFile =
                        exTemplate === 'static' ? '/index.html' : '/App.js'
                      const filesObj = (exercise as any).files || {}
                      const filesList =
                        Object.keys(filesObj).length > 0
                          ? Object.keys(filesObj)
                          : [defaultFile]
                      const currentActiveFile =
                        activeFrontendFiles[exIndex] &&
                        filesList.includes(activeFrontendFiles[exIndex])
                          ? activeFrontendFiles[exIndex]
                          : filesList[0]

                      const fileLanguage = currentActiveFile.endsWith('.html')
                        ? 'html'
                        : currentActiveFile.endsWith('.css')
                          ? 'css'
                          : 'javascript'

                      const currentFileCode =
                        (filesObj[currentActiveFile] !== undefined
                          ? filesObj[currentActiveFile]
                          : exercise.starterCode) || ''

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium text-gray-700">
                              Starter Code ({currentActiveFile})
                            </label>
                            {filesList.length > 1 && (
                              <div className="flex items-center space-x-1.5">
                                {filesList.map((fileName) => (
                                  <button
                                    key={fileName}
                                    type="button"
                                    onClick={() =>
                                      setActiveFrontendFiles((prev) => ({
                                        ...prev,
                                        [exIndex]: fileName,
                                      }))
                                    }
                                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                                      currentActiveFile === fileName
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    {fileName}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="border border-gray-300 rounded-md overflow-hidden h-[240px] relative w-full mt-1">
                            <div className="absolute inset-0">
                              <Editor
                                height="100%"
                                width="100%"
                                language={fileLanguage}
                                value={currentFileCode}
                                onChange={(val) =>
                                  updateFrontendFile(
                                    exIndex,
                                    currentActiveFile,
                                    val || ''
                                  )
                                }
                                theme={editorTheme}
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
                      )
                    })()}

                    {/* Solution Code */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          {t('dashboard.assignments.editor.solution_code')}
                          <span className="text-xs text-gray-500 ml-2">
                            (
                            {t(
                              'dashboard.assignments.editor.hidden_from_students'
                            )}
                            )
                          </span>
                        </div>
                      </label>
                      <div className="border border-gray-300 rounded-md overflow-hidden h-[200px] relative w-full mt-1">
                        <div className="absolute inset-0">
                          <Editor
                            height="100%"
                            width="100%"
                            language="javascript"
                            value={exercise.solutionCode || ''}
                            onChange={(value) =>
                              updateExercise(
                                exIndex,
                                'solutionCode',
                                value || ''
                              )
                            }
                            theme={editorTheme}
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

                    {/* Automated In-Browser Test Assertions */}
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800">
                            Automated In-Browser Test Assertions
                          </h4>
                          <p className="text-xs text-gray-500">
                            Evaluated automatically in the student's live
                            browser sandbox to determine grading.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addFrontendTest(exIndex)}
                          className="flex items-center space-x-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          <PlusCircle size={16} />
                          <span>Add Test Assertion</span>
                        </button>
                      </div>

                      {((exercise as any).tests || []).length === 0 ? (
                        <div className="p-4 bg-white border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500">
                          No test assertions configured yet. Click "Add Test
                          Assertion" to automatically grade student components.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {((exercise as any).tests || []).map(
                            (test: any, testIndex: number) => (
                              <div
                                key={test.id || testIndex}
                                className="p-4 bg-white border border-gray-200 rounded-md space-y-3 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">
                                    Assertion #{testIndex + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeFrontendTest(exIndex, testIndex)
                                    }
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Remove assertion"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                      Description
                                    </label>
                                    <input
                                      type="text"
                                      value={test.description || ''}
                                      onChange={(e) =>
                                        updateFrontendTest(
                                          exIndex,
                                          testIndex,
                                          'description',
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g. Card container has rounded-2xl class"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                      Assertion Type
                                    </label>
                                    <select
                                      value={test.type || 'dom_text'}
                                      onChange={(e) =>
                                        updateFrontendTest(
                                          exIndex,
                                          testIndex,
                                          'type',
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                                    >
                                      <option value="dom_text">
                                        Text Match in DOM (dom_text)
                                      </option>
                                      <option value="class_contains">
                                        Tailwind / CSS Classes (class_contains)
                                      </option>
                                      <option value="interaction">
                                        Click & Verify State (interaction)
                                      </option>
                                      <option value="dom_exists">
                                        Element Exists (dom_exists)
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                      CSS Selector / Target
                                    </label>
                                    <input
                                      type="text"
                                      value={test.selector || test.target || ''}
                                      onChange={(e) => {
                                        updateFrontendTest(
                                          exIndex,
                                          testIndex,
                                          'selector',
                                          e.target.value
                                        )
                                        updateFrontendTest(
                                          exIndex,
                                          testIndex,
                                          'target',
                                          e.target.value
                                        )
                                      }}
                                      placeholder="e.g. #course-card, h1, button"
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                      {test.type === 'class_contains'
                                        ? 'Expected Classes (space separated)'
                                        : 'Expected Value / Text'}
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        test.expected !== undefined
                                          ? String(test.expected)
                                          : test.classes || ''
                                      }
                                      onChange={(e) => {
                                        updateFrontendTest(
                                          exIndex,
                                          testIndex,
                                          'expected',
                                          e.target.value
                                        )
                                        updateFrontendTest(
                                          exIndex,
                                          testIndex,
                                          'classes',
                                          e.target.value
                                        )
                                      }}
                                      placeholder={
                                        test.type === 'class_contains'
                                          ? 'e.g. rounded-2xl shadow-xl'
                                          : 'e.g. Enroll Now'
                                      }
                                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* ==============================================
                     BACKEND EXERCISE EDITOR (PISTON CODE RUNNER)
                     ============================================== */
                  <>
                    {/* Language Selector */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {t('dashboard.assignments.editor.language')}
                      </label>
                      <Select
                        value={exercise.language || 'python'}
                        onValueChange={(val) =>
                          updateExercise(exIndex, 'language', val)
                        }
                      >
                        <SelectTrigger
                          className={`w-full px-3 py-2 border rounded-md h-auto ${isFocusMode ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          className={
                            isFocusMode
                              ? 'bg-zinc-900 border-white/10 text-zinc-300'
                              : ''
                          }
                        >
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.id} value={lang.id}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {t('dashboard.assignments.editor.description')}
                      </label>
                      <textarea
                        value={exercise.description || ''}
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
                      <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                        {t('dashboard.assignments.editor.starter_code')}
                        <button
                          onClick={() =>
                            formatCode(
                              `starter-${exercise.exerciseUUID || exIndex}`,
                              exercise.language
                            )
                          }
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest"
                        >
                          Format
                        </button>
                      </label>
                      <div className="border border-gray-300 rounded-md overflow-hidden h-[200px] relative w-full mt-1">
                        <div className="absolute inset-0">
                          <Editor
                            height="100%"
                            width="100%"
                            language={exercise.language || 'python'}
                            value={exercise.starterCode || ''}
                            onChange={(value) =>
                              updateExercise(
                                exIndex,
                                'starterCode',
                                value || ''
                              )
                            }
                            onMount={(editor) => {
                              editorRefs.current[
                                `starter-${exercise.exerciseUUID || exIndex}`
                              ] = editor
                            }}
                            theme={editorTheme}
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
                      <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                        <div className="flex items-center">
                          {t('dashboard.assignments.editor.solution_code')}
                          <span className="text-xs text-gray-500 ml-2">
                            (
                            {t(
                              'dashboard.assignments.editor.hidden_from_students'
                            )}
                            )
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            formatCode(
                              `solution-${exercise.exerciseUUID || exIndex}`,
                              exercise.language
                            )
                          }
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest"
                        >
                          Format
                        </button>
                      </label>
                      <div className="border border-gray-300 rounded-md overflow-hidden h-[200px] relative w-full mt-1">
                        <div className="absolute inset-0">
                          <Editor
                            height="100%"
                            width="100%"
                            language={exercise.language || 'python'}
                            value={exercise.solutionCode || ''}
                            onChange={(value) =>
                              updateExercise(
                                exIndex,
                                'solutionCode',
                                value || ''
                              )
                            }
                            onMount={(editor) => {
                              editorRefs.current[
                                `solution-${exercise.exerciseUUID || exIndex}`
                              ] = editor
                            }}
                            theme={editorTheme}
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

                    {/* Dataset Files */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          Dataset Files
                        </label>
                        <label className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                          <PlusCircle size={16} />
                          <span>Upload Dataset</span>
                          <input
                            title="Upload Dataset"
                            type="file"
                            accept=".csv,.json,.txt"
                            className="hidden"
                            onChange={(e) => handleDatasetUpload(exIndex, e)}
                          />
                        </label>
                      </div>
                      {exercise.datasetFiles &&
                        exercise.datasetFiles.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {exercise.datasetFiles.map((file, fileIndex) => (
                              <div
                                key={fileIndex}
                                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Code size={16} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    removeDatasetFile(exIndex, fileIndex)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      <p className="text-xs text-gray-500">
                        Upload data files (CSV, JSON, TXT) that students can
                        read in their code. Max 3 files, 500KB each.
                      </p>
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

                      {(exercise.testCases || []).map((testCase, testIndex) => (
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
                                onClick={() =>
                                  removeTestCase(exIndex, testIndex)
                                }
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
                              'dashboard.assignments.editor.test_case_description_placeholder'
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-500">
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
                                placeholder="stdin"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">
                                {t(
                                  'dashboard.assignments.editor.expected_output'
                                )}
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

                    {/* Strict Mode Toggle */}
                    <div className="flex items-center space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <input
                        type="checkbox"
                        id={`strict-mode-${exIndex}`}
                        checked={exercise.strictMode || false}
                        onChange={(e) =>
                          updateExercise(
                            exIndex,
                            'strictMode' as any,
                            e.target.checked
                          )
                        }
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <label
                        htmlFor={`strict-mode-${exIndex}`}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <ShieldAlert size={16} className="text-amber-600" />
                        <div>
                          <span className="text-sm font-semibold text-amber-800">
                            Strict Mode (Exam)
                          </span>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Disables copy/paste in the student editor to prevent
                            external code injection.
                          </p>
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* Add Exercise Buttons */}
          {exercises.length < 10 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={addExercise}
                className="flex items-center justify-center space-x-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <Plus size={18} />
                <span>Add Backend Coding Exercise</span>
              </button>
              <button
                type="button"
                onClick={addFrontendExercise}
                className="flex items-center justify-center space-x-2 py-3 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-700 bg-emerald-50/30 hover:border-emerald-400 hover:bg-emerald-50/60 transition-colors"
              >
                <Sparkles size={18} className="text-emerald-600" />
                <span>Add Frontend Sandpack Challenge</span>
              </button>
            </div>
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
        isFocusMode={isFocusMode}
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
            <>
              {/* Exercises Header */}
              <div className="flex items-center space-x-2.5 mb-2 px-1">
                <div
                  className={`p-1.5 rounded-lg ${isFocusMode ? 'bg-white/10' : 'bg-slate-100'}`}
                >
                  <Terminal
                    className={`w-4 h-4 ${isFocusMode ? 'text-zinc-300' : 'text-slate-500'}`}
                  />
                </div>
                <h4
                  className={`text-[11px] font-bold uppercase tracking-widest ${isFocusMode ? 'text-zinc-200' : 'text-slate-500'}`}
                >
                  Exercises &amp; Challenges
                </h4>
              </div>

              {/* Grading Summary (if available) */}
              {(lastSubmissionResult ||
                submission?.submission?.task_submission?.grading_results) && (
                <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <Terminal className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">
                        Auto-Grading Summary
                      </h4>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                      <span className="text-xs font-bold text-emerald-400">
                        {(() => {
                          const results =
                            lastSubmissionResult ||
                            submission?.submission?.task_submission
                              ?.grading_results ||
                            []
                          const totalPassed = results.reduce(
                            (acc: number, r: any) =>
                              acc + (r.passed_count || 0),
                            0
                          )
                          const totalTests = results.reduce(
                            (acc: number, r: any) => acc + (r.total_count || 0),
                            0
                          )
                          return `${totalPassed} / ${totalTests} Tests Passed`
                        })()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your code is automatically evaluated against predefined test
                    cases. Each successful test contributes to your final grade.
                  </p>
                </div>
              )}
              {exercisesData.map(
                (exercise: CodeExerciseSchema, index: number) => {
                  const exResults = consoleOutput[exercise.exerciseUUID]
                  const studentCode =
                    studentSubmissions.find(
                      (s) => s.exerciseUUID === exercise.exerciseUUID
                    )?.code || exercise.starterCode

                  const isFrontend =
                    exercise.stepType === 'FRONTEND_EXERCISE' ||
                    Boolean(
                      (exercise as any).template ||
                        (exercise as any).tests?.length ||
                        ((exercise as any).files &&
                          Object.keys((exercise as any).files).length > 0)
                    )

                  if (isFrontend) {
                    const exTemplate = (exercise as any).template || 'react'
                    const defaultFile =
                      exTemplate === 'static' ? '/index.html' : '/App.js'
                    const customFiles =
                      (exercise as any).files &&
                      Object.keys((exercise as any).files).length > 0
                        ? { ...(exercise as any).files }
                        : {
                            [defaultFile]:
                              studentCode || exercise.starterCode || '',
                          }

                    if (studentCode && customFiles[defaultFile]) {
                      customFiles[defaultFile] = studentCode
                    }

                    const frontendStep = {
                      title: exercise.title,
                      label: exercise.title,
                      instructions:
                        exercise.description || (exercise as any).instructions,
                      content:
                        exercise.description || (exercise as any).instructions,
                      template: exTemplate,
                      files: customFiles,
                      tests: (exercise as any).tests || [],
                      passingScore: (exercise as any).passingScore || 100,
                      solutionCode: exercise.solutionCode,
                    }

                    return (
                      <div
                        key={exercise.exerciseUUID}
                        className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                      >
                        <FrontendExerciseBlock
                          step={frontendStep}
                          isFocusMode={isFocusMode}
                          onPassChange={(passed, score) => {
                            if (
                              passed &&
                              assignmentTaskUUID &&
                              access_token &&
                              assignmentUUID
                            ) {
                              const submissionData: CodeSubmitSchema = {
                                exercises:
                                  activeTaskData?.contents?.exercises || [],
                                submissions: [
                                  {
                                    exerciseUUID: exercise.exerciseUUID,
                                    code:
                                      studentCode || exercise.starterCode || '',
                                  },
                                ],
                              }
                              handleAssignmentTaskSubmission(
                                {
                                  task_submission: submissionData,
                                  grade: score || 100,
                                  task_submission_grade_feedback: `Auto-graded: ${score}% on frontend test suite`,
                                },
                                assignmentTaskUUID,
                                assignmentUUID,
                                access_token
                              )
                                .then(() => {
                                  mutate(
                                    `${getAPIUrl()}assignments/${assignmentUUID}/tasks/submissions/me`
                                  )
                                })
                                .catch((err) => {
                                  // eslint-disable-next-line no-console
                                  console.error(
                                    '[FrontendTaskSubmission] error:',
                                    err
                                  )
                                })
                            }
                          }}
                        />
                      </div>
                    )
                  }

                  return (
                    <div
                      key={exercise.exerciseUUID}
                      className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                      {/* Exercise Title & Description */}
                      <div className="space-y-4">
                        <h3
                          className={`text-xl font-bold tracking-tight ${isFocusMode ? 'text-white' : 'text-slate-900'}`}
                        >
                          {exercise.title ||
                            `${t('dashboard.assignments.editor.exercise')} ${index + 1}`}
                        </h3>

                        {exercise.description && (
                          <div
                            className={`rounded-2xl p-5 shadow-sm border ${isFocusMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                          >
                            <p
                              className={`text-sm leading-relaxed font-medium ${isFocusMode ? 'text-zinc-200' : 'text-slate-700'}`}
                            >
                              {exercise.description}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Dataset Files (Student View) */}
                      {exercise.datasetFiles &&
                        exercise.datasetFiles.length > 0 && (
                          <div className="space-y-3">
                            <div
                              className={`flex items-center space-x-2 text-[11px] font-bold uppercase tracking-widest px-1 ${isFocusMode ? 'text-zinc-300' : 'text-slate-400'}`}
                            >
                              <span>Available Dataset Files (Read-Only):</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {exercise.datasetFiles.map((file, fileIndex) => (
                                <div
                                  key={fileIndex}
                                  className={`flex items-center space-x-3 p-3 rounded-xl border ${isFocusMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} shadow-sm`}
                                >
                                  <div
                                    className={`p-2 rounded-lg ${isFocusMode ? 'bg-white/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}
                                  >
                                    <Code size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className={`text-sm font-semibold truncate ${isFocusMode ? 'text-zinc-200' : 'text-slate-700'}`}
                                    >
                                      {file.name}
                                    </p>
                                    <p
                                      className={`text-[10px] ${isFocusMode ? 'text-zinc-500' : 'text-slate-400'}`}
                                    >
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Code Editor Container */}
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between px-1 gap-2">
                          <div className="flex items-center space-x-3 grow">
                            <div className="flex items-center space-x-2.5 whitespace-nowrap">
                              <div
                                className={`p-1 rounded-md ${isFocusMode ? 'bg-white/10' : 'bg-slate-100'}`}
                              >
                                <Code
                                  className={`w-4 h-4 ${isFocusMode ? 'text-zinc-300' : 'text-slate-600'}`}
                                />
                              </div>
                              <span
                                className={`text-[11px] font-bold uppercase tracking-widest ${isFocusMode ? 'text-zinc-100' : 'text-slate-800'}`}
                              >
                                Code Editor ({exercise.language})
                              </span>
                            </div>
                            <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                            {/* Version History Dropdown */}
                            {historyTimeline.length > 0 ? (
                              <div className="relative group min-w-[180px]">
                                <Select
                                  value={(
                                    viewingHistoryIdx[exercise.exerciseUUID] ??
                                    'current'
                                  ).toString()}
                                  onValueChange={(val) => {
                                    restoreHistory(
                                      exercise.exerciseUUID,
                                      val === 'current'
                                        ? null
                                        : parseInt(val, 10)
                                    )
                                  }}
                                >
                                  <SelectTrigger
                                    className={`appearance-none border ${isFocusMode ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-600'} ${viewingHistoryIdx[exercise.exerciseUUID] !== null && viewingHistoryIdx[exercise.exerciseUUID] !== undefined ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : ''} rounded-full py-1.5 pl-3 pr-8 text-[11px] font-bold tracking-wider outline-none cursor-pointer hover:border-indigo-300 transition-colors shadow-sm`}
                                  >
                                    <SelectValue>
                                      CURRENT WORKSPACE{' '}
                                      {isSaving ? '(Saving...)' : '(Saved)'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent
                                    className={
                                      isFocusMode
                                        ? 'bg-zinc-900 border-white/10 text-zinc-300'
                                        : ''
                                    }
                                  >
                                    <SelectItem value="current">
                                      CURRENT WORKSPACE{' '}
                                      {isSaving ? '(Saving...)' : '(Saved)'}
                                    </SelectItem>
                                    {historyTimeline
                                      .map((h, i) => (
                                        <SelectItem
                                          key={i}
                                          value={i.toString()}
                                        >
                                          {new Date(
                                            h.timestamp
                                          ).toLocaleDateString()}{' '}
                                          at{' '}
                                          {new Date(
                                            h.timestamp
                                          ).toLocaleTimeString()}
                                        </SelectItem>
                                      ))
                                      .reverse()}{' '}
                                    {/* Show newest history first */}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : (
                              <div
                                className={`flex items-center space-x-2 px-2.5 py-1 rounded-full border ${isFocusMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.5)]`}
                                ></div>
                                <span
                                  className={`text-[9px] font-extrabold uppercase tracking-widest ${isFocusMode ? 'text-zinc-400' : 'text-slate-400'}`}
                                >
                                  {isSaving ? 'Saving...' : 'Saved'}
                                </span>
                              </div>
                            )}

                            {/* Theme Selector Dropdown */}
                            <div className="relative group min-w-[130px]">
                              <Select
                                value={editorTheme}
                                onValueChange={handleThemeChange}
                              >
                                <SelectTrigger
                                  className={`border rounded-full py-1.5 h-auto text-[11px] font-bold tracking-wider outline-none cursor-pointer transition-colors shadow-sm w-full ${isFocusMode ? 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                  className={
                                    isFocusMode
                                      ? 'bg-zinc-900 border-white/10 text-zinc-300'
                                      : ''
                                  }
                                >
                                  <SelectItem value="vs-light">
                                    Light Theme
                                  </SelectItem>
                                  <SelectItem value="vs-dark">
                                    Dark Theme
                                  </SelectItem>
                                  <SelectItem value="hc-black">
                                    High Contrast Dark
                                  </SelectItem>
                                  <SelectItem value="hc-light">
                                    High Contrast Light
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              formatCode(
                                exercise.exerciseUUID,
                                exercise.language
                              )
                            }
                            className={`flex items-center space-x-2 px-4 py-2 rounded-2xl font-bold text-[11px] transition-all duration-200 shadow-md active:scale-95 ${
                              isFocusMode
                                ? 'bg-white/10 text-zinc-300 hover:bg-white/20'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                            title="Format Code"
                          >
                            <Wand2 size={14} className="text-indigo-500" />
                            <span className="hidden sm:inline">FORMAT</span>
                          </button>

                          <button
                            onClick={() => runCode(exercise)}
                            disabled={exResults?.isRunning}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-2xl font-bold text-[11px] transition-all duration-200 shadow-lg active:scale-95 ${
                              exResults?.isRunning
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
                            }`}
                          >
                            {exResults?.isRunning ? (
                              <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                            ) : (
                              <Play size={14} fill="currentColor" />
                            )}
                            <span>
                              {exResults?.isRunning ? 'RUNNING...' : 'RUN CODE'}
                            </span>
                          </button>
                        </div>

                        {/* Strict Mode Warning Banner */}
                        {exercise.strictMode && (
                          <div
                            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-[11px] font-bold tracking-wider ${isFocusMode ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}
                          >
                            <ShieldAlert size={14} />
                            <span>
                              STRICT MODE — Paste is disabled for this exercise
                            </span>
                          </div>
                        )}

                        <div
                          className={`border rounded-3xl overflow-hidden h-[450px] relative w-full shadow-lg ring-4 ${isFocusMode ? 'border-white/10 ring-white/5 shadow-white/5 bg-[#1e1e1e]' : 'border-slate-200 ring-slate-50 shadow-slate-100 bg-white'} ${exercise.strictMode ? 'ring-amber-200/50 border-amber-300/50' : ''}`}
                        >
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
                              onMount={(editor) => {
                                editorRefs.current[exercise.exerciseUUID] =
                                  editor

                                // Strict Mode: block paste
                                if (exercise.strictMode) {
                                  // Override Ctrl/Cmd+V keybinding
                                  editor.addCommand(
                                    // Monaco KeyMod.CtrlCmd | KeyCode.KeyV
                                    2048 | 52, // CtrlCmd=2048, KeyV=52
                                    () => {
                                      toast.error(
                                        'Pasting is disabled in Strict Mode (Exam).'
                                      )
                                    }
                                  )

                                  // Also intercept context-menu paste / programmatic paste via onDidPaste
                                  editor.onDidPaste(() => {
                                    // Undo the paste that just happened
                                    editor.trigger('strict-mode', 'undo', null)
                                    toast.error(
                                      'Pasting is disabled in Strict Mode (Exam).'
                                    )
                                  })
                                }
                              }}
                              theme={editorTheme}
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

                        {/* Custom Input Section */}
                        <div
                          className={`border rounded-3xl overflow-hidden shadow-sm ${isFocusMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
                        >
                          <button
                            onClick={() =>
                              setShowCustomInput((prev) => ({
                                ...prev,
                                [exercise.exerciseUUID]:
                                  !prev[exercise.exerciseUUID],
                              }))
                            }
                            className={`flex items-center justify-between w-full px-5 py-3 transition-colors ${isFocusMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <Terminal
                                className={`w-4 h-4 ${isFocusMode ? 'text-zinc-400' : 'text-slate-500'}`}
                              />
                              <span
                                className={`text-[10px] font-bold uppercase tracking-widest ${isFocusMode ? 'text-zinc-300' : 'text-slate-600'}`}
                              >
                                Custom Test Input (stdin)
                              </span>
                            </div>
                            <Plus
                              size={14}
                              className={`text-slate-400 transition-transform duration-200 ${showCustomInput[exercise.exerciseUUID] ? 'rotate-45' : ''}`}
                            />
                          </button>
                          {showCustomInput[exercise.exerciseUUID] && (
                            <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-200">
                              <textarea
                                value={
                                  customInputs[exercise.exerciseUUID] || ''
                                }
                                onChange={(e) =>
                                  setCustomInputs((prev) => ({
                                    ...prev,
                                    [exercise.exerciseUUID]: e.target.value,
                                  }))
                                }
                                placeholder="Enter input here (one line per prompt)..."
                                className={`w-full h-24 p-4 border rounded-2xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none ${isFocusMode ? 'bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                              />
                              <p
                                className={`mt-2 text-[10px] font-medium ${isFocusMode ? 'text-zinc-500' : 'text-slate-400'}`}
                              >
                                Provided input will be sent to your program's
                                standard input.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Console Output — always visible after first run */}
                        {exResults?.hasRun && (
                          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/50">
                                <div className="flex items-center space-x-2.5">
                                  <Terminal className="w-4 h-4 text-emerald-400" />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Console Output
                                  </span>
                                </div>
                                {!exResults.isRunning &&
                                  (exResults.execution_time_ms ?? 0) > 0 && (
                                    <span className="text-[9px] font-mono text-slate-500">
                                      {exResults.execution_time_ms}ms
                                    </span>
                                  )}
                              </div>
                              <div className="p-5 min-h-[80px] max-h-[300px] overflow-auto font-mono text-sm leading-relaxed">
                                {exResults.isRunning ? (
                                  <div className="flex items-center space-x-3 text-slate-400">
                                    <div className="w-4 h-4 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin"></div>
                                    <span className="text-xs uppercase tracking-widest font-bold animate-pulse">
                                      Executing...
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    {/* Error from the API/network */}
                                    {exResults.error && (
                                      <div className="text-rose-400 whitespace-pre-wrap">
                                        <div className="flex items-center space-x-1.5 mb-2 opacity-80">
                                          <AlertCircle size={14} />
                                          <span className="uppercase text-[10px] font-bold tracking-tight">
                                            Error
                                          </span>
                                        </div>
                                        {exResults.error}
                                      </div>
                                    )}
                                    {/* stdout */}
                                    {exResults.stdout && (
                                      <div className="text-emerald-400 whitespace-pre-wrap">
                                        {exResults.stdout}
                                      </div>
                                    )}
                                    {/* stderr */}
                                    {exResults.stderr &&
                                      (() => {
                                        // Detect stdin-related errors (program needs input but none was provided)
                                        const isInputError =
                                          exResults.stderr.includes(
                                            'EOFError'
                                          ) ||
                                          exResults.stderr.includes(
                                            'invalid literal for int()'
                                          ) ||
                                          exResults.stderr.includes(
                                            "invalid literal for int() with base 10: ''"
                                          ) ||
                                          exResults.stderr.includes(
                                            'No such device or address'
                                          ) ||
                                          (exResults.stderr.includes('scanf') &&
                                            exResults.stderr.includes('EOF'))

                                        if (isInputError) {
                                          return (
                                            <div className="text-amber-400 italic">
                                              <div className="flex items-center space-x-1.5 mb-1 opacity-80">
                                                <AlertCircle size={14} />
                                                <span className="uppercase text-[10px] font-bold tracking-tight">
                                                  Note
                                                </span>
                                              </div>
                                              This program requires input. Check
                                              the test case results below.
                                            </div>
                                          )
                                        }

                                        return (
                                          <div className="text-rose-400 whitespace-pre-wrap mt-2">
                                            <div className="flex items-center space-x-1.5 mb-1 opacity-80">
                                              <AlertCircle size={14} />
                                              <span className="uppercase text-[10px] font-bold tracking-tight">
                                                Stderr:
                                              </span>
                                            </div>
                                            {exResults.stderr}
                                          </div>
                                        )
                                      })()}
                                    {/* No output */}
                                    {!exResults.error &&
                                      !exResults.stdout &&
                                      !exResults.stderr && (
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
                      {(exercise.testCases || []).filter((tc) => !tc.isHidden)
                        .length > 0 && (
                        <div className="space-y-4">
                          <div
                            className={`flex items-center space-x-2 text-[11px] font-bold uppercase tracking-widest px-1 ${isFocusMode ? 'text-zinc-300' : 'text-slate-400'}`}
                          >
                            <span>Visible Test Cases:</span>
                          </div>
                          <div className="space-y-3">
                            {(exercise.testCases || [])
                              .filter((tc) => !tc.isHidden)
                              .map((testCase, tcIndex) => {
                                const runResult = exResults?.test_results?.find(
                                  (r: any) => r.testUUID === testCase.testUUID
                                )
                                const isPassed = runResult?.passed

                                return (
                                  <div
                                    key={testCase.testUUID}
                                    className={`border rounded-2xl p-4 flex items-start space-x-4 shadow-sm transition-colors ${
                                      isPassed === true
                                        ? isFocusMode
                                          ? 'border-emerald-500/30 bg-emerald-500/10'
                                          : 'border-emerald-200 bg-emerald-50/30'
                                        : isPassed === false
                                          ? isFocusMode
                                            ? 'border-rose-500/30 bg-rose-500/10'
                                            : 'border-rose-200 bg-rose-50/30'
                                          : isFocusMode
                                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    <div
                                      className={`p-2 rounded-full shrink-0 ${
                                        isPassed === true
                                          ? isFocusMode
                                            ? 'bg-emerald-500/20'
                                            : 'bg-emerald-100'
                                          : isPassed === false
                                            ? isFocusMode
                                              ? 'bg-rose-500/20'
                                              : 'bg-rose-100'
                                            : isFocusMode
                                              ? 'bg-white/10'
                                              : 'bg-amber-100'
                                      }`}
                                    >
                                      {isPassed === true ? (
                                        <Plus
                                          size={16}
                                          className={
                                            isFocusMode
                                              ? 'text-emerald-400'
                                              : 'text-emerald-600'
                                          }
                                        />
                                      ) : isPassed === false ? (
                                        <X
                                          size={16}
                                          className={
                                            isFocusMode
                                              ? 'text-rose-400'
                                              : 'text-rose-600'
                                          }
                                        />
                                      ) : (
                                        <Lightbulb
                                          className={`w-4 h-4 ${isFocusMode ? 'text-amber-400' : 'text-amber-600'}`}
                                        />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <div
                                          className={`text-xs font-bold truncate mb-1 ${isFocusMode ? 'text-zinc-100' : 'text-slate-800'}`}
                                        >
                                          Test {tcIndex + 1}:{' '}
                                          {testCase.description ||
                                            'General Scenario'}
                                        </div>
                                        {isPassed !== undefined && (
                                          <span
                                            className={`text-[9px] font-bold uppercase tracking-widest ${isPassed ? (isFocusMode ? 'text-emerald-400' : 'text-emerald-600') : isFocusMode ? 'text-rose-400' : 'text-rose-600'}`}
                                          >
                                            {isPassed ? 'Passed' : 'Failed'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        <div
                                          className={`px-2 py-1 rounded-lg border text-[10px] font-mono ${isFocusMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                                        >
                                          Expected: {testCase.expectedOutput}
                                        </div>
                                        {runResult && !isPassed && (
                                          <div
                                            className={`px-2 py-1 rounded-lg border text-[10px] font-mono ${isFocusMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600'}`}
                                          >
                                            Actual: {runResult.actual_output}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
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
                }
              )}
            </>
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

                  {/* Diff view using Monaco DiffEditor */}
                  <div className="w-full min-w-0 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        {t('dashboard.assignments.editor.student_code')}{' '}
                        <span className="text-gray-400 mx-2">vs</span>{' '}
                        {t('dashboard.assignments.editor.reference_solution')}
                      </h4>
                    </div>
                    <div className="border border-gray-300 rounded-md overflow-hidden h-[400px] relative w-full shadow-inner">
                      <div className="absolute inset-0">
                        <DiffEditor
                          height="100%"
                          width="100%"
                          language={exercise.language}
                          original={studentCode}
                          modified={exercise.solutionCode}
                          theme={editorTheme}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 14,
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                            renderSideBySide: true,
                            ignoreTrimWhitespace: false,
                          }}
                        />
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
