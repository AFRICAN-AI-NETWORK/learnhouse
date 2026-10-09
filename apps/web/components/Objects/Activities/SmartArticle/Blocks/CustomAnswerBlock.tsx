'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react'

interface CustomAnswerBlockProps {
  step: any
}

export default function CustomAnswerBlock({ step }: CustomAnswerBlockProps) {
  const promptText = step.content || step.text || ''

  const [answer, setAnswer] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = () => {
    if (answer.trim() === '') return
    setIsSubmitted(true)
  }

  return (
    <div className="w-full max-w-3xl py-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2 leading-relaxed">
          {promptText}
        </h3>
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest flex items-center">
          <MessageSquare size={14} className="mr-2" /> Short Answer
        </p>
      </div>

      {!isSubmitted ? (
        <div className="space-y-4">
          <div className="relative group">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full min-h-[160px] p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-zinc-200 text-base leading-relaxed focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all resize-y nice-shadow"
              placeholder="Type your response here..."
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={answer.trim() === ''}
              className={`flex items-center px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all nice-shadow ${
                answer.trim() !== ''
                  ? 'bg-primary text-white hover:scale-[1.02] shadow-[0_10px_30px_rgba(var(--primary),0.3)]'
                  : 'bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5'
              }`}
            >
              Submit Response
              <Send size={14} className="ml-2" />
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/5 flex items-center text-green-400 bg-green-400/5">
            <CheckCircle2 size={18} className="mr-2" />
            <span className="font-semibold text-sm">Response Recorded</span>
          </div>
          <div className="p-6">
            <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {answer}
            </p>
          </div>
          <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5">
            <p className="text-xs font-medium text-zinc-500">
              Your instructor will review this submission.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
