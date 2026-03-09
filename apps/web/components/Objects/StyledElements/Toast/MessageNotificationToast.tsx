'use client'

interface MessageNotificationToastProps {
  senderName: string
  messagePreview: string
  onClick?: () => void
  onClose?: () => void
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function MessageNotificationToast({
  senderName,
  messagePreview,
  onClick,
  onClose,
}: MessageNotificationToastProps) {
  const initials = getInitials(senderName)

  return (
    <div
      onClick={onClick}
      className={`w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-white/10 bg-gradient-to-br from-[#181a26] to-[#12131c] text-white shadow-xl shadow-black/35 backdrop-blur-md ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-300/30 bg-indigo-500/25 text-[11px] font-semibold tracking-wide text-indigo-200">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-200/65">
            New Message
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white/95">
            {senderName}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/70">
            {messagePreview}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose?.()
          }}
          className="rounded-md p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default MessageNotificationToast
