'use client'
import { getAPIUrl } from '@services/config/config'
import { updateCourseOrderStructure } from '@services/courses/chapters'
import { revalidateTags } from '@services/utils/ts/requests'
import {
  useCourse,
  useCourseDispatch,
} from '@components/Contexts/CourseContext'
import { Check, SaveAllIcon, Timer, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { mutate } from 'swr'
import { updateCourse } from '@services/courses/courses'
import { updateCertification } from '@services/courses/certifications'
import { useLHSession } from '@components/Contexts/LHSessionContext'

function SaveState(props: { orgslug: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const course = useCourse() as any
  const session = useLHSession() as any
  const router = useRouter()
  const saved = course ? course.isSaved : true
  const dispatchCourse = useCourseDispatch() as any
  const course_structure = course.courseStructure
  const withUnpublishedActivities = course
    ? course.withUnpublishedActivities
    : false
  const saveCourseState = async () => {
    if (saved || isLoading) return
    setIsLoading(true)
    try {
      // Course  order
      await changeOrderBackend()
      mutate(
        `${getAPIUrl()}courses/${course.courseStructure.course_uuid}/meta?with_unpublished_activities=${withUnpublishedActivities}`
      )
      // Course metadata
      await changeMetadataBackend()
      mutate(
        `${getAPIUrl()}courses/${course.courseStructure.course_uuid}/meta?with_unpublished_activities=${withUnpublishedActivities}`
      )
      // Certification data (if present)
      await saveCertificationData()
      await revalidateTags(['courses'], props.orgslug)
      dispatchCourse({ type: 'setIsSaved' })
    } finally {
      setIsLoading(false)
    }
  }

  //
  // Course Order
  const changeOrderBackend = async () => {
    mutate(
      `${getAPIUrl()}courses/${course.courseStructure.course_uuid}/meta?with_unpublished_activities=${withUnpublishedActivities}`
    )
    await updateCourseOrderStructure(
      course.courseStructure.course_uuid,
      course.courseOrder,
      session.data?.tokens?.access_token
    )
    await revalidateTags(['courses'], props.orgslug)
    router.refresh()
    dispatchCourse({ type: 'setIsSaved' })
  }

  // Course metadata
  const changeMetadataBackend = async () => {
    mutate(
      `${getAPIUrl()}courses/${course.courseStructure.course_uuid}/meta?with_unpublished_activities=${withUnpublishedActivities}`
    )
    await updateCourse(
      course.courseStructure.course_uuid,
      course.courseStructure,
      session.data?.tokens?.access_token
    )
    await revalidateTags(['courses'], props.orgslug)
    router.refresh()
    dispatchCourse({ type: 'setIsSaved' })
  }

  // Certification data
  const saveCertificationData = async () => {
    if (course.courseStructure._certificationData) {
      const certData = course.courseStructure._certificationData
      try {
        await updateCertification(
          certData.certification_uuid,
          certData.config,
          session.data?.tokens?.access_token
        )
        // Refresh certification data in SWR cache with the new data to prevent UI revert
        mutate(
          `certifications/course/${course.courseStructure.course_uuid}`,
          {
            success: true,
            data: [
              {
                ...certData,
              },
            ],
            status: 200,
            HTTPmessage: 'OK',
          },
          false
        )
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to save certification data:', error)
        // Don't throw error to prevent breaking the main save flow
      }
    }
  }

  const handleCourseOrder = (course_structure: any) => {
    const chapters = course_structure.chapters
    const chapter_order_by_ids = chapters.map((chapter: any) => {
      return {
        chapter_id: chapter.id,
        activities_order_by_ids: chapter.activities.map((activity: any) => {
          return {
            activity_id: activity.id,
          }
        }),
      }
    })
    dispatchCourse({
      type: 'setCourseOrder',
      payload: { chapter_order_by_ids: chapter_order_by_ids },
    })
    dispatchCourse({ type: 'setIsNotSaved' })
  }

  // Ref to track the previous order fingerprint so we only dispatch when structure truly changes
  const prevOrderRef = useRef<string | null>(null)

  useEffect(() => {
    if (!course_structure?.chapters) return

    const chapters = course_structure.chapters
    const chapter_order_by_ids = chapters.map((chapter: any) => ({
      chapter_id: chapter.id,
      activities_order_by_ids: chapter.activities.map((activity: any) => ({
        activity_id: activity.id,
      })),
    }))

    // Compute a fingerprint of the current order to avoid redundant dispatches
    const orderFingerprint = JSON.stringify(chapter_order_by_ids)

    if (prevOrderRef.current === orderFingerprint) {
      // Structure hasn't actually changed — skip dispatch to prevent infinite loop
      return
    }

    const isInitialLoad = prevOrderRef.current === null
    prevOrderRef.current = orderFingerprint

    dispatchCourse({
      type: 'setCourseOrder',
      payload: { chapter_order_by_ids },
    })

    if (isInitialLoad) {
      // On initial load, mark as saved (we're just syncing the order from the server)
      dispatchCourse({ type: 'setIsSaved' })
    } else {
      // On subsequent changes, mark as unsaved (user reordered something)
      dispatchCourse({ type: 'setIsNotSaved' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course_structure])

  return (
    <div className="flex space-x-4">
      {saved ? (
        <></>
      ) : (
        <div className="text-gray-600 flex space-x-2 items-center antialiased">
          <Timer size={15} />
          <div>Unsaved changes</div>
        </div>
      )}
      <div
        className={
          `px-4 py-2 rounded-lg drop-shadow-md cursor-pointer flex space-x-2 items-center font-bold antialiased transition-all ease-linear ` +
          (saved
            ? 'bg-gray-600 text-white'
            : 'bg-black text-white border hover:bg-gray-900 ') +
          (isLoading ? 'opacity-50 cursor-not-allowed' : '')
        }
        onClick={saveCourseState}
      >
        {isLoading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : saved ? (
          <Check size={20} />
        ) : (
          <SaveAllIcon size={20} />
        )}
        {isLoading ? (
          <div className="">Saving...</div>
        ) : saved ? (
          <div className="">Saved</div>
        ) : (
          <div className="">Save</div>
        )}
      </div>
    </div>
  )
}

export default SaveState
