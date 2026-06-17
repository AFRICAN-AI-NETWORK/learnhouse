'use client'

import React, { useEffect, useState } from 'react'

export default function Countdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +targetDate - +new Date()
      let newTimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 }

      if (difference > 0) {
        newTimeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }
      setTimeLeft(newTimeLeft)
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div className="flex items-center gap-1.5 font-mono text-sm mt-1 text-white">
      <div className="bg-black/20 border border-white/10 rounded px-1.5 py-0.5 shadow-sm">
        {timeLeft.days}d
      </div>
      <span className="text-white/50">:</span>
      <div className="bg-black/20 border border-white/10 rounded px-1.5 py-0.5 shadow-sm">
        {timeLeft.hours.toString().padStart(2, '0')}h
      </div>
      <span className="text-white/50">:</span>
      <div className="bg-black/20 border border-white/10 rounded px-1.5 py-0.5 shadow-sm">
        {timeLeft.minutes.toString().padStart(2, '0')}m
      </div>
      <span className="text-white/50">:</span>
      <div className="bg-black/20 border border-white/10 rounded px-1.5 py-0.5 shadow-sm">
        {timeLeft.seconds.toString().padStart(2, '0')}s
      </div>
    </div>
  )
}
