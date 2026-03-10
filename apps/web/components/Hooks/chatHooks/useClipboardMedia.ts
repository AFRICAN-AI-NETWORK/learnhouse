/**
 * Hook for managing clipboard media operations
 * Handles copying image blobs to clipboard with fallbacks
 */

import { useCallback } from 'react'

type ClipboardCopyFailureReason =
  | 'clipboard-write-unavailable'
  | 'clipboard-item-unavailable'
  | 'mime-unsupported'
  | 'write-failed'

type ClipboardCopyResult =
  | { ok: true }
  | { ok: false; reason: ClipboardCopyFailureReason }

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
}

const inferMimeType = (fileName?: string, preferredType?: string): string => {
  if (preferredType && preferredType !== 'application/octet-stream') {
    return preferredType
  }

  const extension = fileName?.split('.').pop()?.toLowerCase()
  if (extension && MIME_TYPE_BY_EXTENSION[extension]) {
    return MIME_TYPE_BY_EXTENSION[extension]
  }

  return preferredType || 'application/octet-stream'
}

/**
 * Convert image blob to PNG format for maximum compatibility
 */
const convertImageToPng = async (blob: Blob): Promise<Blob> => {
  // If already PNG, return as-is
  if (blob.type === 'image/png') {
    return blob
  }

  // Only convert image types
  if (!blob.type.startsWith('image/')) {
    return blob
  }

  try {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              resolve(blob)
              return
            }
            ctx.drawImage(img, 0, 0)
            canvas.toBlob((pngBlob) => {
              resolve(pngBlob || blob)
            }, 'image/png')
          }
          img.onerror = () => resolve(blob)
          img.src = event.target?.result as string
        } catch {
          resolve(blob)
        }
      }
      reader.onerror = () => resolve(blob)
      reader.readAsDataURL(blob)
    })
  } catch {
    return blob
  }
}

export const useClipboardMedia = () => {
  /**
   * Copy single image blob to clipboard
   * Converts to PNG for maximum compatibility
   */
  const copyImageBlob = useCallback(async (blob: Blob): Promise<boolean> => {
    try {
      if (!navigator.clipboard?.write) {
        return false
      }

      // Convert to PNG for better compatibility
      const pngBlob = await convertImageToPng(blob)

      // Write single image to clipboard
      const clipboardItem = new ClipboardItem({
        'image/png': pngBlob,
      })

      await navigator.clipboard.write([clipboardItem])
      return true
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to copy image blob:', error)
      return false
    }
  }, [])

  /**
   * Copy any attachment blob to clipboard using the best available MIME type.
   * Browser support for non-image binary clipboard formats varies, so callers
   * should still keep a text fallback.
   */
  const copyAttachmentBlob = useCallback(
    async ({
      blob,
      fileName,
      mimeType,
    }: {
      blob: Blob
      fileName?: string
      mimeType?: string
    }): Promise<ClipboardCopyResult> => {
      try {
        if (!navigator.clipboard?.write) {
          return { ok: false, reason: 'clipboard-write-unavailable' }
        }

        if (blob.type.startsWith('image/')) {
          return (await copyImageBlob(blob))
            ? { ok: true }
            : { ok: false, reason: 'write-failed' }
        }

        if (typeof ClipboardItem === 'undefined') {
          return { ok: false, reason: 'clipboard-item-unavailable' }
        }

        const clipboardType = inferMimeType(fileName, mimeType || blob.type)
        const normalizedBlob =
          blob.type === clipboardType
            ? blob
            : new Blob([blob], { type: clipboardType })

        if (
          'supports' in ClipboardItem &&
          typeof ClipboardItem.supports === 'function' &&
          !ClipboardItem.supports(clipboardType)
        ) {
          return { ok: false, reason: 'mime-unsupported' }
        }

        const clipboardItem = new ClipboardItem({
          [clipboardType]: normalizedBlob,
        })

        await navigator.clipboard.write([clipboardItem])
        return { ok: true }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to copy attachment blob:', error)
        return { ok: false, reason: 'write-failed' }
      }
    },
    [copyImageBlob]
  )

  /**
   * Copy text to clipboard
   */
  const copyText = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to copy text to clipboard:', error)
    }

    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  }, [])

  return {
    copyAttachmentBlob,
    copyImageBlob,
    copyText,
  }
}
