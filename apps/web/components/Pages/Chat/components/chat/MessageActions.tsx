/**
 * Message actions dropdown menu
 * Provides copy, edit, delete, reply actions for messages
 */

import React from 'react'
import { MoreHorizontal, Reply, Copy, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { Message } from '../../../../../types/chatTypes'

interface MessageActionsProps {
  message: Message
  isMine: boolean
  onCopy: () => void
  onEdit?: () => void
  onReply: () => void
  onDelete?: () => void
  t: (key: string) => string
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  isMine,
  onCopy,
  onEdit,
  onReply,
  onDelete,
  t,
}) => {
  const isDeleted = message.is_deleted || message.isPending

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-md border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/60"
          aria-label="Message actions"
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isMine ? 'end' : 'start'} className="w-40">
        {!isMine && !isDeleted && (
          <DropdownMenuItem onClick={onReply}>
            <Reply size={14} />
            {t('chat.reply')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onCopy}>
          <Copy size={14} />
          {t('common.copy')}
        </DropdownMenuItem>
        {isMine && !isDeleted && onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil size={14} />
            {t('common.edit')}
          </DropdownMenuItem>
        )}
        {!isDeleted && onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 size={14} />
            {t('common.delete')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
