/**
 * Hook for managing clipboard media operations
 * Handles copying image blobs to clipboard with fallbacks
 */

import { useCallback } from 'react'

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
      console.warn('Failed to copy image blob:', error)
      return false
    }
  }, [])

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
    copyImageBlob,
    copyText,
  }
}
