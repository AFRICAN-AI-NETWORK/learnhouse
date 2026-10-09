'use client'

import React, { useState } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'
import {
  GripVertical,
  Image as ImageIcon,
  Type,
  Code,
  LayoutTemplate,
  Save,
  Trash2,
  HelpCircle,
  MessageSquare,
  TerminalSquare,
  UploadCloud,
} from 'lucide-react'
import {
  QuizEditorBlock,
  CodeExerciseEditorBlock,
  CustomAnswerEditorBlock,
  FileSubmissionEditorBlock,
  LearningObjectivesEditorBlock,
  ConceptEditorBlock,
  RealWorldExamplesEditorBlock,
  SummaryEditorBlock,
  AnalogyEditorBlock,
  EmbedEditorBlock,
  ImageEditorBlock,
} from './SmartArticleEditorBlocks'

interface SmartArticleEditorProps {
  content: any
  setContent: (content: any) => void
  activity: any
  course: any
  org: any
}

export default function SmartArticleEditor({
  content,
  setContent,
  activity,
  course,
  org,
}: SmartArticleEditorProps) {
  const [steps, setSteps] = useState<any[]>(content?.steps || [])

  const handleAddBlock = (type: string) => {
    const newBlock = {
      id: Math.random().toString(36).substring(7),
      type,
      title: 'New ' + type + ' Block',
      content: '',
    }
    setSteps([...steps, newBlock])
  }

  const handleUpdateBlock = (index: number, field: string, value: string) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  const handleDeleteBlock = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    setSteps(newSteps)
  }

  const handleSave = () => {
    setContent({ ...content, steps })
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const items = Array.from(steps)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    setSteps(items)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Smart Article Editor
            </h1>
            <p className="text-gray-500 mt-1">Editing: {activity.name}</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="steps">
            {(provided) => (
              <div
                className="space-y-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {steps.map((step, index) => (
                  <Draggable
                    key={step.id || `step-${index}`}
                    draggableId={step.id || `step-${index}`}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden group"
                      >
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded text-gray-400"
                          >
                            <GripVertical size={16} />
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            {step.label && (
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {step.label}
                              </span>
                            )}
                            <input
                              type="text"
                              value={step.title || ''}
                              onChange={(e) =>
                                handleUpdateBlock(
                                  index,
                                  'title',
                                  e.target.value
                                )
                              }
                              className="bg-transparent font-semibold text-gray-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                              placeholder="Block Title"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteBlock(index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {step.type === 'QUIZ' ? (
                          <QuizEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'CODE_EXERCISE' ? (
                          <CodeExerciseEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'CUSTOM_ANSWER' ? (
                          <CustomAnswerEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'learning_objectives' ? (
                          <LearningObjectivesEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'concept' ? (
                          <ConceptEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'real_world_examples' ? (
                          <RealWorldExamplesEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'summary' ? (
                          <SummaryEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'analogy' ? (
                          <AnalogyEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'EMBED' ? (
                          <EmbedEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : step.type === 'IMAGE' ? (
                          <ImageEditorBlock
                            step={step}
                            index={index}
                            handleUpdateBlock={handleUpdateBlock}
                          />
                        ) : (
                          <div className="p-4">
                            <textarea
                              value={step.content || step.text || ''}
                              onChange={(e) =>
                                handleUpdateBlock(
                                  index,
                                  'content',
                                  e.target.value
                                )
                              }
                              className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm"
                              placeholder="Enter content here..."
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="mt-8 border-2 border-dashed border-gray-200 rounded-xl p-8 bg-white/50">
          <div className="text-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Add new block
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Choose a block type to add to your article
            </p>
          </div>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => handleAddBlock('TEXT')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-500 hover:shadow-md transition-all text-gray-600 hover:text-blue-600 w-24"
            >
              <Type size={24} />
              <span className="text-xs font-semibold">Text</span>
            </button>
            <button
              onClick={() => handleAddBlock('IMAGE')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-500 hover:shadow-md transition-all text-gray-600 hover:text-blue-600 w-24"
            >
              <ImageIcon size={24} />
              <span className="text-xs font-semibold">Image</span>
            </button>
            <button
              onClick={() => handleAddBlock('CODE')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-500 hover:shadow-md transition-all text-gray-600 hover:text-blue-600 w-24"
            >
              <Code size={24} />
              <span className="text-xs font-semibold">Code</span>
            </button>
            <button
              onClick={() => handleAddBlock('EMBED')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-500 hover:shadow-md transition-all text-gray-600 hover:text-blue-600 w-24"
            >
              <LayoutTemplate size={24} />
              <span className="text-xs font-semibold">Embed</span>
            </button>
            <button
              onClick={() => handleAddBlock('QUIZ')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-500 hover:shadow-md transition-all text-gray-600 hover:text-indigo-600 w-24"
            >
              <HelpCircle size={24} />
              <span className="text-xs font-semibold">Quiz</span>
            </button>
            <button
              onClick={() => handleAddBlock('CUSTOM_ANSWER')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-500 hover:shadow-md transition-all text-gray-600 hover:text-indigo-600 w-24"
            >
              <MessageSquare size={24} />
              <span className="text-xs font-semibold">Response</span>
            </button>
            <button
              onClick={() => handleAddBlock('CODE_EXERCISE')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-500 hover:shadow-md transition-all text-gray-600 hover:text-indigo-600 w-24"
            >
              <TerminalSquare size={24} />
              <span className="text-xs font-semibold">Code Ex</span>
            </button>
            <button
              onClick={() => handleAddBlock('FILE_SUBMISSION')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-500 hover:shadow-md transition-all text-gray-600 hover:text-indigo-600 w-24"
            >
              <UploadCloud size={24} />
              <span className="text-xs font-semibold">File Sub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
