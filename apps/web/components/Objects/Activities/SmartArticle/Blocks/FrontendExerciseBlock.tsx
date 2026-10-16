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

interface FrontendExerciseBlockProps {
  step: any
  isFocusMode?: boolean
}

// Inner toolbar component to interact with Sandpack state
function ExerciseActions({
  onRunTests,
  hasTests,
  onReset,
  activeTab,
  setActiveTab,
  isFullScreen,
  setIsFullScreen,
}: {
  onRunTests: () => void
  hasTests: boolean
  onReset: () => void
  activeTab: 'preview' | 'tests' | 'console'
  setActiveTab: (tab: 'preview' | 'tests' | 'console') => void
  isFullScreen: boolean
  setIsFullScreen: (fs: boolean | ((prev: boolean) => boolean)) => void
}) {
  const { sandpack } = useSandpack()

  return (
    <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#111111] border-t border-white/5 gap-3 shrink-0">
      {/* View Switcher Tabs */}
      <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'preview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Eye size={13} className="mr-1.5" /> Live Preview
        </button>

        {hasTests && (
          <button
            onClick={() => {
              setActiveTab('tests')
              onRunTests()
            }}
            className={`flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'tests'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CheckCircle2 size={13} className="mr-1.5" /> Automated Tests
          </button>
        )}

        <button
          onClick={() => setActiveTab('console')}
          className={`flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'console'
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Terminal size={13} className="mr-1.5" /> Console
        </button>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => {
            sandpack.resetAllFiles()
            onReset()
          }}
          className="flex items-center text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1"
        >
          <RotateCcw size={12} className="mr-1.5" /> Reset Files
        </button>

        <button
          onClick={() => setIsFullScreen((prev) => !prev)}
          title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
          className="flex items-center text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all"
        >
          {isFullScreen ? (
            <>
              <Minimize2 size={13} className="mr-1.5" /> Exit Full Screen
            </>
          ) : (
            <>
              <Maximize2 size={13} className="mr-1.5" /> Full Screen
            </>
          )}
        </button>

        {hasTests && (
          <button
            onClick={() => {
              setActiveTab('tests')
              onRunTests()
            }}
            className="flex items-center px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_2px_10px_rgba(16,185,129,0.3)]"
          >
            <Play size={12} className="mr-1.5 fill-current" /> Run Tests & Grade
          </button>
        )}
      </div>
    </div>
  )
}

export default function FrontendExerciseBlock({
  step,
  isFocusMode = false,
}: FrontendExerciseBlockProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'tests' | 'console'>(
    'preview'
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

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-[100] bg-[#0d0d0d] p-4 flex flex-col w-screen h-screen overflow-hidden'
          : `w-full py-4 mx-auto`
      }
    >
      {/* Exercise Header */}
      <div className="mb-3 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Code2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 font-semibold">
                  {template}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                  Tailwind CSS Enabled
                </span>
                {hasTests && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                    <Sparkles size={10} className="mr-1" /> Automated Grading
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {instructions && (
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <Info size={14} className="mr-1" />
                {showInstructions ? 'Hide Instructions' : 'View Instructions'}
                {showInstructions ? (
                  <ChevronUp size={14} className="ml-0.5" />
                ) : (
                  <ChevronDown size={14} className="ml-0.5" />
                )}
              </button>
            )}

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
              className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Collapsible Instructions Box */}
        {showInstructions && instructions && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
            {instructions}
          </div>
        )}

        {/* Test Score Banner */}
        {testScore !== null && (
          <div
            className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between ${
              testScore >= (step.passingScore || 80)
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              {testScore >= (step.passingScore || 80) ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <XCircle size={16} className="text-amber-500" />
              )}
              <span className="text-xs font-bold">
                Automated Grading Score: {testScore}%
                {testScore >= (step.passingScore || 80)
                  ? ' — All passing criteria met!'
                  : ' — Some tests failed. Review the test logs in the Automated Tests tab.'}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold">
              Pass Mark: {step.passingScore || 80}%
            </span>
          </div>
        )}
      </div>

      {/* Sandpack Workspace */}
      <div
        className={`rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl bg-[#1e1e1e] flex flex-col ${
          isFullScreen ? 'flex-1 min-h-0' : 'h-[560px]'
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
          <SandpackLayout className="!border-none !rounded-none flex-1 min-h-0 !h-full">
            {/* Left Panel: Code Editor */}
            <SandpackCodeEditor
              showTabs={true}
              showLineNumbers={true}
              showInlineErrors={true}
              wrapContent={true}
              closableTabs={false}
              style={{ height: '100%', flex: 1 }}
            />

            {/* Right Panel: Kept mounted at all times to preserve iframe state and console logs */}
            <div className="w-full flex-1 flex flex-col h-full bg-[#141414] border-l border-white/5 relative overflow-hidden">
              {/* Live Preview Pane */}
              <div
                className="w-full h-full"
                style={{ display: activeTab === 'preview' ? 'flex' : 'none' }}
              >
                <SandpackPreview
                  showNavigator={false}
                  showRefreshButton={true}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>

              {/* Automated Tests Pane */}
              {hasTests && (
                <div
                  className="w-full h-full overflow-y-auto p-2"
                  style={{ display: activeTab === 'tests' ? 'block' : 'none' }}
                >
                  <SandpackTests
                    watchMode={false}
                    verbose={true}
                    onComplete={handleTestComplete}
                    style={{ height: '100%' }}
                  />
                </div>
              )}

              {/* Console Output Pane */}
              <div
                className="w-full h-full flex flex-col overflow-y-auto"
                style={{ display: activeTab === 'console' ? 'flex' : 'none' }}
              >
                <SandpackConsole style={{ height: '100%' }} />
              </div>
            </div>
          </SandpackLayout>

          {/* Bottom Interactive Toolbar */}
          <ExerciseActions
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            hasTests={hasTests}
            isFullScreen={isFullScreen}
            setIsFullScreen={setIsFullScreen}
            onReset={() => {
              setTestScore(null)
              setTestStatus('idle')
            }}
            onRunTests={() => {
              setTestStatus('running')
            }}
          />
        </SandpackProvider>
      </div>
    </div>
  )
}
