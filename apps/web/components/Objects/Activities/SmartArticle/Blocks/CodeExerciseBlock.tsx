'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { getAPIUrl } from '@services/config/config'
import { Terminal, Play, CheckCircle2, AlertCircle } from 'lucide-react'

interface CodeExerciseBlockProps {
  step: any
}

export default function CodeExerciseBlock({ step }: CodeExerciseBlockProps) {
  const language = step.language || 'javascript'
  const startingCode = step.startingCode || ''
  const instructions = step.content || step.text || ''

  const [code, setCode] = useState(startingCode)
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  const handleRunCode = async () => {
    setIsRunning(true)
    setOutput(null)
    setIsError(false)

    try {
      const response = await fetch(`${getAPIUrl()}code/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code,
          test_cases: step.testCases || step.test_cases || [],
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setIsError(true)
        setOutput(data.detail || 'Code execution failed.')
        return
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
    <div className="w-full max-w-4xl py-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2 leading-relaxed">
          {instructions}
        </h3>
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest flex items-center">
          <Terminal size={14} className="mr-2" /> Code Exercise ({language})
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d0d] nice-shadow">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span className="text-xs font-mono text-zinc-500">{`index.${language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'ts'}`}</span>
        </div>

        {/* Editor Body */}
        <div className="relative">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            className="w-full min-h-[250px] p-6 bg-transparent text-zinc-300 font-mono text-sm leading-relaxed focus:outline-none resize-y"
            placeholder="// Write your code here..."
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.01]">
          <button
            onClick={() => setCode(startingCode)}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Reset Code
          </button>
          <button
            onClick={handleRunCode}
            disabled={isRunning || code.trim() === ''}
            className={`flex items-center px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all nice-shadow ${
              isRunning || code.trim() === ''
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_4px_14px_rgba(79,70,229,0.4)]'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center">
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                Running...
              </span>
            ) : (
              <span className="flex items-center">
                <Play size={14} className="mr-2" /> Run Code
              </span>
            )}
          </button>
        </div>
      </div>

      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-6 p-5 rounded-2xl border flex items-start ${
            isError
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-green-500/20 bg-green-500/5'
          }`}
        >
          {isError ? (
            <AlertCircle
              size={20}
              className="text-red-500 mr-3 shrink-0 mt-0.5"
            />
          ) : (
            <CheckCircle2
              size={20}
              className="text-green-500 mr-3 shrink-0 mt-0.5"
            />
          )}
          <pre
            className={`font-mono text-sm whitespace-pre-wrap ${
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
