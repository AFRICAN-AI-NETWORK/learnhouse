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
  // Backwards compatibility: If there are no questions array, initialize it with the existing single question structure.
  const questions = step.questions || [
    {
      content: step.content || step.text || '',
      options: step.options || ['Option 1', 'Option 2'],
      correctOptionIndex: step.correctOptionIndex ?? 0,
    },
  ]

  const handleUpdateQuestion = (qIdx: number, field: string, value: any) => {
    const newQuestions = [...questions]
    newQuestions[qIdx] = { ...newQuestions[qIdx], [field]: value }
    handleUpdateBlock(index, 'questions', newQuestions)
  }

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    const newQuestions = [...questions]
    const newOptions = [...newQuestions[qIdx].options]
    newOptions[optIdx] = val
    newQuestions[qIdx].options = newOptions
    handleUpdateBlock(index, 'questions', newQuestions)
  }

  const handleAddOption = (qIdx: number) => {
    const newQuestions = [...questions]
    newQuestions[qIdx].options.push(
      `Option ${newQuestions[qIdx].options.length + 1}`
    )
    handleUpdateBlock(index, 'questions', newQuestions)
  }

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    const newQuestions = [...questions]
    if (newQuestions[qIdx].options.length <= 2) return
    newQuestions[qIdx].options = newQuestions[qIdx].options.filter(
      (_: string, i: number) => i !== optIdx
    )

    if (newQuestions[qIdx].correctOptionIndex === optIdx) {
      newQuestions[qIdx].correctOptionIndex = 0
    } else if (newQuestions[qIdx].correctOptionIndex > optIdx) {
      newQuestions[qIdx].correctOptionIndex--
    }
    handleUpdateBlock(index, 'questions', newQuestions)
  }

  const handleAddQuestion = () => {
    const newQuestions = [
      ...questions,
      {
        content: '',
        options: ['Option 1', 'Option 2'],
        correctOptionIndex: 0,
      },
    ]
    handleUpdateBlock(index, 'questions', newQuestions)
  }

  const handleRemoveQuestion = (qIdx: number) => {
    if (questions.length <= 1) return
    const newQuestions = questions.filter((_: any, i: number) => i !== qIdx)
    handleUpdateBlock(index, 'questions', newQuestions)
  }

  return (
    <div className="p-4 space-y-8">
      {questions.map((q: any, qIdx: number) => (
        <div
          key={qIdx}
          className="space-y-4 p-4 border border-indigo-100 rounded-xl bg-indigo-50/30 relative"
        >
          {questions.length > 1 && (
            <button
              onClick={() => handleRemoveQuestion(qIdx)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove question"
            >
              <Trash2 size={16} />
            </button>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Question {qIdx + 1}
            </label>
            <textarea
              value={q.content || ''}
              onChange={(e) =>
                handleUpdateQuestion(qIdx, 'content', e.target.value)
              }
              className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-sm bg-white"
              placeholder="Enter the quiz question..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Options
            </label>
            <div className="space-y-2">
              {q.options.map((opt: string, optIdx: number) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleUpdateQuestion(qIdx, 'correctOptionIndex', optIdx)
                    }
                    className={`p-1.5 rounded-full transition-colors ${
                      q.correctOptionIndex === optIdx
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title="Mark as correct answer"
                  >
                    {q.correctOptionIndex === optIdx ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) =>
                      handleOptionChange(qIdx, optIdx, e.target.value)
                    }
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
                    placeholder={`Option ${optIdx + 1}`}
                  />
                  <button
                    onClick={() => handleRemoveOption(qIdx, optIdx)}
                    disabled={q.options.length <= 2}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleAddOption(qIdx)}
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-1 bg-indigo-100 hover:bg-indigo-200 rounded"
            >
              <Plus size={14} /> Add Option
            </button>
          </div>
        </div>
      ))}

      <div className="pt-2">
        <button
          onClick={handleAddQuestion}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 rounded-lg transition-colors text-sm font-semibold shadow-sm w-full justify-center"
        >
          <Plus size={16} /> Add Another Question
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

export function LearningObjectivesEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  const objectives = step.objectives || ['']
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Objectives
        </label>
        <div className="space-y-2">
          {objectives.map((obj: string, optIdx: number) => (
            <div key={optIdx} className="flex items-center gap-2">
              <input
                type="text"
                value={obj}
                onChange={(e) => {
                  const newObjs = [...objectives]
                  newObjs[optIdx] = e.target.value
                  handleUpdateBlock(index, 'objectives', newObjs)
                }}
                className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Objective"
              />
              <button
                onClick={() => {
                  handleUpdateBlock(
                    index,
                    'objectives',
                    objectives.filter((_: any, i: number) => i !== optIdx)
                  )
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            handleUpdateBlock(index, 'objectives', [...objectives, ''])
          }
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
        >
          <Plus size={14} /> Add Objective
        </button>
      </div>
    </div>
  )
}

export function ConceptEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  const subsections = step.subsections || [{ heading: '', content: '' }]
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Subsections
        </label>
        <div className="space-y-4">
          {subsections.map((sub: any, optIdx: number) => (
            <div
              key={optIdx}
              className="p-4 border border-gray-100 rounded-xl relative space-y-3 bg-gray-50"
            >
              <input
                type="text"
                value={sub.heading}
                onChange={(e) => {
                  const newSubs = [...subsections]
                  newSubs[optIdx] = {
                    ...newSubs[optIdx],
                    heading: e.target.value,
                  }
                  handleUpdateBlock(index, 'subsections', newSubs)
                }}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Subsection Heading"
              />
              <textarea
                value={sub.content}
                onChange={(e) => {
                  const newSubs = [...subsections]
                  newSubs[optIdx] = {
                    ...newSubs[optIdx],
                    content: e.target.value,
                  }
                  handleUpdateBlock(index, 'subsections', newSubs)
                }}
                className="w-full min-h-[80px] p-2 border border-gray-200 rounded-lg text-sm resize-y"
                placeholder="Content..."
              />
              <button
                onClick={() => {
                  handleUpdateBlock(
                    index,
                    'subsections',
                    subsections.filter((_: any, i: number) => i !== optIdx)
                  )
                }}
                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            handleUpdateBlock(index, 'subsections', [
              ...subsections,
              { heading: '', content: '' },
            ])
          }
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
        >
          <Plus size={14} /> Add Subsection
        </button>
      </div>
    </div>
  )
}

export function RealWorldExamplesEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  const examples = step.examples || [{ name: '', description: '' }]
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Examples
        </label>
        <div className="space-y-4">
          {examples.map((ex: any, optIdx: number) => (
            <div key={optIdx} className="flex gap-2 relative">
              <input
                type="text"
                value={ex.name}
                onChange={(e) => {
                  const newEx = [...examples]
                  newEx[optIdx] = { ...newEx[optIdx], name: e.target.value }
                  handleUpdateBlock(index, 'examples', newEx)
                }}
                className="w-1/3 p-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Example Name"
              />
              <input
                type="text"
                value={ex.description}
                onChange={(e) => {
                  const newEx = [...examples]
                  newEx[optIdx] = {
                    ...newEx[optIdx],
                    description: e.target.value,
                  }
                  handleUpdateBlock(index, 'examples', newEx)
                }}
                className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Short description"
              />
              <button
                onClick={() => {
                  handleUpdateBlock(
                    index,
                    'examples',
                    examples.filter((_: any, i: number) => i !== optIdx)
                  )
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            handleUpdateBlock(index, 'examples', [
              ...examples,
              { name: '', description: '' },
            ])
          }
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
        >
          <Plus size={14} /> Add Example
        </button>
      </div>
    </div>
  )
}

export function SummaryEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  const items = step.items || ['']
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Recap Items
        </label>
        <div className="space-y-2">
          {items.map((item: string, optIdx: number) => (
            <div key={optIdx} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[optIdx] = e.target.value
                  handleUpdateBlock(index, 'items', newItems)
                }}
                className="flex-1 p-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Recap point"
              />
              <button
                onClick={() => {
                  handleUpdateBlock(
                    index,
                    'items',
                    items.filter((_: any, i: number) => i !== optIdx)
                  )
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => handleUpdateBlock(index, 'items', [...items, ''])}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
        >
          <Plus size={14} /> Add Item
        </button>
      </div>
    </div>
  )
}

export function AnalogyEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  return (
    <div className="p-4 space-y-4">
      <textarea
        value={step.content || ''}
        onChange={(e) => handleUpdateBlock(index, 'content', e.target.value)}
        className="w-full min-h-[80px] p-2 border border-gray-200 rounded-lg text-sm resize-y"
        placeholder="Analogy Explanation..."
      />
      <input
        type="text"
        value={step.example || ''}
        onChange={(e) => handleUpdateBlock(index, 'example', e.target.value)}
        className="w-full p-2 border border-gray-200 rounded-lg text-sm"
        placeholder="Analogy Example (e.g. 'Like a postal service...')"
      />
    </div>
  )
}

export function EmbedEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  return (
    <div className="p-4 space-y-4 bg-slate-50 rounded-lg border border-slate-100">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Video or Embed URL
        </label>
        <input
          type="text"
          value={step.url || step.content || ''}
          onChange={(e) => handleUpdateBlock(index, 'url', e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="https://youtube.com/watch?v=..."
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Paste a YouTube URL here. It will be embedded automatically.
        </p>
      </div>
    </div>
  )
}

export function ImageEditorBlock({
  step,
  index,
  handleUpdateBlock,
}: BlockProps) {
  return (
    <div className="p-4 space-y-4 bg-slate-50 rounded-lg border border-slate-100">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Image URL
        </label>
        <input
          type="text"
          value={step.url || step.content || ''}
          onChange={(e) => handleUpdateBlock(index, 'url', e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="https://example.com/image.png"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Paste a direct image URL.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Caption (Optional)
        </label>
        <input
          type="text"
          value={step.caption || ''}
          onChange={(e) => handleUpdateBlock(index, 'caption', e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Image caption"
        />
      </div>
    </div>
  )
}
