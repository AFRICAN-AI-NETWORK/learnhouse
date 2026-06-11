import ConfirmationModal from '@components/Objects/StyledElements/ConfirmationModal/ConfirmationModal'
import {
  Hexagon,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Save,
  Trash2,
  Lock,
  Globe,
  Clock3,
} from 'lucide-react'
import React from 'react'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import ActivityElement from './ActivityElement'
import NewActivityButton from '../Buttons/NewActivityButton'
import { deleteChapter, updateChapter } from '@services/courses/chapters'
import { updateActivity } from '@services/courses/activities'
import {
  revalidateTags,
  RequestBodyWithAuthHeader,
} from '@services/utils/ts/requests'
import { useRouter } from 'next/navigation'
import { getAPIUrl } from '@services/config/config'
import { mutate } from 'swr'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useCourse } from '@components/Contexts/CourseContext'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

type ChapterElementProps = {
  chapter: any
  chapterIndex: number
  orgslug: string
  course_uuid: string
}

interface ModifiedChapterInterface {
  chapterId: string
  chapterName: string
}

const POINT_COMPARISON_EPSILON = 0.000001
const POINT_DECIMAL_PLACES = 1

function roundPoints(points: number) {
  const factor = 10 ** POINT_DECIMAL_PLACES
  return Math.round(points * factor) / factor
}

function formatPoints(points: number) {
  return Number.isInteger(points)
    ? points.toString()
    : points.toFixed(POINT_DECIMAL_PLACES).replace(/\.?0+$/, '')
}

function ChapterElement(props: ChapterElementProps) {
  const { t } = useTranslation()
  const activities = React.useMemo(
    () => props.chapter.activities || [],
    [props.chapter.activities]
  )
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [modifiedChapter, setModifiedChapter] = React.useState<
    ModifiedChapterInterface | undefined
  >(undefined)
  const [selectedChapter, setSelectedChapter] = React.useState<
    string | undefined
  >(undefined)
  const course = useCourse() as any
  const withUnpublishedActivities = course
    ? course.withUnpublishedActivities
    : false

  const activityCount = activities.length
  const pointsPerActivity = React.useMemo(
    () => (activityCount > 0 ? roundPoints(100 / activityCount) : 0),
    [activityCount]
  )
  const totalPoints = activityCount > 0 ? 100 : 0
  const displayedTotalPoints = formatPoints(totalPoints)

  React.useEffect(() => {
    if (!access_token || activityCount === 0) {
      return
    }

    const activitiesToUpdate = activities.filter((activity: any) => {
      const currentPoints = Number(activity.points || 0)
      return (
        !Number.isFinite(currentPoints) ||
        Math.abs(currentPoints - pointsPerActivity) > POINT_COMPARISON_EPSILON
      )
    })

    if (activitiesToUpdate.length === 0) {
      return
    }

    let cancelled = false

    async function syncActivityPoints() {
      try {
        await Promise.all(
          activitiesToUpdate.map((activity: any) =>
            updateActivity(
              {
                ...activity,
                points: pointsPerActivity,
              },
              activity.activity_uuid,
              access_token
            )
          )
        )

        if (cancelled) {
          return
        }

        mutate(
          `${getAPIUrl()}courses/${props.course_uuid}/meta?with_unpublished_activities=${withUnpublishedActivities}`
        )
        await revalidateTags(['courses'], props.orgslug)
      } catch {
        if (!cancelled) {
          toast.error('Failed to auto-allocate activity points')
        }
      }
    }

    syncActivityPoints()

    return () => {
      cancelled = true
    }
  }, [
    access_token,
    activities,
    activityCount,
    pointsPerActivity,
    props.course_uuid,
    props.orgslug,
    withUnpublishedActivities,
  ])

  const router = useRouter()

  const deleteChapterUI = async () => {
    await deleteChapter(props.chapter.id, access_token)
    mutate(
      `${getAPIUrl()}courses/${props.course_uuid}/meta?with_unpublished_activities=${withUnpublishedActivities}`
    )
    await revalidateTags(['courses'], props.orgslug)
    router.refresh()
  }

  async function updateChapterName(chapterId: string) {
    if (modifiedChapter?.chapterId === chapterId) {
      let modifiedChapterCopy = {
        name: modifiedChapter.chapterName,
      }
      await updateChapter(chapterId, modifiedChapterCopy, access_token)
      mutate(
        `${getAPIUrl()}courses/${props.course_uuid}/meta?with_unpublished_activities=${withUnpublishedActivities}`
      )
      await revalidateTags(['courses'], props.orgslug)
      router.refresh()
    }
    setSelectedChapter(undefined)
  }

  return (
    <Draggable
      key={props.chapter.chapter_uuid}
      draggableId={props.chapter.chapter_uuid}
      index={props.chapterIndex}
    >
      {(provided, snapshot) => (
        <div
          className={`mx-2 sm:mx-4 md:mx-6 lg:mx-10 bg-white rounded-xl nice-shadow px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 ${
            snapshot.isDragging
              ? 'shadow-xl ring-2 ring-blue-500/20 rotate-1'
              : ''
          }`}
          key={props.chapter.chapter_uuid}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          <div className="flex flex-wrap items-center justify-between pb-3">
            <div className="flex grow items-center space-x-2 mb-2 sm:mb-0">
              <div className="bg-neutral-100 rounded-md p-2">
                <Hexagon
                  strokeWidth={3}
                  size={16}
                  className="text-neutral-600"
                />
              </div>
              <div className="flex items-center space-x-2">
                {selectedChapter === props.chapter.id ? (
                  <div className="chapter-modification-zone bg-neutral-100 py-1 px-2 sm:px-4 rounded-lg flex items-center space-x-2">
                    <input
                      type="text"
                      className="bg-transparent outline-hidden text-sm text-neutral-700 w-full max-w-[150px] sm:max-w-none"
                      placeholder={t(
                        'dashboard.courses.structure.chapter_element.chapter_name_placeholder'
                      )}
                      value={
                        modifiedChapter
                          ? modifiedChapter?.chapterName
                          : props.chapter.name
                      }
                      onChange={(e) =>
                        setModifiedChapter({
                          chapterId: props.chapter.id,
                          chapterName: e.target.value,
                        })
                      }
                    />
                    <button
                      onClick={() => updateChapterName(props.chapter.id)}
                      className="bg-transparent text-neutral-700 hover:cursor-pointer hover:text-neutral-900"
                    >
                      <Save size={15} />
                    </button>
                  </div>
                ) : (
                  <p className="text-neutral-700 first-letter:uppercase text-sm sm:text-base">
                    {props.chapter.name}
                  </p>
                )}
                <Pencil
                  size={15}
                  onClick={() => setSelectedChapter(props.chapter.id)}
                  className="text-neutral-600 hover:cursor-pointer"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={async () => {
                  const targetPublishState = !props.chapter.published
                  const loadingToast = toast.loading(
                    targetPublishState
                      ? 'Publishing chapter...'
                      : 'Unpublishing chapter...'
                  )
                  try {
                    const response = await fetch(
                      `${getAPIUrl()}chapters/${props.chapter.id}`,
                      RequestBodyWithAuthHeader(
                        'PUT',
                        { published: targetPublishState },
                        null,
                        access_token
                      )
                    )
                    if (!response.ok) {
                      const text = await response.text()
                      let errMsg = response.statusText
                      try {
                        const errJson = JSON.parse(text)
                        if (errJson && errJson.detail) {
                          errMsg = errJson.detail
                        }
                      } catch {
                        // Ignore JSON parse errors and use statusText
                      }
                      throw new Error(errMsg)
                    }

                    mutate(
                      `${getAPIUrl()}courses/${props.course_uuid}/meta?with_unpublished_activities=${withUnpublishedActivities}`
                    )
                    await revalidateTags(['courses'], props.orgslug)
                    toast.success(
                      targetPublishState
                        ? 'Chapter published successfully!'
                        : 'Chapter unpublished successfully!',
                      { id: loadingToast }
                    )
                    router.refresh()
                  } catch (error: any) {
                    toast.error(
                      error.message || 'Failed to update chapter status.',
                      { id: loadingToast }
                    )
                  }
                }}
                className={`p-1.5 px-3 border shadow-sm rounded-md font-bold text-xs flex items-center space-x-1.5 transition-colors duration-200 hover:cursor-pointer ${
                  props.chapter.published
                    ? 'bg-linear-to-bl text-gray-800 from-gray-400/50 to-gray-200/80 border-gray-600/10 hover:from-gray-500/50 hover:to-gray-300/80'
                    : 'bg-linear-to-bl text-green-800 from-green-400/50 to-lime-200/80 border-green-600/10 hover:from-green-500/50 hover:to-lime-300/80'
                }`}
              >
                {props.chapter.published ? (
                  <Lock strokeWidth={2.5} size={12} className="text-gray-600" />
                ) : (
                  <Globe
                    strokeWidth={2.5}
                    size={12}
                    className="text-green-600"
                  />
                )}
                <span>{props.chapter.published ? 'Unpublish' : 'Publish'}</span>
              </button>
              <MoreVertical size={15} className="text-gray-300" />
              <ConfirmationModal
                confirmationButtonText={t(
                  'dashboard.courses.structure.modals.delete_chapter.button'
                )}
                confirmationMessage={t(
                  'dashboard.courses.structure.modals.delete_chapter.message'
                )}
                dialogTitle={t(
                  'dashboard.courses.structure.modals.delete_chapter.title',
                  { name: props.chapter.name }
                )}
                dialogTrigger={
                  <button
                    className="hover:cursor-pointer p-1 px-2 sm:px-3 bg-red-600 rounded-md shadow-sm flex items-center text-rose-100 text-sm"
                    rel="noopener noreferrer"
                  >
                    <Trash2 size={15} className="text-rose-200" />
                  </button>
                }
                functionToExecute={() => deleteChapterUI()}
                status="warning"
              />
            </div>
          </div>
          <Droppable
            key={props.chapter.chapter_uuid}
            droppableId={props.chapter.chapter_uuid}
            type="activity"
          >
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`min-h-[60px] rounded-lg transition-colors duration-75 ${
                  snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                }`}
              >
                {activities.map((activity: any, index: any) => (
                  <ActivityElement
                    key={activity.activity_uuid}
                    orgslug={props.orgslug}
                    course_uuid={props.course_uuid}
                    activityIndex={index}
                    activity={activity}
                    points={pointsPerActivity}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <NewActivityButton
            orgslug={props.orgslug}
            chapterId={props.chapter.id}
          />
          <div className="flex items-center justify-between border-t border-neutral-100 pt-3 pb-1 mt-4">
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${totalPoints === 100 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
              >
                {displayedTotalPoints} / 100 pts
              </span>
              {totalPoints !== 100 && (
                <span className="text-[11px] text-neutral-400">
                  (Add activities to allocate points automatically)
                </span>
              )}
            </div>
            {props.chapter.due_date && (
              <span className="text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded-full flex items-center space-x-1">
                <Clock3 size={11} className="text-neutral-400" />
                <span>
                  Due: {new Date(props.chapter.due_date).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>
          <div className="h-6">
            <div className="flex items-center">
              <MoreHorizontal size={19} className="text-gray-300 mx-auto" />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default ChapterElement
