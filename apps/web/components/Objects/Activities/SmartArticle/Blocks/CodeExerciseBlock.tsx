'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getAPIUrl } from '@services/config/config'
import {
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react'

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
        return
      }

      if (data.test_results && Array.isArray(data.test_results)) {
        setTestResults(data.test_results)
        setPassedCount(data.passed_count ?? 0)
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
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-[100] bg-[#0d0d0d] p-4 flex flex-col w-screen h-screen overflow-hidden'
          : 'w-full py-4'
      }
    >
      <div className="mb-3 shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 leading-snug">
            {step.title || 'Backend Coding Exercise'}
          </h3>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest flex items-center">
            <Terminal size={13} className="mr-1.5" /> Code Exercise ({language})
          </p>
        </div>

        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
          className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {instructions && (
        <div className="mb-3 p-3 rounded-xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed shrink-0">
          {instructions}
        </div>
      )}

      <div
        className={`rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d0d] nice-shadow flex flex-col ${
          isFullScreen ? 'flex-1 min-h-0' : ''
        }`}
      >
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02] shrink-0">
          <div className="flex space-x-2 items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
            <span className="text-xs font-mono text-zinc-400 ml-2">
              {`index.${
                language === 'javascript'
                  ? 'js'
                  : language === 'python'
                  ? 'py'
                  : 'ts'
              }`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="text-xs font-medium text-zinc-400 hover:text-white flex items-center px-2 py-1"
            >
              {isFullScreen ? (
                <>
                  <Minimize2 size={12} className="mr-1" /> Exit
                </>
              ) : (
                <>
                  <Maximize2 size={12} className="mr-1" /> Expand
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className={`relative ${isFullScreen ? 'flex-1 min-h-0' : ''}`}>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            className={`w-full p-4 bg-transparent text-zinc-200 font-mono text-sm leading-relaxed focus:outline-none resize-none ${
              isFullScreen ? 'h-full' : 'min-h-[220px]'
            }`}
            placeholder="// Write your code here..."
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.01] shrink-0">
          <button
            onClick={() => setCode(startingCode)}
            className="flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RotateCcw size={12} className="mr-1.5" /> Reset Code
          </button>
          <button
            onClick={handleRunCode}
            disabled={isRunning || code.trim() === ''}
            className={`flex items-center px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all nice-shadow ${
              isRunning || code.trim() === ''
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_4px_14px_rgba(79,70,229,0.4)]'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center">
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                Running on Piston...
              </span>
            ) : (
              <span className="flex items-center">
                <Play size={13} className="mr-1.5 fill-current" /> Run Code
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Test Cases Results Breakdown */}
      {testResults.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Test Case Verification
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
                className={`p-2 rounded-lg text-xs font-mono flex items-start justify-between border ${
                  tc.passed
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                    : 'border-red-500/20 bg-red-500/5 text-red-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {tc.passed ? (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-400 shrink-0" />
                  )}
                  <span>
                    Test {idx + 1}: {tc.passed ? 'Output matched expected answer' : 'Output did not match'}
                  </span>
                </div>
                {!tc.passed && tc.expected_output && (
                  <span className="text-[11px] text-zinc-400 ml-4">
                    Expected: {tc.expected_output} | Got: {tc.actual_output || '(empty)'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal Stdout / Stderr Output */}
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 p-4 rounded-xl border flex items-start shrink-0 ${
            isError
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-green-500/20 bg-green-500/5'
          }`}
        >
          {isError ? (
            <AlertCircle
              size={18}
              className="text-red-500 mr-2.5 shrink-0 mt-0.5"
            />
          ) : (
            <CheckCircle2
              size={18}
              className="text-green-500 mr-2.5 shrink-0 mt-0.5"
            />
          )}
          <pre
            className={`font-mono text-xs whitespace-pre-wrap ${
              isError ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {output}
          </pre>
        </motion.div>
      )}
    </div>
  )
}
