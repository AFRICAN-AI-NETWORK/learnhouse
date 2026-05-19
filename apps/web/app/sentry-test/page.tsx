'use client'

import React, { useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'

export default function SentryTestPage() {
  const [status, setStatus] = useState<'idle' | 'triggered' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const triggerTestError = () => {
    setStatus('triggered')
    setErrorMessage(null)

    try {
      // 1. Send a test metric as requested by the user
      Sentry.metrics.count('test_counter', 1)

      // 2. Trigger intentional undefined function call as requested by the user
      // @ts-ignore
      myUndefinedFunction()
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err?.message || String(err))
      
      // Capture exception manually to guarantee immediate delivery to Sentry dashboard
      Sentry.captureException(err)
      
      console.error('Captured Sentry Test Error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-rose-500/30 selection:text-rose-200">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-2">
            ⚠️
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Sentry Verification
          </h1>
          <p className="text-slate-400 text-sm">
            Validate Sentry DSN configuration, metric counting, and error capturing.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-xs font-mono space-y-2 text-slate-300">
            <div className="text-slate-500">// Action Triggers</div>
            <div>Sentry.metrics.count('test_counter', 1);</div>
            <div className="text-rose-400">myUndefinedFunction();</div>
          </div>

          <button
            onClick={triggerTestError}
            className="w-full relative group overflow-hidden rounded-2xl p-[1px] focus:outline-none transition-all active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 rounded-2xl" />
            <span className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 rounded-[15px] relative group-hover:bg-transparent transition-colors duration-300 text-white font-medium">
              Trigger Verification Error
            </span>
          </button>

          {status === 'triggered' && (
            <div className="text-center text-sm text-yellow-400 animate-pulse">
              Running verification test...
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 w-fit px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Captured Successfully
              </div>
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                <div className="text-xs text-slate-500 font-semibold">Error Message:</div>
                <div className="text-xs font-mono text-rose-400 break-all">
                  {errorMessage}
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Metric and runtime exception captured and sent to the Sentry dashboard.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/60 flex justify-between items-center text-xs text-slate-500">
          <Link
            href="/"
            className="hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            ← Back to Home
          </Link>
          <span>LearnHouse v0.1.0</span>
        </div>
      </div>
    </div>
  )
}
