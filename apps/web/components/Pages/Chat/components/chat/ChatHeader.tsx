/**
 * Chat header component
 * Displays conversation info and online status
 */

import React from 'react'
import { getUserAvatarMediaDirectory } from '@services/media/media'
import { ParticipantUser } from '../../../../../types/chatTypes'
import { getDisplayName } from '../../../../Utils/chatUtils'

interface ChatHeaderProps {
  participant: ParticipantUser
  isConnected: boolean
  showBackButton?: boolean
  onBack?: () => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  participant,
  isConnected,
  showBackButton = false,
  onBack,
}) => {
  const displayName = getDisplayName(participant)

  return (
    <div className="flex-shrink-0 px-5 py-3.5 border-b border-white/[0.06] bg-[#13131a] flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex-shrink-0 -ml-1 p-1 text-indigo-400 hover:text-indigo-300 transition-colors"
            aria-label="Back to conversations"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <div className="relative">
          <img
            src={
              participant.avatar_image
                ? getUserAvatarMediaDirectory(
                    participant.user_uuid,
                    participant.avatar_image
                  )
                : '/empty_avatar.png'
            }
            alt={participant.username}
            className="w-9 h-9 rounded-full ring-2 ring-white/[0.06] object-cover"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#13131a]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white leading-tight">
            {displayName}
          </h2>
          <p className="text-xs text-white/35 leading-tight mt-0.5">
            @{participant.username}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-white/20'}`}
        />
        <span className="text-xs text-white/25">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
    </div>
  )
}
