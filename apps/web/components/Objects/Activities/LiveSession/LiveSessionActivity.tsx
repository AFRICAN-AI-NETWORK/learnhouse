import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Loader2,
  MessageSquare,
  Radio,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import {
  registerForLiveSession,
  checkLiveRegistration,
  endLiveSession,
} from '@services/courses/live_sessions'
import { updateActivity } from '@services/courses/activities'
import toast from 'react-hot-toast'

interface LiveSessionActivityProps {
  activity: any
  course: any
  isFocusMode?: boolean
  onFocusModeChange?: (focusMode: boolean) => void
}

function LiveSessionActivity({
  activity,
  course,
  isFocusMode = false,
  onFocusModeChange,
}: LiveSessionActivityProps) {
  const session = useLHSession() as any
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<any>(null)
  const [status, setStatus] = useState<'UPCOMING' | 'LIVE' | 'ENDED'>(
    'UPCOMING'
  )
  const [isAdminEnteringEarly, setIsAdminEnteringEarly] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [hasLeft, setHasLeft] = useState(false)
  const [isConcludedManually, setIsConcludedManually] = useState(
    activity?.details?.is_concluded_manually || false
  )
  const [showFloatingButton, setShowFloatingButton] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const jitsiContainerRef = useRef<HTMLDivElement>(null)

  const details = activity?.details || {}
  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si'
  const roomName = details.jitsi_room || `aan-${activity.activity_uuid}`

  // Stable iframe src — never changes for the lifetime of this activity
  const jitsiSrc = useMemo(() => {
    const config = [
      'config.prejoinPageEnabled=false',
      'config.inactivityTimeout=3600',
      'config.disableDeepLinking=true',
      'config.disablePolls=true',
      'config.disableReactions=true',
      'config.disableInviteFunctions=true',
      'config.toolbarButtons=["microphone","camera","desktop","chat","raisehand","hangup","tileview","select-background","fullscreen"]',
    ]
    return `https://${jitsiDomain}/${encodeURIComponent(roomName)}#${config.join('&')}`
  }, [jitsiDomain, roomName])

  const isModerator = useMemo(() => {
    if (session.data?.user?.is_admin || session.data?.user?.is_instructor)
      return true
    const staffRoles = [
      'Admin',
      'Maintainer',
      'Instructors',
      'Teaching Assistant',
      'Students Success Coordinator',
      'Students Mentor',
      'Community Manager',
      'Lead Instructor',
    ]
    return session.data?.roles?.some(
      (r: any) =>
        staffRoles.includes(r.role?.name) && r.org?.id === activity?.org_id
    )
  }, [session.data, activity?.org_id])

  const canEndSession = useMemo(() => {
    if (session.data?.user?.is_admin) return true
    return session.data?.roles?.some(
      (r: any) => r.role?.name === 'Admin' && r.org?.id === activity?.org_id
    )
  }, [session.data, activity?.org_id])

  const startTime = useMemo(
    () => new Date(details.start_time),
    [details.start_time]
  )
  const endTime = useMemo(
    () => new Date(startTime.getTime() + (details.duration || 60) * 60000),
    [startTime, details.duration]
  )

  const shouldPrewarm =
    (isRegistered || isModerator) && !hasLeft && status !== 'ENDED'
  const shouldShowMeeting =
    shouldPrewarm && (status === 'LIVE' || isAdminEnteringEarly)

  useEffect(() => {
    if (!onFocusModeChange) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFocusModeChange(false)
    }
    const handleMouseMove = (e: MouseEvent) => {
      setShowFloatingButton(
        e.clientY < 80 || e.clientX > window.innerWidth * 0.85
      )
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [onFocusModeChange])

  useEffect(() => {
    if (!activity?.activity_uuid) return
    if (isModerator) {
      setIsRegistered(true)
      setLoading(false)
      return
    }
    checkLiveRegistration(activity.activity_uuid)
      .then((res) => setIsRegistered(res.registered))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activity?.activity_uuid, isModerator])

  useEffect(() => {
    const timer = setInterval(() => {
      if (isConcludedManually || activity?.details?.is_concluded_manually) {
        setStatus('ENDED')
        clearInterval(timer)
        if (!session.data?.user || session.data?.user?.is_waitlist) {
          const orgSlug = activity?.org_slug || 'aan'
          const query = new URLSearchParams({
            orgslug: orgSlug,
            email: session.data?.user?.email || '',
            first_name:
              session.data?.user?.first_name ||
              session.data?.user?.display_name?.split(' ')[0] ||
              '',
            last_name:
              session.data?.user?.last_name ||
              session.data?.user?.display_name?.split(' ').slice(1).join(' ') ||
              '',
          })
          window.location.href = `/auth/signup?${query.toString()}`
        }
        return
      }
      const now = new Date()
      if (now < startTime) {
        const diff = startTime.getTime() - now.getTime()
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        })
        setStatus('UPCOMING')
      } else if (now < endTime) {
        setStatus('LIVE')
      } else {
        setStatus('ENDED')
        clearInterval(timer)
        if (!session.data?.user || session.data?.user?.is_waitlist) {
          const orgSlug = activity?.org_slug || 'aan'
          const query = new URLSearchParams({
            orgslug: orgSlug,
            email: session.data?.user?.email || '',
            first_name:
              session.data?.user?.first_name ||
              session.data?.user?.display_name?.split(' ')[0] ||
              '',
            last_name:
              session.data?.user?.last_name ||
              session.data?.user?.display_name?.split(' ').slice(1).join(' ') ||
              '',
          })
          window.location.href = `/auth/signup?${query.toString()}`
        }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [
    startTime,
    endTime,
    isConcludedManually,
    activity?.details?.is_concluded_manually,
    session.data?.user,
    activity?.org_slug,
  ])

  const handleRegister = async () => {
    try {
      await registerForLiveSession(activity.activity_uuid)
      setIsRegistered(true)
      toast.success('Successfully registered!')
    } catch {
      toast.error('Registration failed')
    }
  }

  const handleEndSession = async () => {
    if (
      !window.confirm(
        '⚠️ CRITICAL ACTION: This will close the workshop for ALL students and save the recording to the archive.\n\nAre you absolutely sure?'
      )
    )
      return
    setIsEnding(true)
    try {
      await endLiveSession(activity.activity_uuid, session.data.access_token)
      setIsConcludedManually(true)
      setStatus('ENDED')
      toast.success('Workshop concluded and archived.')
    } catch {
      toast.error('Failed to conclude session')
    } finally {
      setIsEnding(false)
    }
  }

  const handleLeaveMeeting = () => {
    if (
      !window.confirm('Leave the room? (The session will continue for others)')
    )
      return
    setHasLeft(true)
    setIsAdminEnteringEarly(false)
  }

  const handleRejoin = () => setHasLeft(false)

  const handleCopyLink = () => {
    const uuid = activity.activity_uuid?.replace('activity_', '')
    navigator.clipboard.writeText(`${window.location.origin}/join/${uuid}`)
    toast.success('Invite link (Landing Page) copied!')
  }

  const handleSetFallbackRecording = async () => {
    const recordingUrl = window.prompt(
      'Enter the recording/replay URL (e.g. YouTube watch link):',
      activity?.details?.recording_url || ''
    )
    if (recordingUrl === null) return
    const loadingToast = toast.loading('Updating archive...')
    try {
      await updateActivity(
        { details: { ...activity.details, recording_url: recordingUrl } },
        activity.activity_uuid,
        session.data.access_token
      )
      toast.success('Archive updated! Please refresh to see changes.', {
        id: loadingToast,
      })
    } catch {
      toast.error('Failed to update archive', { id: loadingToast })
    }
  }

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-zinc-900" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-bold text-zinc-900 tracking-tight">
              Connecting you to the live session
            </p>
            <p className="text-sm text-zinc-400 font-medium">
              Setting up a secure connection&hellip;
            </p>
          </div>
        </motion.div>
      </div>
    )

  return (
    <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-8 overflow-y-auto">
      <link
        rel="preconnect"
        href={`https://${jitsiDomain}`}
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href={`https://${jitsiDomain}`} />

      <AnimatePresence mode="wait">
        {status === 'UPCOMING' && !isAdminEnteringEarly && (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="bg-white/70 backdrop-blur-xl border border-zinc-200 rounded-[40px] p-10 md:p-20 text-center shadow-2xl space-y-10 max-w-4xl mx-auto"
          >
            <div className="mx-auto w-20 h-20 bg-zinc-900 text-white rounded-[28px] flex items-center justify-center shadow-xl rotate-3">
              <Calendar size={32} />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tighter leading-tight">
                {activity.name}
              </h1>
              <div className="flex items-center justify-center gap-4 text-zinc-500 text-sm font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <Clock size={16} className="text-zinc-400" />{' '}
                  {startTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                <span>
                  {startTime.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-sm mx-auto">
              {['days', 'hours', 'minutes', 'seconds'].map((unit) => (
                <div key={unit} className="space-y-2">
                  <div className="bg-zinc-100/50 rounded-2xl p-4 border border-zinc-200/50 backdrop-blur-sm">
                    <div className="text-2xl font-black text-zinc-900 tabular-nums">
                      {timeLeft?.[unit] || 0}
                    </div>
                  </div>
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    {unit}
                  </div>
                </div>
              ))}
            </div>

            {!isRegistered ? (
              <button
                onClick={handleRegister}
                className="bg-zinc-900 text-white px-12 py-4 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-lg hover:shadow-zinc-200"
              >
                Register for Session
              </button>
            ) : (
              <div className="space-y-4">
                <div className="text-emerald-600 font-bold bg-emerald-50 py-3 px-6 rounded-xl inline-flex items-center gap-3 border border-emerald-100">
                  ✓ You are registered! Come back when it&apos;s time.
                  {/* Background load progress indicator */}
                  {!iframeLoaded ? (
                    <span className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                      <Loader2 size={12} className="animate-spin" />
                      Pre-loading session…
                    </span>
                  ) : (
                    <span className="text-emerald-500 text-xs font-bold">
                      ⚡ Session ready
                    </span>
                  )}
                </div>
                {isModerator && (
                  <div className="block pt-4">
                    <button
                      onClick={() => setIsAdminEnteringEarly(true)}
                      className="text-zinc-500 hover:text-zinc-900 font-bold text-sm underline underline-offset-4"
                    >
                      Enter Early (Staff Only)
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {(status === 'LIVE' || isAdminEnteringEarly) && !hasLeft && (
          <motion.div
            key="live"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`grid grid-cols-1 lg:grid-cols-4 gap-6 ${
              isFocusMode ? 'h-[90vh]' : 'h-[65vh]'
            }`}
          >
            {onFocusModeChange && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: showFloatingButton ? 1 : 0.3, scale: 1 }}
                whileHover={{ scale: 1.1, opacity: 1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => onFocusModeChange(!isFocusMode)}
                className="fixed top-6 right-6 z-70 p-3 rounded-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 text-white shadow-2xl hover:bg-zinc-800 transition-all flex items-center justify-center group"
                title={
                  isFocusMode ? 'Exit Focus Mode (ESC)' : 'Enter Focus Mode'
                }
              >
                {isFocusMode ? (
                  <Minimize2 size={20} />
                ) : (
                  <Maximize2 size={20} />
                )}
                <span className="absolute -bottom-8 right-0 bg-zinc-900 text-white text-[9px] font-bold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {isFocusMode ? 'Exit (ESC)' : 'Enter'}
                </span>
              </motion.button>
            )}
            <div className="lg:col-span-3 bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl relative border-4 border-zinc-100 min-h-[500px]">
              {/* Dedicated container for Jitsi iframe, untouched by React's conditionally rendered children */}
              <div
                ref={jitsiContainerRef}
                className="absolute inset-0 w-full h-full z-10 bg-zinc-900 flex items-center justify-center"
              />

              {!isRegistered && (
                <div className="absolute inset-0 bg-zinc-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-12 z-20">
                  <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Registration Required
                  </h2>
                  <p className="text-zinc-400 mb-8 max-w-sm">
                    You must register to gain access to the secure stream.
                  </p>
                  <button
                    onClick={handleRegister}
                    className="bg-white text-black px-10 py-3 rounded-2xl font-bold hover:bg-zinc-100 transition-colors shadow-xl"
                  >
                    Register to Join
                  </button>
                </div>
              )}

              {/* Rare: only shown if iframe hasn't loaded yet when going live */}
              {isRegistered && !iframeLoaded && !hasLeft && (
                <div className="absolute inset-0 z-10 bg-zinc-900 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={32} className="animate-spin text-white" />
                  <p className="text-sm font-bold text-zinc-400">
                    Loading live session…
                  </p>
                </div>
              )}

              <div className="w-full h-full min-h-[300px]" />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 border border-zinc-200 rounded-3xl bg-white overflow-hidden flex flex-col shadow-lg">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-bold text-xs tracking-tight flex items-center gap-2 text-zinc-700">
                  <MessageSquare size={14} className="text-zinc-400" />{' '}
                  Interaction Hub
                </h3>
                <div className="flex items-center gap-1.5 text-red-500 bg-red-50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border border-red-100">
                  <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />{' '}
                  Live
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {isModerator && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-4">
                      <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert size={12} className="text-zinc-500" />{' '}
                        Moderator Tools
                      </h4>
                      <div className="space-y-2">
                        <button
                          onClick={handleLeaveMeeting}
                          className="w-full bg-white border border-zinc-200 text-zinc-900 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-50 transition-colors shadow-sm"
                        >
                          Leave Meeting Room
                        </button>
                        {canEndSession && (
                          <button
                            onClick={handleEndSession}
                            disabled={isEnding}
                            className="w-full bg-red-600 text-white py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                          >
                            {isEnding
                              ? 'Archiving...'
                              : 'End & Archive for All'}
                          </button>
                        )}
                        <button
                          onClick={handleCopyLink}
                          className="w-full bg-zinc-900 text-white py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={12} /> Copy Invite Link
                        </button>
                        {status === 'LIVE' && (
                          <button
                            onClick={handleSetFallbackRecording}
                            className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-colors shadow-sm flex items-center justify-center gap-2"
                          >
                            <HelpCircle size={12} /> Manual Replay Setup
                          </button>
                        )}
                      </div>
                      {!canEndSession && (
                        <p className="text-[8px] text-zinc-400 font-medium leading-relaxed italic">
                          Only Admins can end the session for everyone.
                        </p>
                      )}
                    </div>
                  )}

                  {details.recording_url && (
                    <div className="bg-zinc-900 rounded-2xl p-4 text-white space-y-3 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <HelpCircle size={40} />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Radio size={12} className="text-emerald-400" />{' '}
                        Auto-Replay Active
                      </h4>
                      <p className="text-[9px] text-zinc-400 font-medium leading-relaxed">
                        You linked a YouTube Live stream. To ensure the replay
                        is available:
                      </p>
                      <ul className="text-[9px] text-zinc-300 space-y-2 font-bold">
                        <li className="flex gap-2">
                          <span className="text-zinc-500">1.</span>
                          <span>Start session in Jitsi</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-zinc-500">2.</span>
                          <span>
                            Go to{' '}
                            <span className="text-white">
                              ... More → Live Stream
                            </span>
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-zinc-500">3.</span>
                          <span>Paste your Stream Key</span>
                        </li>
                      </ul>
                      <a
                        href={details.recording_url}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-widest pt-1 hover:text-emerald-300 transition-colors"
                      >
                        Open Stream <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-zinc-50 bg-zinc-50/30">
                <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em] text-center">
                  Protected by AAN Security
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {hasLeft && status !== 'ENDED' && (
          <motion.div
            key="left"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-50 border border-zinc-200 rounded-3xl p-20 text-center max-w-3xl mx-auto"
          >
            <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Radio size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
              You have left the meeting
            </h2>
            <p className="text-zinc-500 mt-2 mb-8">
              The session is still running for other participants.
            </p>
            <button
              onClick={handleRejoin}
              className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
            >
              Rejoin Session
            </button>
          </motion.div>
        )}

        {status === 'ENDED' && (
          <motion.div
            key="ended"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-5xl mx-auto"
          >
            {details.recording_url ? (
              <div className="space-y-6">
                <div className="aspect-video bg-black rounded-[40px] overflow-hidden shadow-2xl border-4 border-zinc-100 relative">
                  <iframe
                    src={
                      details.recording_url.includes('live/')
                        ? details.recording_url.replace('live/', 'embed/')
                        : details.recording_url.includes('watch?v=')
                          ? details.recording_url.replace('watch?v=', 'embed/')
                          : details.recording_url
                    }
                    className="w-full h-full"
                    allowFullScreen
                  />
                  <div className="absolute top-6 left-6 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      Replay Available
                    </span>
                  </div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                      {activity.name} • Replay
                    </h2>
                    <p className="text-zinc-500 font-medium text-sm">
                      Recorded on {startTime.toLocaleDateString()}. Watch at
                      your own pace.
                    </p>
                  </div>
                  {(!session.data?.user || session.data?.user?.is_waitlist) && (
                    <button
                      onClick={() =>
                        (window.location.href = `/auth/signup?email=${session.data?.user?.email || ''}`)
                      }
                      className="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                    >
                      Enroll for full course
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-20 text-center">
                <div className="w-20 h-20 bg-zinc-100 text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Radio size={40} />
                </div>
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
                  Session Concluded
                </h2>
                <p className="text-zinc-500 max-w-md mx-auto mt-2">
                  This live event has ended. If a recording was made, it will
                  appear here as a "Replay" activity soon.
                </p>
                {isModerator && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={handleSetFallbackRecording}
                      className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl flex items-center gap-2"
                    >
                      <ExternalLink size={14} /> Set/Edit Replay URL
                    </button>
                  </div>
                )}
                <div className="mt-10 space-y-4">
                  {(!session.data?.user || session.data?.user?.is_waitlist) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-zinc-900 text-white p-8 rounded-[32px] max-w-lg mx-auto shadow-2xl space-y-6"
                    >
                      <h3 className="text-xl font-bold tracking-tight">
                        Enjoyed the workshop?
                      </h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        Unlock the full course curriculum, mentors, and
                        certification.
                      </p>
                      <button
                        onClick={() =>
                          (window.location.href = `/auth/signup?email=${session.data?.user?.email || ''}`)
                        }
                        className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-100 transition-all"
                      >
                        Finish Registration &amp; Enroll
                      </button>
                    </motion.div>
                  )}
                  <button
                    onClick={() => window.history.back()}
                    className="text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest block mx-auto"
                  >
                    Return to Course Hub
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LiveSessionActivity
