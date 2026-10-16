'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { getAPIUrl } from '@services/config/config'
import {
  Code,
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  ListChecks,
} from 'lucide-react'

// Dynamically import Monaco Editor to avoid SSR hydration issues
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[260px] flex items-center justify-center bg-[#1e1e1e] text-zinc-500 font-mono text-xs">
      Loading Monaco Code Editor...
    </div>
  ),
})

interface TestCaseResult {
  testUUID?: string
  input?: string
  expected_output?: string
  actual_output?: string
  passed: boolean
  status?: string
}

interface CodeExerciseBlockProps {
  step: any
}

export default function CodeExerciseBlock({ step }: CodeExerciseBlockProps) {
  const language = step.language || 'javascript'
  const startingCode = step.startingCode || ''
  const instructions = step.content || step.text || ''
  const testCases = step.testCases || step.test_cases || []

  const [code, setCode] = useState(startingCode)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [testResults, setTestResults] = useState<TestCaseResult[]>([])
  const [passedCount, setPassedCount] = useState<number | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [activeTab, setActiveTab] = useState<'output' | 'tests'>('output')

  // Keep state updated if step changes
  useEffect(() => {
    setCode(startingCode)
    setOutput(null)
    setTestResults([])
    setPassedCount(null)
  }, [startingCode])

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

  const handleRunCode = async () => {
    setIsRunning(true)
    setOutput(null)
    setIsError(false)
    setTestResults([])
    setPassedCount(null)

    try {
      const response = await fetch(`${getAPIUrl()}code/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code,
          test_cases: testCases,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setIsError(true)
        setOutput(data.detail || 'Code execution failed.')
        setActiveTab('output')
        return
      }

      if (data.test_results && Array.isArray(data.test_results)) {
        setTestResults(data.test_results)
        setPassedCount(data.passed_count ?? 0)
        // If test results are returned, highlight the test cases tab
        setActiveTab('tests')
      } else {
        setActiveTab('output')
      }

      if (data.stderr && data.stderr.trim()) {
        setIsError(true)
        setOutput(data.stderr)
      } else if (data.stdout && data.stdout.trim()) {
        setIsError(false)
        setOutput(data.stdout)
      } else {
        setIsError(false)
        setOutput('(Program executed successfully with no output)')
      }
    } catch (e: any) {
      setIsError(true)
      setOutput('Network error: Unable to execute code.')
      setActiveTab('output')
    } finally {
      setIsRunning(false)
    }
  }

  const fileName = `index.${
    language === 'javascript' || language === 'node'
      ? 'js'
      : language === 'python'
        ? 'py'
        : language === 'typescript'
          ? 'ts'
          : 'txt'
  }`

  const monacoLanguage =
    language === 'javascript' || language === 'node'
      ? 'javascript'
      : language === 'python'
        ? 'python'
        : language === 'typescript'
          ? 'typescript'
          : language

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-[100] bg-[#0d0d0d] p-4 sm:p-6 flex flex-col w-screen h-screen overflow-hidden'
          : 'w-full max-w-4xl xl:max-w-5xl mx-auto py-2'
      }
    >
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Code size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {step.title || 'Backend Coding Exercise'}
              </h3>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 font-semibold">
                  {language}
                </span>
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Piston Isolated Sandbox
                </span>
                {testCases.length > 0 && (
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                    {testCases.length} Test Case
                    {testCases.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
            className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        {/* Instructions */}
        {instructions && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
            {instructions}
          </div>
        )}

        {/* IDE Window */}
        <div
          className={`rounded-2xl overflow-hidden border border-slate-800 bg-[#1e1e1e] shadow-xl flex flex-col ${
            isFullScreen ? 'flex-1 min-h-0' : ''
          }`}
        >
          {/* Top IDE Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#181818] border-b border-white/5 shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
              <span className="text-xs font-mono text-zinc-400 ml-2">
                {fileName}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCode(startingCode)}
                className="flex items-center text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-2.5 py-1 rounded hover:bg-white/5"
              >
                <RotateCcw size={12} className="mr-1.5" /> Reset
              </button>
              <button
                onClick={handleRunCode}
                disabled={isRunning || code.trim() === ''}
                className={`flex items-center px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  isRunning || code.trim() === ''
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/30'
                }`}
              >
                {isRunning ? (
                  <span className="flex items-center">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin mr-1.5"></div>
                    Running...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Play size={12} className="mr-1.5 fill-current" /> Run Code
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor Component */}
          <div
            className={`relative ${isFullScreen ? 'flex-1 min-h-[300px]' : 'h-[300px]'}`}
          >
            <Editor
              height="100%"
              width="100%"
              language={monacoLanguage}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                roundedSelection: true,
                padding: { top: 12, bottom: 12 },
                cursorBlinking: 'smooth',
                fontFamily:
                  'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
              }}
            />
          </div>

          {/* Output / Tests Panel Navigation */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-[#141414] shrink-0">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('output')}
                className={`flex items-center px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'output'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Terminal size={12} className="mr-1.5" /> Output Console
              </button>

              {testCases.length > 0 && (
                <button
                  onClick={() => setActiveTab('tests')}
                  className={`flex items-center px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'tests'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ListChecks size={12} className="mr-1.5" /> Test Cases
                  {testResults.length > 0 && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                        passedCount === testResults.length
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {passedCount}/{testResults.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Active Panel View */}
          <div className="p-4 bg-[#0d0d0d] border-t border-white/5 max-h-48 overflow-y-auto">
            {activeTab === 'output' && (
              <div>
                {output ? (
                  <pre
                    className={`font-mono text-xs whitespace-pre-wrap leading-relaxed ${
                      isError ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {output}
                  </pre>
                ) : (
                  <p className="text-xs text-zinc-500 font-mono italic">
                    Click "Run Code" above to execute your code on Piston and
                    see console output.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-2">
                {testResults.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-zinc-300">
                        Test Suite Results
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                          passedCount === testResults.length
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {passedCount} / {testResults.length} Passed
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {testResults.map((tc, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg text-xs font-mono flex items-start justify-between border ${
                            tc.passed
                              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                              : 'border-red-500/20 bg-red-500/5 text-red-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {tc.passed ? (
                              <CheckCircle2
                                size={15}
                                className="text-emerald-400 shrink-0"
                              />
                            ) : (
                              <XCircle
                                size={15}
                                className="text-red-400 shrink-0"
                              />
                            )}
                            <span>
                              Test {idx + 1}:{' '}
                              {tc.passed
                                ? 'Output matched expected answer!'
                                : 'Output did not match expected answer'}
                            </span>
                          </div>
                          {!tc.passed && tc.expected_output && (
                            <span className="text-[11px] text-zinc-400 ml-4">
                              Expected: {tc.expected_output} | Got:{' '}
                              {tc.actual_output || '(empty)'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400 font-mono">
                      Expected test cases for this challenge:
                    </p>
                    {testCases.map((tc: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-white/5 border border-white/5 text-xs font-mono text-zinc-300 flex items-center justify-between"
                      >
                        <span>
                          Test {idx + 1}: {tc.description || 'Output assertion'}
                        </span>
                        <span className="text-zinc-500 text-[11px]">
                          Expected: {tc.expectedOutput || tc.expected_output}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
