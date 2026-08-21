/**
 * File preview component
 * Shows selected files before sending
 */

import React from 'react'
import { X } from 'lucide-react'
import { getFileIcon, formatFileSize } from '../../../../Utils/chatUtils'
import NextImage from 'next/image'

interface FilePreviewProps {
  files: File[]
  onRemove: (index: number) => void
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  files,
  onRemove,
}) => {
  if (files.length === 0) return null

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {files.map((file, index) => {
        const IconComponent = getFileIcon(file.type)
        const isImage = file.type.startsWith('image/')

        return (
          <div key={index} className="relative group max-w-[200px]">
            {isImage ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5 border border-white/8">
                <NextImage
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  width={800}
                  height={800}
                />
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                  aria-label="Remove file"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8 group-hover:bg-white/8 transition-colors">
                <IconComponent size={16} className="shrink-0 text-white/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="shrink-0 text-white/40 hover:text-white/80 transition-colors"
                  aria-label="Remove file"
                >
                  <X size={12} className="text-white/60" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
