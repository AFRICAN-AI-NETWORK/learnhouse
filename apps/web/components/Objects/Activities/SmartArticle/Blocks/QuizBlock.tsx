'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, ArrowRight } from 'lucide-react'

interface QuizBlockProps {
  step: any
}

export default function QuizBlock({ step }: QuizBlockProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const options: string[] = step.options || []
  const correctOptionIndex = step.correctOptionIndex ?? 0

  const questionText = step.content || step.text || ''

  const handleSubmit = () => {
    if (selectedOption === null) return
    setIsSubmitted(true)
  }

  const getOptionStyle = (index: number) => {
    if (!isSubmitted) {
      return selectedOption === index
        ? 'border-primary/50 bg-primary/10 text-white'
        : 'border-white/10 hover:border-white/30 text-zinc-300 hover:bg-white/5'
    }

    if (index === correctOptionIndex) {
      return 'border-green-500/50 bg-green-500/10 text-green-400'
    }

    if (selectedOption === index && index !== correctOptionIndex) {
      return 'border-red-500/50 bg-red-500/10 text-red-400'
    }

    return 'border-white/5 opacity-50 text-zinc-500 cursor-not-allowed'
  }

  return (
    <div className="w-full max-w-3xl py-8">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-2 leading-relaxed">
          {questionText}
        </h3>
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest">
          Knowledge Check
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {options.map((option, index) => {
          const letter = String.fromCharCode(65 + index) // A, B, C...

          return (
            <button
              key={index}
              onClick={() => !isSubmitted && setSelectedOption(index)}
              disabled={isSubmitted}
              className={`w-full flex items-center p-4 rounded-2xl border transition-all duration-300 group text-left ${getOptionStyle(index)}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg mr-4 text-sm font-black transition-colors ${
                  isSubmitted && index === correctOptionIndex
                    ? 'bg-green-500/20 text-green-500'
                    : isSubmitted &&
                        selectedOption === index &&
                        index !== correctOptionIndex
                      ? 'bg-red-500/20 text-red-500'
                      : selectedOption === index
                        ? 'bg-primary/20 text-primary'
                        : 'bg-white/5 text-zinc-400 group-hover:bg-white/10'
                }`}
              >
                {isSubmitted && index === correctOptionIndex ? (
                  <Check size={16} strokeWidth={3} />
                ) : isSubmitted &&
                  selectedOption === index &&
                  index !== correctOptionIndex ? (
                  <X size={16} strokeWidth={3} />
                ) : (
                  letter
                )}
              </div>
              <span className="flex-1 text-lg font-medium">{option}</span>
            </button>
          )
        })}
      </div>

      {!isSubmitted ? (
        <button
          onClick={handleSubmit}
          disabled={selectedOption === null}
          className={`flex items-center justify-center w-full md:w-auto px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all nice-shadow ${
            selectedOption !== null
              ? 'bg-primary text-white hover:scale-[1.02] shadow-[0_10px_30px_rgba(var(--primary),0.3)]'
              : 'bg-white/5 text-zinc-500 cursor-not-allowed border border-white/5'
          }`}
        >
          Check Answer
          <ArrowRight size={14} className="ml-2" />
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-2xl border ${selectedOption === correctOptionIndex ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}
        >
          <p
            className={`font-semibold ${selectedOption === correctOptionIndex ? 'text-green-400' : 'text-red-400'}`}
          >
            {selectedOption === correctOptionIndex
              ? 'Excellent! That is the correct answer.'
              : 'Not quite. Review the material and try again.'}
          </p>
        </motion.div>
      )}
    </div>
  )
}
