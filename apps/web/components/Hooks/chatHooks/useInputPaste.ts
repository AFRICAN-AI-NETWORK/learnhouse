/**
 * Hook for handling paste events in chat input
 * Automatically adds pasted files to the chat
 */

import { useCallback } from 'react'
import { SUPPORTED_CHAT_EXTENSIONS } from '../../../types/chatTypes'

interface UseInputPasteProps {
  onFilesAdded: (files: File[]) => void
}

export const useInputPaste = ({ onFilesAdded }: UseInputPasteProps) => {
  /**
   * Handle paste event on input field
   * Extracts files from clipboard and adds them
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const clipboardItems = e.clipboardData?.items

      if (!clipboardItems || clipboardItems.length === 0) return

      const filesToAdd: File[] = []

      // Process all clipboard items
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i]

        // Handle file items (images, documents, etc.)
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            // Check if file type is supported
            const ext = `.${file.name.split('.').pop()?.toLowerCase()}`
            if (SUPPORTED_CHAT_EXTENSIONS.includes(ext)) {
              filesToAdd.push(file)
              // Prevent default paste behavior when we handle files
              e.preventDefault()
            }
          }
        }
      }

      // Call callback with all files
      if (filesToAdd.length > 0) {
        onFilesAdded(filesToAdd)
      }
    },
    [onFilesAdded]
  )

  return {
    handlePaste,
  }
}
