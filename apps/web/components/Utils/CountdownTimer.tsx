'use client'
import React, { useState, useEffect } from 'react'

interface CountdownTimerProps {
  launchDate?: string | Date
  displayFormat?: 'compact' | 'detailed'
}

function CountdownTimer({
  launchDate,
  displayFormat = 'compact',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  const [isLaunched, setIsLaunched] = useState(false)

  useEffect(() => {
    if (!launchDate) return

    const calculateTimeLeft = () => {
      const now = new Date()
      const launch = new Date(launchDate)
      const difference = launch.getTime() - now.getTime()

      if (difference <= 0) {
        setIsLaunched(true)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      } else {
        setIsLaunched(false)
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [launchDate])

  if (isLaunched) {
    return (
      <div className="text-center">
        <span className="text-2xl font-bold text-emerald-600">
          🎉 Launching now!
        </span>
      </div>
    )
  }

  if (displayFormat === 'compact') {
    return (
      <div className="text-center">
        <p className="text-5xl font-bold text-black mb-2 font-mono tracking-tight">
          {String(timeLeft.days).padStart(2, '0')}
          <span className="text-slate-400">:</span>
          {String(timeLeft.hours).padStart(2, '0')}
          <span className="text-slate-400">:</span>
          {String(timeLeft.minutes).padStart(2, '0')}
          <span className="text-slate-400">:</span>
          {String(timeLeft.seconds).padStart(2, '0')}
        </p>
        <p className="text-sm text-slate-500">
          Days · Hours · Minutes · Seconds
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-3 text-center">
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-3xl font-bold text-black mb-1">
          {String(timeLeft.days).padStart(2, '0')}
        </p>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
          Days
        </p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-3xl font-bold text-black mb-1">
          {String(timeLeft.hours).padStart(2, '0')}
        </p>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
          Hours
        </p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-3xl font-bold text-black mb-1">
          {String(timeLeft.minutes).padStart(2, '0')}
        </p>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
          Minutes
        </p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <p className="text-3xl font-bold text-black mb-1">
          {String(timeLeft.seconds).padStart(2, '0')}
        </p>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
          Seconds
        </p>
      </div>
    </div>
  )
}

export default CountdownTimer
