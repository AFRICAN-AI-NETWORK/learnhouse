import React from 'react'
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'

interface BlockProps {
  step: any
  index: number
  handleUpdateBlock: (index: number, field: string, value: any) => void
}

export function QuizEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  const options = step.options || ['Option 1', 'Option 2']
  const correctIndex = step.correctOptionIndex ?? 0

  const handleOptionChange = (optIdx: number, val: string) => {
    const newOptions = [...options]
    newOptions[optIdx] = val
    handleUpdateBlock(index, 'options', newOptions)
  }

  const handleAddOption = () => {
    handleUpdateBlock(index, 'options', [
      ...options,
      `Option ${options.length + 1}`,
    ])
  }

  const handleRemoveOption = (optIdx: number) => {
    if (options.length <= 2) return
    const newOptions = options.filter((_: string, i: number) => i !== optIdx)
    handleUpdateBlock(index, 'options', newOptions)
    if (correctIndex === optIdx) {
      handleUpdateBlock(index, 'correctOptionIndex', 0)
    } else if (correctIndex > optIdx) {
      handleUpdateBlock(index, 'correctOptionIndex', correctIndex - 1)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Question
        </label>
        <textarea
          value={step.content || step.text || ''}
          onChange={(e) => handleUpdateBlock(index, 'content', e.target.value)}
          className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm"
          placeholder="Enter the quiz question..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Options
        </label>
        <div className="space-y-2">
          {options.map((opt: string, optIdx: number) => (
            <div key={optIdx} className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleUpdateBlock(index, 'correctOptionIndex', optIdx)
                }
                className={`p-1.5 rounded-full transition-colors ${
                  correctIndex === optIdx
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title="Mark as correct answer"
              >
                {correctIndex === optIdx ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Circle size={18} />
                )}
              </button>
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder={`Option ${optIdx + 1}`}
              />
              <button
                onClick={() => handleRemoveOption(optIdx)}
                disabled={options.length <= 2}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddOption}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded"
        >
          <Plus size={14} /> Add Option
        </button>
      </div>
    </div>
  )
}

export function CodeExerciseEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  const language = step.language || 'javascript'
  const startingCode = step.startingCode || ''

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Instructions
        </label>
        <textarea
          value={step.content || step.text || ''}
          onChange={(e) => handleUpdateBlock(index, 'content', e.target.value)}
          className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm"
          placeholder="Describe the code exercise..."
        />
      </div>
      <div className="flex gap-4">
        <div className="w-1/3">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Language
          </label>
          <select
            value={language}
            onChange={(e) =>
              handleUpdateBlock(index, 'language', e.target.value)
            }
            className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML/CSS</option>
          </select>
        </div>
        <div className="w-2/3">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Starting Code (Optional)
          </label>
          <textarea
            value={startingCode}
            onChange={(e) =>
              handleUpdateBlock(index, 'startingCode', e.target.value)
            }
            className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-y"
            placeholder="// function solve() { ... }"
          />
        </div>
      </div>
    </div>
  )
}

export function CustomAnswerEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Prompt
        </label>
        <textarea
          value={step.content || step.text || ''}
          onChange={(e) => handleUpdateBlock(index, 'content', e.target.value)}
          className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm"
          placeholder="Enter the prompt for the student's custom response..."
        />
      </div>
    </div>
  )
}

export function FileSubmissionEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Submission Instructions
        </label>
        <textarea
          value={step.content || step.text || ''}
          onChange={(e) => handleUpdateBlock(index, 'content', e.target.value)}
          className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm"
          placeholder="E.g., Upload your PDF report here..."
        />
      </div>
    </div>
  )
}
