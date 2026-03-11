/**
 * Hook for managing file upload and selection
 * Handles file validation and selection
 */

import { useState, useCallback } from 'react'
import { SUPPORTED_CHAT_EXTENSIONS } from '../../../types/chatTypes'

export const useFileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  const addFiles = useCallback((files: File[]) => {
    const supportedFiles = files.filter((file) => {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`
      return SUPPORTED_CHAT_EXTENSIONS.includes(ext)
    })

    const rejectedFiles = files.filter((file) => {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`
      return !SUPPORTED_CHAT_EXTENSIONS.includes(ext)
    })

    if (supportedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...supportedFiles])
      setError(null)
    }

    if (rejectedFiles.length > 0) {
      const rejectedNames = rejectedFiles.map((file) => file.name).join(', ')
      setError(
        `Unsupported file type: ${rejectedNames}. Allowed: ${SUPPORTED_CHAT_EXTENSIONS.join(', ')}`
      )
    }

    return {
      accepted: supportedFiles,
      rejected: rejectedFiles,
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearFiles = useCallback(() => {
    setSelectedFiles([])
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    selectedFiles,
    error,
    addFiles,
    removeFile,
    clearFiles,
    clearError,
    hasFiles: selectedFiles.length > 0,
  }
}
