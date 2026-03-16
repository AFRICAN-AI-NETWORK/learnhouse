/**
 * Message actions dropdown menu
 * Provides copy, edit, delete, reply actions for messages
 */
import React from 'react'
import { ChevronDown, Reply, Copy, Pencil, Trash2 } from 'lucide-react'
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
    <DropdownMenu modal={true}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="absolute top-1.5 right-1.5 flex items-center justify-center text-white/50 hover:text-white/90 bg-transparent border-0 p-0 cursor-pointer"
          aria-label="Message actions"
        >
          <ChevronDown size={20} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isMine ? 'end' : 'start'}
        className="w-40 p-1.5 bg-[#1a1a22] border border-white/8 shadow-xl relative"
        onCloseAutoFocus={(event) => event.preventDefault()}
        style={{
          clipPath:
            'polygon(0 8px, calc(100% - 8px) 8px, 100% 8px, 100% 100%, 0 100%)',
        }}
      >
        {!isDeleted && (
          <DropdownMenuItem
            className="text-white/80 hover:text-white hover:bg-gray-600/30 cursor-pointer"
            onClick={onReply}
          >
            <Reply size={14} />
            <span className="text-xs">{t('chat.reply')}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-white/80 hover:text-white hover:bg-gray-600/30 cursor-pointer"
          onClick={onCopy}
        >
          <Copy size={14} />
          <span className="text-xs">{t('common.copy')}</span>
        </DropdownMenuItem>
        {isMine && !isDeleted && onEdit && (
          <DropdownMenuItem
            className="text-white/80 hover:text-white hover:bg-gray-600/30 cursor-pointer"
            onClick={onEdit}
          >
            <Pencil size={14} />
            <span className="text-xs">{t('common.edit')}</span>
          </DropdownMenuItem>
        )}
        {!isDeleted && onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-gray-600/30 cursor-pointer"
          >
            <Trash2 size={14} />
            <span className="text-xs">{t('common.delete')}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
