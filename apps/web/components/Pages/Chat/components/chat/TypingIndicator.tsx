/**
 * Typing indicator component
 * Shows when other user is typing
 */

import React from 'react'

interface TypingIndicatorProps {
  isVisible: boolean
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
}) => {
  if (!isVisible) return null

  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="flex gap-1.5 px-4 py-2.5 rounded-2xl bg-white/[0.07] border border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce" />
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce animation-delay-100" />
        <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce animation-delay-200" />
      </div>
    </div>
  )
}
