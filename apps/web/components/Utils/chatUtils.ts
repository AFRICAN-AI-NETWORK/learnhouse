/**
 * Utility functions for chat system
 */

import { File, Image as ImageIcon, Video, FileText } from 'lucide-react'

/**
 * Get the appropriate icon component for a file type
 */
export const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return ImageIcon
  if (fileType.startsWith('video/')) return Video
  if (
    fileType.includes('pdf') ||
    fileType.includes('document') ||
    fileType.includes('officedocument') ||
    fileType.includes('word')
  )
    return FileText
  return File
}

/**
 * Format file size to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Check if a file is an image based on MIME type
 */
export const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/')
}

/**
 * Check if a file is a video based on MIME type
 */
export const isVideoFile = (fileType: string): boolean => {
  return fileType.startsWith('video/')
}

/**
 * Check if a file is a document based on MIME type
 */
export const isDocumentFile = (fileType: string): boolean => {
  return (
    fileType.includes('pdf') ||
    fileType.includes('document') ||
    fileType.includes('officedocument') ||
    fileType.includes('word') ||
    fileType.includes('spreadsheet')
  )
}

/**
 * Get display name from participant
 */
export const getDisplayName = (participant: {
  first_name?: string
  last_name?: string
  username: string
}): string => {
  if (participant.first_name) {
    return `${participant.first_name}${participant.last_name ? ' ' + participant.last_name : ''}`
  }
  return participant.username
}

/**
 * Validate file extension against allowed extensions
 */
export const isFileExtensionAllowed = (
  fileName: string,
  allowedExtensions: string[]
): boolean => {
  const ext = `.${fileName.split('.').pop()?.toLowerCase()}`
  return allowedExtensions.includes(ext)
}

/**
 * Extract file extension from filename
 */
export const getFileExtension = (fileName: string): string => {
  return `.${fileName.split('.').pop()?.toLowerCase() || ''}`
}

/**
 * Check if message has attachments
 */
export const hasAttachments = (message: { attachments: any[] }): boolean => {
  return Array.isArray(message.attachments) && message.attachments.length > 0
}

/**
 * Check if message has images
 */
export const hasImages = (message: { attachments: any[] }): boolean => {
  return (
    hasAttachments(message) &&
    message.attachments.some((att) => att.file_type?.startsWith('image/'))
  )
}

/**
 * Get first image from message attachments
 */
export const getFirstImage = (message: { attachments: any[] }) => {
  if (!hasAttachments(message)) return null
  return message.attachments.find((att) => att.file_type?.startsWith('image/'))
}
