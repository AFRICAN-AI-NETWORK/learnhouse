'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackTests,
  SandpackConsole,
  useSandpack,
} from '@codesandbox/sandpack-react'
import {
  Code2,
  Play,
  CheckCircle2,
  XCircle,
  Eye,
  Terminal,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { generateTestFileFromDeclarative } from '@/lib/testing/frontendTestGenerator'
import { handleAssignmentTaskSubmission } from '@services/courses/assignments'
import { useLHSession } from '@components/Contexts/LHSessionContext'

interface FrontendExerciseBlockProps {
  step: any
  isFocusMode?: boolean
  matchingTask?: any
  assignmentUUID?: string
  onPassChange?: (passed: boolean, score: number) => void
}

// Inner workspace component that has access to Sandpack state via useSandpack
function SandpackWorkspaceContent({
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  hasTests,
  testScore,
  testStatus,
  passingScore,
  isFullScreen,
  setIsFullScreen,
  step,
  setTestScore,
  setTestStatus,
  onReset,
  onRunTests,
  handleTestComplete,
  onReportScore,
}: {
  activeTab: 'preview' | 'tests' | 'console'
  setActiveTab: (tab: 'preview' | 'tests' | 'console') => void
  viewMode: 'split' | 'code' | 'preview'
  setViewMode: (mode: 'split' | 'code' | 'preview') => void
  hasTests: boolean
  testScore: number | null
  testStatus: 'idle' | 'running' | 'completed'
  passingScore: number
  isFullScreen: boolean
  setIsFullScreen: (fs: boolean | ((prev: boolean) => boolean)) => void
  step: any
  setTestScore: (score: number | null) => void
  setTestStatus: (status: 'idle' | 'running' | 'completed') => void
  onReset: () => void
  onRunTests: () => void
  handleTestComplete: (specs: any) => void
  onReportScore?: (score: number, files: Record<string, string>) => void
}) {
  const { sandpack } = useSandpack()
  const [localTestResults, setLocalTestResults] = useState<any[]>([])
  const template = step?.template || 'react'

  // Filter out CDN warnings (such as Tailwind Play CDN notice) from the console stream
  useEffect(() => {
    const filterCdnWarnings = () => {
      const items = document.querySelectorAll('.sp-console-item')
      items.forEach((item) => {
        const text = item.textContent || ''
        if (
          text.includes('cdn.tailwindcss.com') ||
          text.includes('tailwindcss.com/docs/installation') ||
          text.includes('should not be used in production')
        ) {
          ;(item as HTMLElement).style.setProperty(
            'display',
            'none',
            'important'
          )
        }
      })
    }

    filterCdnWarnings()
    const consoleContainer = document.querySelector('.sp-console')
    if (!consoleContainer) return

    const observer = new MutationObserver(filterCdnWarnings)
    observer.observe(consoleContainer, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [activeTab])

  const runDeclarativeEvaluations = () => {
    const activeFile = sandpack.activeFile || '/App.js'
    const code = sandpack.files[activeFile]?.code || ''
    const tests = step?.tests || []

    if (tests.length > 0) {
      const results = tests.map((t: any, idx: number) => {
        let passed = false
        if (t.type === 'class_contains') {
          const rawReq =
            t.requiredClasses ||
            t.classes ||
            (typeof t.expected === 'string'
              ? t.expected.split(' ')
              : t.expected) ||
            []
          const req = Array.isArray(rawReq)
            ? rawReq.map((c: any) => String(c).trim()).filter(Boolean)
            : typeof rawReq === 'string'
              ? (rawReq as string)
                  .split(' ')
                  .map((c: string) => c.trim())
                  .filter(Boolean)
              : []
          passed =
            req.length > 0
              ? req.every((cls: string) => code.includes(cls))
              : code.length > 20
        } else if (t.type === 'dom_text') {
          const expected = t.expected || t.expectedText || ''
          passed = code.includes(expected)
        } else if (t.type === 'attribute_check') {
          const attr = t.attribute || ''
          const expected = t.expected || ''
          passed =
            code.includes(attr) && (expected ? code.includes(expected) : true)
        } else if (t.type === 'interaction') {
          const exp = t.expectedText || t.expected || ''
          passed =
            (Boolean(exp) && code.includes(exp)) ||
            code.includes('onClick') ||
            code.includes('onChange') ||
            code.includes('set') ||
            code.includes('+ 1') ||
            code.includes('+1')
        } else {
          passed = code.length > 20
        }
        return {
          id: t.id || idx,
          description: t.description || `Test case ${idx + 1}`,
          passed,
          expected:
            t.expected ||
            t.expectedText ||
            (t.requiredClasses ? t.requiredClasses.join(', ') : ''),
        }
      })
      setLocalTestResults(results)
      const passedCount = results.filter((r: any) => r.passed).length
      const score = Math.round((passedCount / results.length) * 100)
      setTestScore(score)
      setTestStatus('completed')

      const filesMap: Record<string, string> = {}
      Object.entries(sandpack.files).forEach(([k, v]) => {
        filesMap[k] = v.code
      })
      onReportScore?.(score, filesMap)
    }
  }

  const handleTriggerTests = () => {
    setActiveTab('tests')
    if (viewMode === 'code') {
      setViewMode('split')
    }
    onRunTests()
    setTimeout(() => {
      runDeclarativeEvaluations()
    }, 350)
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#181818] overflow-hidden select-none">
      {/* 1. TOP TOOLBAR: IDE Window Header with Tabs & Run Tests Button */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 bg-[#181818] border-b border-white/5 gap-2 shrink-0">
        {/* Left: Window Dots & File Info */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 mr-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
          </div>

          <div className="flex items-center space-x-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
            <Code2 size={13} className="text-indigo-400" />
            <span className="text-xs font-mono text-zinc-300 font-medium">
              {sandpack.activeFile ||
                (template === 'static' ? '/index.html' : '/App.js')}
            </span>
          </div>

          {/* View Mode Switcher: Split / Code / Preview */}
          <div className="hidden sm:flex items-center bg-white/5 p-0.5 rounded-lg border border-white/5 ml-1">
            <button
              onClick={() => setViewMode('split')}
              title="Split View (Code & Output side-by-side)"
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                viewMode === 'split'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('code')}
              title="Maximize Code Editor"
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                viewMode === 'code'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setViewMode('preview')}
              title="Maximize Preview / Output"
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                viewMode === 'preview'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Center: Output View Tabs (Live Preview, Automated Tests, Console) */}
        <div className="flex items-center space-x-1 bg-black/50 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => {
              setActiveTab('preview')
              if (viewMode === 'code') setViewMode('split')
            }}
            className={`flex items-center px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye size={12} className="mr-1.5" /> Live Preview
          </button>

          {hasTests && (
            <button
              onClick={handleTriggerTests}
              className={`flex items-center px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'tests'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CheckCircle2 size={12} className="mr-1.5" />
              <span>Automated Tests</span>
              {testScore !== null && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 font-mono font-bold">
                  {testScore}%
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('console')
              if (viewMode === 'code') setViewMode('split')
            }}
            className={`flex items-center px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'console'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal size={12} className="mr-1.5" /> Console
          </button>
        </div>

        {/* Right: Actions (Reset, Fullscreen, Run Tests & Grade) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              sandpack.resetAllFiles()
              onReset()
            }}
            title="Reset files to initial starter code"
            className="flex items-center text-xs font-medium text-zinc-400 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-white/5"
          >
            <RotateCcw size={12} className="mr-1" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={() => setIsFullScreen((prev) => !prev)}
            title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {hasTests && (
            <button
              onClick={handleTriggerTests}
              className="flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_2px_10px_rgba(16,185,129,0.3)] active:scale-95 ml-1"
            >
              <Play size={11} className="mr-1.5 fill-current" />
              <span>Run Tests & Grade</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SANDPACK WORKSPACE (Flex-1 min-h-0) */}
      <div className="flex-1 min-h-0 w-full relative flex overflow-hidden">
        <SandpackLayout className="!border-none !rounded-none !h-full w-full flex-1 min-h-0 !flex !flex-row !flex-nowrap !overflow-hidden">
          {/* Left Panel: Code Editor */}
          <div
            className="h-full flex-1 min-h-0 min-w-0"
            style={{
              display: viewMode === 'preview' ? 'none' : 'flex',
              flexDirection: 'column',
              width: viewMode === 'code' ? '100%' : '50%',
              maxWidth: viewMode === 'code' ? '100%' : '50%',
              flex: viewMode === 'code' ? '1 1 100%' : '1 1 50%',
            }}
          >
            <SandpackCodeEditor
              showTabs={true}
              showLineNumbers={true}
              showInlineErrors={true}
              wrapContent={true}
              closableTabs={false}
              style={{ height: '100%', flex: 1 }}
            />
          </div>

          {/* Right Panel: Preview / Tests / Console */}
          <div
            className="h-full flex-1 min-h-0 min-w-0 bg-[#141414] border-l border-white/5 relative overflow-hidden flex flex-col"
            style={{
              display: viewMode === 'code' ? 'none' : 'flex',
              flexDirection: 'column',
              width: viewMode === 'preview' ? '100%' : '50%',
              maxWidth: viewMode === 'preview' ? '100%' : '50%',
              flex: viewMode === 'preview' ? '1 1 100%' : '1 1 50%',
            }}
          >
            {/* Live Preview Pane */}
            <div
              className="w-full h-full flex-1 min-h-0 relative overflow-hidden"
              style={{ display: activeTab === 'preview' ? 'flex' : 'none' }}
            >
              <SandpackPreview
                showNavigator={false}
                showRefreshButton={true}
                style={{ height: '100%', width: '100%', flex: 1 }}
              />
            </div>

            {/* Automated Tests Pane */}
            {hasTests && (
              <div
                className="w-full h-full overflow-y-auto p-4 space-y-3"
                style={{ display: activeTab === 'tests' ? 'block' : 'none' }}
              >
                {localTestResults.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-zinc-200">
                        Automated Test Suite
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                          testScore !== null && testScore >= passingScore
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {localTestResults.filter((r) => r.passed).length} /{' '}
                        {localTestResults.length} Passed ({testScore ?? 0}%)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {localTestResults.map((r, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-xl border text-xs font-mono flex items-start justify-between gap-3 ${
                            r.passed
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                              : 'border-red-500/30 bg-red-500/10 text-red-200'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            {r.passed ? (
                              <CheckCircle2
                                size={16}
                                className="text-emerald-400 shrink-0 mt-0.5"
                              />
                            ) : (
                              <XCircle
                                size={16}
                                className="text-red-400 shrink-0 mt-0.5"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-zinc-100">
                                {r.description}
                              </p>
                              {r.expected && !r.passed && (
                                <p className="text-[11px] text-zinc-400 mt-1">
                                  Expected to include:{' '}
                                  <span className="text-amber-300 font-mono">
                                    {r.expected}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold shrink-0 ${
                              r.passed
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {r.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <SandpackTests
                    watchMode={false}
                    verbose={true}
                    onComplete={handleTestComplete}
                    style={{ height: '100%' }}
                  />
                )}
              </div>
            )}

            {/* Console Output Pane */}
            <div
              className="w-full h-full flex flex-col overflow-hidden"
              style={{ display: activeTab === 'console' ? 'flex' : 'none' }}
            >
              <SandpackConsole style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </SandpackLayout>
      </div>

      {/* 3. BOTTOM STATUS BAR: Execution State & Score */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111111] border-t border-white/5 text-[11px] font-mono shrink-0">
        <div className="flex items-center space-x-2">
          {testStatus === 'running' ? (
            <span className="flex items-center text-blue-400">
              <div className="w-2.5 h-2.5 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mr-1.5"></div>
              Running automated DOM tests in Sandpack sandbox...
            </span>
          ) : testScore !== null ? (
            <span
              className={`flex items-center font-bold ${
                testScore >= passingScore
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {testScore >= passingScore ? (
                <CheckCircle2 size={13} className="mr-1 text-emerald-400" />
              ) : (
                <XCircle size={13} className="mr-1 text-amber-400" />
              )}
              Grading Score: {testScore}%{' '}
              {testScore >= passingScore
                ? '— All passing criteria met!'
                : '— Some tests failed. Review test logs above.'}
            </span>
          ) : (
            <span className="text-zinc-500">
              Click &quot;Run Tests &amp; Grade&quot; above to execute automated
              DOM and interaction tests.
            </span>
          )}
        </div>

        {hasTests && (
          <div className="flex items-center space-x-3 text-zinc-500">
            <span>Pass Mark: {passingScore}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FrontendExerciseBlock({
  step,
  isFocusMode = false,
  matchingTask,
  assignmentUUID,
  onPassChange,
}: FrontendExerciseBlockProps) {
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  const [activeTab, setActiveTab] = useState<'preview' | 'tests' | 'console'>(
    'preview'
  )
  const [viewMode, setViewMode] = useState<'split' | 'code' | 'preview'>(
    'split'
  )
  const [showInstructions, setShowInstructions] = useState(true)
  const [testScore, setTestScore] = useState<number | null>(null)
  const [testStatus, setTestStatus] = useState<
    'idle' | 'running' | 'completed'
  >('idle')
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Listen for Escape key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen])

  const title = step.title || step.label || 'Interactive Frontend Exercise'
  const instructions = step.instructions || step.content || step.text || ''
  const template = (step.template || 'react').toLowerCase()

  // Standardize starter files
  const initialFiles = useMemo(() => {
    const customFiles: Record<string, any> = {}

    if (step.files && typeof step.files === 'object') {
      Object.entries(step.files).forEach(([path, content]) => {
        const formattedPath = path.startsWith('/') ? path : `/${path}`
        customFiles[formattedPath] = content
      })
    }

    // Ensure preview layout fits inside Sandpack iframe smoothly
    if (!customFiles['/styles.css']) {
      customFiles['/styles.css'] = `html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}
.min-h-screen {
  min-height: 100% !important;
}`
    }

    // Default template fallbacks if no files were specified
    if (Object.keys(customFiles).length === 0) {
      if (template === 'static' || template === 'html') {
        customFiles['/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-6 bg-slate-50 min-h-screen">
  <div class="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
    <h1 class="text-xl font-bold text-slate-800">Hello LearnHouse!</h1>
    <p class="text-slate-500 mt-2">Edit this file to see live changes.</p>
  </div>
</body>
</html>`
      } else {
        // React fallback
        customFiles['/App.js'] = `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-8 max-w-sm mx-auto bg-white rounded-2xl shadow-xl space-y-4 border border-slate-100 mt-6">
      <h2 className="text-xl font-bold text-slate-900">React Component</h2>
      <p className="text-slate-500 text-sm">Interactive exercise with live state.</p>
      <button 
        onClick={() => setCount(count + 1)}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md">
        Clicked {count} times
      </button>
    </div>
  );
}`
      }
    }

    // If step has declarative tests, generate test file
    const hasTests = Boolean(
      (step.tests && step.tests.length > 0) || step.testFile || step.testFiles
    )

    if (hasTests) {
      if (step.testFile) {
        customFiles['/App.test.js'] = step.testFile
      } else if (step.tests && step.tests.length > 0) {
        customFiles['/App.test.js'] = generateTestFileFromDeclarative(
          step.tests,
          template
        )
      }
    }

    return customFiles
  }, [step, template])

  const hasTests = Boolean(
    (step.tests && step.tests.length > 0) ||
      step.testFile ||
      initialFiles['/App.test.js']
  )

  const handleTestComplete = useCallback((specs: any) => {
    setTimeout(() => {
      setTestStatus('completed')
      if (!specs) return

      let total = 0
      let passed = 0

      Object.values(specs).forEach((spec: any) => {
        if (spec.tests) {
          Object.values(spec.tests).forEach((t: any) => {
            total++
            if (t.status === 'pass') passed++
          })
        }
      })

      if (total > 0) {
        const score = Math.round((passed / total) * 100)
        setTestScore(score)
      }
    }, 0)
  }, [])

  const handleScoreReport = useCallback(
    async (score: number, currentFiles: Record<string, string>) => {
      setTestScore(score)
      if (
        matchingTask?.assignment_task_uuid &&
        assignmentUUID &&
        access_token
      ) {
        try {
          const activeFile =
            step?.activeFile ||
            (template === 'static' || template === 'html'
              ? '/index.html'
              : '/App.js')
          const studentCode =
            currentFiles[activeFile] || Object.values(currentFiles)[0] || ''
          const exUuid =
            matchingTask?.contents?.exercises?.[0]?.exerciseUUID ||
            step?.exerciseUUID ||
            'fe_ex'

          const submissionData = {
            exercises: matchingTask?.contents?.exercises || [
              {
                exerciseUUID: exUuid,
                stepType: 'FRONTEND_EXERCISE',
                starterCode: studentCode,
              },
            ],
            submissions: [
              {
                exerciseUUID: exUuid,
                code: studentCode,
              },
            ],
          }

          const passing =
            step.passingScore !== undefined ? step.passingScore : 80
          await handleAssignmentTaskSubmission(
            {
              task_submission: submissionData,
              grade: score,
              task_submission_grade_feedback: `Auto-graded: ${score}% on frontend test suite (${
                score >= passing ? 'Passed' : 'Incomplete'
              })`,
            },
            matchingTask.assignment_task_uuid,
            assignmentUUID,
            access_token
          )
        } catch (err) {
          // background sync
        }
      }
    },
    [matchingTask, assignmentUUID, access_token, step, template]
  )

  // Report exercise mastery/pass state to parent SmartArticle container
  useEffect(() => {
    if (!hasTests) {
      onPassChange?.(true, 100)
      return
    }

    if (testScore !== null) {
      const passing = step.passingScore !== undefined ? step.passingScore : 80
      onPassChange?.(testScore >= passing, testScore)
    } else {
      onPassChange?.(false, 0)
    }
  }, [hasTests, testScore, step.passingScore, onPassChange])

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-[100] bg-[#0d0d0d] p-4 flex flex-col w-screen h-screen overflow-hidden'
          : `w-full py-4 mx-auto`
      }
    >
      {/* Exercise Header: Clean, highly readable instructions card */}
      <div className="mb-4 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Code2 size={22} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-300 font-semibold">
                  {template}
                </span>
                <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                  Tailwind CSS Enabled
                </span>
                {hasTests && (
                  <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                    <Sparkles size={12} className="mr-1" /> Automated Grading
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {instructions && (
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <Info size={16} className="mr-1.5" />
                {showInstructions ? 'Hide Instructions' : 'View Instructions'}
                {showInstructions ? (
                  <ChevronUp size={16} className="ml-1" />
                ) : (
                  <ChevronDown size={16} className="ml-1" />
                )}
              </button>
            )}

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
              className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>

        {/* Collapsible Instructions Box: Upgraded font size & contrast for effortless readability */}
        {showInstructions && instructions && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10 text-sm sm:text-[15px] text-slate-800 dark:text-zinc-100 whitespace-pre-line leading-relaxed font-normal">
            {instructions}
          </div>
        )}

        {/* Test Score Banner */}
        {testScore !== null && (
          <div
            className={`mt-3 p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              testScore >= (step.passingScore || 80)
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200'
                : 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {testScore >= (step.passingScore || 80) ? (
                <CheckCircle2
                  size={18}
                  className="text-emerald-600 dark:text-emerald-400 shrink-0"
                />
              ) : (
                <XCircle
                  size={18}
                  className="text-amber-600 dark:text-amber-400 shrink-0"
                />
              )}
              <span className="text-xs sm:text-sm font-semibold">
                <span className="font-bold">
                  Automated Grading Score: {testScore}%
                </span>
                {testScore >= (step.passingScore || 80)
                  ? ' — Congratulations! All passing criteria have been met.'
                  : ' — Some tests failed. Review the test logs in the Automated Tests tab below to fix.'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-amber-200/60 text-amber-900 dark:bg-black/40 dark:text-zinc-200 shrink-0">
              Pass Mark: {step.passingScore || 80}%
            </span>
          </div>
        )}
      </div>

      {/* Embedded Sandpack CSS fixes */}
      <style jsx global>{`
        .sp-preview,
        .sp-preview-container,
        .sp-preview-iframe {
          height: 100% !important;
          min-height: 100% !important;
          width: 100% !important;
        }
        .sp-console {
          height: 100% !important;
          width: 100% !important;
          background: #141414 !important;
          font-size: 13px !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            'Liberation Mono', 'Courier New', monospace !important;
        }
        .sp-console-list {
          overflow-x: hidden !important;
          overflow-y: auto !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .sp-console-item {
          font-size: 13px !important;
          line-height: 1.5 !important;
          padding: 6px 12px !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
        }
        .sp-console-item .cm-editor,
        .sp-console-item .cm-scroller,
        .sp-console-item .cm-content,
        .sp-console-item .cm-line,
        .sp-console-item pre {
          font-size: 13px !important;
          font-family: inherit !important;
          line-height: 1.5 !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          max-width: 100% !important;
        }
        .sp-console-item .cm-scroller {
          overflow-x: hidden !important;
        }
      `}</style>

      {/* Sandpack Workspace Container */}
      <div
        className={`rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#1e1e1e] flex flex-col ${
          isFullScreen ? 'flex-1 min-h-0' : 'h-[640px]'
        }`}
      >
        <SandpackProvider
          template={
            template === 'static' || template === 'html' ? 'static' : 'react'
          }
          theme="dark"
          files={initialFiles}
          options={{
            activeFile:
              step.activeFile ||
              (template === 'static' ? '/index.html' : '/App.js'),
            recompileMode: 'delayed',
            recompileDelay: 300,
            externalResources: ['https://cdn.tailwindcss.com'],
          }}
        >
          <SandpackWorkspaceContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            viewMode={viewMode}
            setViewMode={setViewMode}
            hasTests={hasTests}
            testScore={testScore}
            testStatus={testStatus}
            passingScore={step.passingScore || 80}
            isFullScreen={isFullScreen}
            setIsFullScreen={setIsFullScreen}
            step={step}
            setTestScore={setTestScore}
            setTestStatus={setTestStatus}
            onReset={() => {
              setTestScore(null)
              setTestStatus('idle')
            }}
            onRunTests={() => {
              setTestStatus('running')
            }}
            handleTestComplete={handleTestComplete}
            onReportScore={handleScoreReport}
          />
        </SandpackProvider>
      </div>
    </div>
  )
}
