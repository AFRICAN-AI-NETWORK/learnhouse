import React, { useEffect, useRef } from 'react'
// @ts-ignore
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

interface VideoDetails {
  startTime?: number
  endTime?: number | null
  autoplay?: boolean
  muted?: boolean
}

interface LearnHousePlayerProps {
  src: string
  details?: VideoDetails
  onReady?: () => void
  onComplete?: () => void
  enforceLinearPlayback?: boolean
  isCompleted?: boolean
  activityId?: string
  onWatchSatisfied?: () => void
}

const LearnHousePlayer: React.FC<LearnHousePlayerProps> = ({
  src,
  details,
  onReady,
  onComplete,
  enforceLinearPlayback = false,
  isCompleted = false,
  activityId,
  onWatchSatisfied,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<Plyr | null>(null)
  const maxWatchedTimeRef = useRef(details?.startTime || 0)
  const hasCompletedRef = useRef(isCompleted)

  useEffect(() => {
    if (videoRef.current) {
      // Initialize Plyr
      playerRef.current = new Plyr(videoRef.current, {
        controls: enforceLinearPlayback
          ? [
              'play-large',
              'play',
              'progress',
              'current-time',
              'duration',
              'mute',
              'volume',
              'fullscreen',
            ]
          : [
              'play-large',
              'play',
              'progress',
              'current-time',
              'mute',
              'volume',
              'settings',
              'pip',
              'fullscreen',
            ],
        settings: enforceLinearPlayback ? [] : ['quality', 'speed', 'loop'],
        speed: {
          selected: 1,
          options: enforceLinearPlayback ? [1] : [0.5, 0.75, 1, 1.25, 1.5, 2],
        },
        tooltips: { controls: true, seek: !enforceLinearPlayback },
        keyboard: {
          focused: !enforceLinearPlayback,
          global: !enforceLinearPlayback,
        },
        seekTime: 10,
        volume: 1,
        muted: details?.muted ?? false,
        autoplay: details?.autoplay ?? false,
        disableContextMenu: true,
        hideControls: true,
        resetOnEnd: false,
        invertTime: false,
        ratio: '16:9',
        fullscreen: { enabled: true, iosNative: true },
      })

      // Set initial time if specified
      let startTime = details?.startTime || 0
      let maxWatched = startTime

      if (activityId && typeof window !== 'undefined') {
        const savedTime = localStorage.getItem(
          `learnhouse_video_${activityId}_currentTime`
        )
        const savedMaxWatched = localStorage.getItem(
          `learnhouse_video_${activityId}_maxWatched`
        )

        if (savedTime && !startTime) {
          startTime = parseFloat(savedTime)
        }
        if (savedMaxWatched) {
          maxWatched = Math.max(startTime, parseFloat(savedMaxWatched))
        }
      }

      if (startTime > 0) {
        playerRef.current.currentTime = startTime
      }
      maxWatchedTimeRef.current = maxWatched

      // Handle end time
      playerRef.current.on('timeupdate', () => {
        if (!playerRef.current || hasCompletedRef.current) return

        const currentTime = playerRef.current.currentTime
        const duration = playerRef.current.duration

        if (details?.endTime && currentTime >= details.endTime) {
          playerRef.current.pause()
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true
            onComplete?.()
          }
          return
        }

        // Trigger onComplete slightly before the exact end to handle browser inconsistencies
        if (
          duration > 0 &&
          currentTime >= duration - 0.5 &&
          !hasCompletedRef.current
        ) {
          hasCompletedRef.current = true
          onComplete?.()
        }

        // Trigger onWatchSatisfied for the fallback when 2 minutes are remaining
        // (or 80% completion for short videos)
        if (duration > 0) {
          const fallbackThreshold = Math.min(120, duration * 0.2)
          if (currentTime >= duration - fallbackThreshold) {
            onWatchSatisfied?.()
          }
        }

        // Only update max watched time if progressing naturally (not seeking forward)
        if (currentTime - maxWatchedTimeRef.current <= 1.5) {
          maxWatchedTimeRef.current = Math.max(
            maxWatchedTimeRef.current,
            currentTime
          )
        }

        // Save progress
        if (activityId && typeof window !== 'undefined') {
          localStorage.setItem(
            `learnhouse_video_${activityId}_currentTime`,
            currentTime.toString()
          )
          localStorage.setItem(
            `learnhouse_video_${activityId}_maxWatched`,
            maxWatchedTimeRef.current.toString()
          )
        }
      })

      playerRef.current.on('seeking', () => {
        if (
          !enforceLinearPlayback ||
          !playerRef.current ||
          hasCompletedRef.current
        )
          return

        const allowedTime = maxWatchedTimeRef.current + 1
        if (playerRef.current.currentTime > allowedTime) {
          playerRef.current.currentTime = maxWatchedTimeRef.current
        }
      })

      playerRef.current.on('ended', () => {
        if (hasCompletedRef.current) return

        hasCompletedRef.current = true
        onComplete?.()
      })

      // Call onReady if provided
      if (onReady) {
        playerRef.current.on('ready', onReady)
      }

      // Cleanup
      return () => {
        if (playerRef.current) {
          playerRef.current.destroy()
        }
      }
    }
  }, [
    details,
    enforceLinearPlayback,
    onComplete,
    onReady,
    activityId,
    isCompleted,
  ])

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden">
      <style jsx global>{`
        .plyr--video {
          --plyr-color-main: #ffffff;
          --plyr-video-background: #000000;
          --plyr-menu-background: #ffffff;
          --plyr-menu-color: #000000;
          --plyr-tooltip-background: #ffffff;
          --plyr-tooltip-color: #000000;
          --plyr-range-track-height: 4px;
          --plyr-range-thumb-height: 12px;
          --plyr-range-thumb-background: #ffffff;
          --plyr-range-fill-background: #ffffff;
          --plyr-control-icon-size: 18px;
          --plyr-control-spacing: 10px;
          --plyr-control-radius: 4px;
          --plyr-video-controls-background: linear-gradient(
            rgba(0, 0, 0, 0),
            rgba(0, 0, 0, 0.5)
          );
        }
        .plyr--full-ui input[type='range'] {
          color: #ffffff;
        }
        .plyr__control--overlaid {
          background: rgba(255, 255, 255, 0.9);
          border: 2px solid #000;
        }
        .plyr__control--overlaid svg {
          fill: #000 !important;
        }
        .plyr__control--overlaid:hover {
          background: rgba(255, 255, 255, 1);
        }
        .plyr__control.plyr__tab-focus,
        .plyr__control:hover,
        .plyr__control[aria-expanded='true'] {
          background: rgba(0, 0, 0, 0.1);
        }
        .plyr__menu__container {
          background: #ffffff;
          border: 1px solid #e5e5e5;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .plyr__menu__container > div {
          background: #ffffff;
        }
        .plyr__menu__container,
        .plyr__menu__container *,
        .plyr__menu__container button,
        .plyr__menu__container button:focus,
        .plyr__menu__container button:active,
        .plyr__menu__container button[aria-selected='true'] {
          color: #000 !important;
        }
        .plyr__menu__container button:hover {
          background: #f5f5f5;
          color: #000 !important;
        }
        .plyr__control svg {
          fill: #ffffff;
        }
        .plyr__control:hover svg {
          fill: #ffffff;
        }
        /* Settings (gear) icon: white by default, black on hover/open */
        .plyr__controls .plyr__control[data-plyr='settings'] svg {
          fill: #fff;
        }
        .plyr__controls .plyr__control[data-plyr='settings']:hover svg,
        .plyr__controls
          .plyr__control[data-plyr='settings'][aria-expanded='true']
          svg {
          fill: #000;
        }
        .plyr__time {
          color: #ffffff;
        }
        .plyr__progress__buffer {
          background: rgba(255, 255, 255, 0.3);
        }
        .plyr__volume--display {
          color: #ffffff;
        }
        .plyr__control[aria-expanded='true'] svg {
          fill: #000000;
        }
        .plyr__control[aria-expanded='true'] .plyr__tooltip {
          background: #ffffff;
          color: #000000;
        }
        .plyr__tooltip {
          background: #ffffff;
          color: #000000;
        }
        .plyr__tooltip::before {
          border-top-color: #ffffff;
        }
        /* Menu and settings icons */
        .plyr__menu__container .plyr__control svg,
        .plyr__menu__container button svg {
          fill: #000000;
        }
        .plyr__menu__container .plyr__control:hover svg,
        .plyr__menu__container button:hover svg {
          fill: #000000;
        }
        /* Settings button when menu is open */
        .plyr__control[aria-expanded='true'] svg {
          fill: #000000;
        }
        /* Settings button hover */
        .plyr__control[aria-expanded='true']:hover svg {
          fill: #000000;
        }
      `}</style>
      <video ref={videoRef} className="plyr-react plyr" playsInline controls>
        <source src={src} type="video/mp4" />
      </video>
    </div>
  )
}

export default LearnHousePlayer
