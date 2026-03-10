/**
 * Attachment grid component
 * Displays attachments in chat messages
 */

import React from 'react'
import { Download, Play } from 'lucide-react'
import { Attachment } from '../../../../../types/chatTypes'
import { formatFileSize } from '../../../../Utils/chatUtils'

interface AttachmentGridProps {
  attachments: Attachment[]
  onDownload: (attachment: Attachment) => void
}

export const AttachmentGrid: React.FC<AttachmentGridProps> = ({
  attachments,
  onDownload,
}) => {
  if (!attachments || attachments.length === 0) return null

  const imageAttachments = attachments.filter((att) =>
    att.file_type.startsWith('image/')
  )
  const videoAttachments = attachments.filter((att) =>
    att.file_type.startsWith('video/')
  )
  const otherAttachments = attachments.filter(
    (att) =>
      !att.file_type.startsWith('image/') && !att.file_type.startsWith('video/')
  )

  return (
    <div className="space-y-3 mt-3">
      {/* Images */}
      {imageAttachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {imageAttachments.map((att) => (
            <button
              key={att.attachment_uuid}
              onClick={() => window.open(att.file_url, '_blank')}
              className="relative group rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.12] transition-colors"
            >
              <img
                src={att.thumbnail_url || att.file_url}
                alt={att.file_name}
                className="w-full h-[200px] object-cover group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Download size={20} className="text-white" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Videos */}
      {videoAttachments.length > 0 && (
        <div className="space-y-2">
          {videoAttachments.map((att) => (
            <button
              key={att.attachment_uuid}
              onClick={() => window.open(att.file_url, '_blank')}
              className="w-full relative group rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.12] transition-colors"
            >
              {att.thumbnail_url && (
                <img
                  src={att.thumbnail_url}
                  alt={att.file_name}
                  className="w-full h-[150px] object-cover group-hover:opacity-80 transition-opacity"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play size={32} className="text-white fill-white" />
              </div>
              <p className="text-xs text-white/60 p-2">{att.file_name}</p>
            </button>
          ))}
        </div>
      )}

      {/* Other files */}
      {otherAttachments.length > 0 && (
        <div className="space-y-2">
          {otherAttachments.map((att) => (
            <button
              key={att.attachment_uuid}
              onClick={() => onDownload(att)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-left"
            >
              <Download size={16} className="flex-shrink-0 text-white/60" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {att.file_name}
                </p>
                <p className="text-xs text-white/40">
                  {formatFileSize(att.file_size)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
