/**
 * Chat input component
 * Message input field with file upload and paste support
 */

import React, { useRef } from 'react'
import { Send, Loader2, Paperclip, X } from 'lucide-react'
import { CHAT_FILE_ACCEPT } from '../../../../../types/chatTypes'
import { FilePreview } from './FilePreview'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onFilesSelected: (files: File[]) => void
  onFileRemove: (index: number) => void
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
  isLoading: boolean
  disabled: boolean
  selectedFiles: File[]
  error?: string | null
  replyingTo?: { content: string; sender: string } | null
  onCancelReply?: () => void
  messageInputRef?: React.RefObject<HTMLInputElement>
  fileInputRef?: React.RefObject<HTMLInputElement>
  t: (key: string) => string
  onTyping?: () => void
  onTypingStop?: () => void
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  onFilesSelected,
  onFileRemove,
  onPaste,
  isLoading,
  disabled,
  selectedFiles,
  error,
  replyingTo,
  onCancelReply,
  messageInputRef,
  fileInputRef,
  t,
  onTyping,
  onTypingStop,
}) => {
  const localFileInputRef = useRef<HTMLInputElement>(null)
  const fileRef = fileInputRef || localFileInputRef

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files) {
      onFilesSelected(Array.from(files))
    }
    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  return (
    <div className="px-4 py-4 border-t border-white/6 bg-[#0f0f13] space-y-3">
      {/* Error message */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <div className="shrink-0 w-4 h-4 rounded-full bg-red-500 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Reply indicator */}
      {replyingTo && onCancelReply && (
        <div className="px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-300/90 mb-1">
              Replying to {replyingTo.sender}
            </p>
            <p className="text-xs text-white/70 line-clamp-1">
              {replyingTo.content}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 text-white/60 hover:text-white/90 p-1"
            aria-label="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Selected files preview */}
      <FilePreview files={selectedFiles} onRemove={onFileRemove} />

      {/* Input form */}
      <form onSubmit={onSubmit} className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={CHAT_FILE_ACCEPT}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isLoading || disabled}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/60 hover:text-white/80 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <div className="flex-1 relative">
          <input
            ref={messageInputRef}
            type="text"
            placeholder={t('chat.type_message')}
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              onTyping?.()
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit(e as any)
                onTypingStop?.()
              }
            }}
            onBlur={onTypingStop}
            onPaste={onPaste}
            disabled={disabled}
            className="w-full bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 focus:bg-white/7 transition-all duration-200 disabled:opacity-40 pr-12"
          />
        </div>
        <button
          type="submit"
          disabled={
            isLoading ||
            disabled ||
            (!value.trim() && selectedFiles.length === 0)
          }
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  )
}
