'use client'

import React, { useMemo } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  getMyCourseJourney,
  StudentMilestoneStatus,
} from '@services/student-journey/student-journey'
import { Award, Check, Circle, Flag, Rocket } from 'lucide-react'
import useSWR from 'swr'

const phaseOrder = ['onboarding', 'core_learning', 'capstone', 'alumni']
const phaseLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  core_learning: 'Learning',
  capstone: 'Capstone',
  alumni: 'Graduation',
}

function CourseJourneyPanel({ courseUuid }: { courseUuid: string }) {
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const { data: milestones = [], error } = useSWR(
    courseUuid ? ['my-course-journey', courseUuid] : null,
    () => getMyCourseJourney(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const currentMilestone = useMemo(
    () =>
      milestones.find((item) =>
        ['in_progress', 'at_risk', 'not_started'].includes(item.status)
      ) || milestones[milestones.length - 1],
    [milestones]
  )

  if (error || milestones.length === 0) return null

  const achievedCount = milestones.filter(
    (item) => item.status === 'achieved'
  ).length

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-xl font-bold text-gray-950">Your journey</h2>
          <p className="mt-1 text-sm text-gray-500">
            {achievedCount}/{milestones.length} milestones achieved
          </p>
        </div>
        <CurrentStatus milestone={currentMilestone} />
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {phaseOrder.map((phase, index) => (
            <PhaseStep
              key={phase}
              phase={phase}
              index={index}
              milestones={milestones.filter((item) => item.phase === phase)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function CurrentStatus({ milestone }: { milestone?: StudentMilestoneStatus }) {
  if (!milestone) return null
  const achieved = milestone.status === 'achieved'
  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm ${
        achieved
          ? 'bg-emerald-50 text-emerald-700'
          : milestone.status === 'at_risk'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-blue-50 text-blue-700'
      }`}
    >
      <p className="text-xs font-bold uppercase">
        {achieved ? 'Achieved' : 'Pending'}
      </p>
      <p className="font-bold">{milestone.name}</p>
    </div>
  )
}

function PhaseStep({
  phase,
  index,
  milestones,
}: {
  phase: string
  index: number
  milestones: StudentMilestoneStatus[]
}) {
  const allAchieved =
    milestones.length > 0 &&
    milestones.every((item) => item.status === 'achieved')
  const current = milestones.some((item) =>
    ['in_progress', 'at_risk'].includes(item.status)
  )
  const Icon =
    index === 0 ? Rocket : index === 1 ? Flag : index === 2 ? Award : Check

  return (
    <div
      className={`rounded-lg border p-4 ${
        allAchieved
          ? 'border-emerald-200 bg-emerald-50'
          : current
            ? 'border-blue-200 bg-blue-50'
            : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            allAchieved
              ? 'bg-emerald-600 text-white'
              : current
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-500'
          }`}
        >
          <Icon size={16} />
        </div>
        <p className="font-bold text-gray-950">{phaseLabels[phase]}</p>
      </div>
      <div className="space-y-2">
        {milestones.map((milestone) => (
          <div
            key={milestone.milestone_uuid}
            className="flex items-center gap-2 text-sm"
          >
            {milestone.status === 'achieved' ? (
              <Check size={15} className="shrink-0 text-emerald-600" />
            ) : (
              <Circle size={15} className="shrink-0 text-gray-300" />
            )}
            <span className="min-w-0 truncate text-gray-700">
              {milestone.name}
            </span>
          </div>
        ))}
        {milestones.length === 0 && (
          <p className="text-sm text-gray-400">No milestone</p>
        )}
      </div>
    </div>
  )
}

export default CourseJourneyPanel
