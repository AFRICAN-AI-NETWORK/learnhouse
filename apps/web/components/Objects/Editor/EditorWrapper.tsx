'use client'
import { default as React, type JSX } from 'react'
import Editor from './Editor'
import SmartArticleEditor from './SmartArticleEditor'
import { updateActivity } from '@services/courses/activities'
import { toast } from 'react-hot-toast'
import Toast from '@components/Objects/StyledElements/Toast/Toast'
import { OrgProvider } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  createAssignment,
  getAssignmentFromActivityUUID,
  createAssignmentTask,
  updateAssignmentTask,
  deleteAssignmentTask,
} from '@services/courses/assignments'
import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader } from '@services/utils/ts/requests'

interface EditorWrapperProps {
  content: string
  activity: any
  course: any
  org: any
}

function EditorWrapper(props: EditorWrapperProps): JSX.Element {
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  async function syncAssignmentTasks(activity: any, content: any) {
    if (activity.activity_type !== 'TYPE_SMART_ARTICLE')
      return activity.assignment_uuid

    const assignmentBlocks = content.steps?.filter((s: any) =>
      ['QUIZ', 'CODE_EXERCISE', 'CUSTOM_ANSWER', 'FILE_SUBMISSION'].includes(
        s.type?.toUpperCase() || s.type
      )
    )

    if (!assignmentBlocks || assignmentBlocks.length === 0) {
      return activity.assignment_uuid
    }

    let assignmentUUID = activity.assignment_uuid

    if (!assignmentUUID) {
      const getRes = await getAssignmentFromActivityUUID(
        activity.activity_uuid,
        access_token
      )
      if (getRes.success && getRes.data?.assignment_uuid) {
        assignmentUUID = getRes.data.assignment_uuid
      } else {
        let resolvedChapterId = activity.chapter_id
        if (!resolvedChapterId) {
          const chapters =
            props.course?.chapters ||
            props.course?.courseStructure?.chapters ||
            []
          for (const chap of chapters) {
            if (
              chap.activities &&
              chap.activities.some(
                (a: any) => a.activity_uuid === activity.activity_uuid
              )
            ) {
              resolvedChapterId = chap.id
              break
            }
          }
          if (!resolvedChapterId && chapters.length > 0) {
            resolvedChapterId = chapters[0].id
          }
        }

        const payload = {
          title: activity.name,
          description: 'Smart Article Assignment',
          due_date: '',
          published: true,
          grading_type: 'PERCENTAGE',
          course_id: props.course?.id || props.course?.courseStructure?.id,
          org_id: props.org.id,
          chapter_id: resolvedChapterId,
          activity_id: activity.id,
        }
        console.log('Create Assignment Payload:', payload)

        let createRes: any = null
        try {
          createRes = await createAssignment(payload, access_token)
        } catch (e: any) {
          console.error('CREATE ASSIGNMENT FAILED', e.body || e.message)
          toast.error('Assignment creation failed: ' + (e.body || e.message))
        }
        if (createRes && createRes.success) {
          assignmentUUID = createRes.data.assignment_uuid
        }
      }
    }

    if (assignmentUUID) {
      activity.assignment_uuid = assignmentUUID

      const tasksRes = await fetch(
        `${getAPIUrl()}assignments/${assignmentUUID}/tasks`,
        RequestBodyWithAuthHeader('GET', null, null, access_token)
      )
      const tasksData = await tasksRes.json()
      let existingTasks = Array.isArray(tasksData)
        ? tasksData
        : tasksData.data || []

      for (const type of [
        'QUIZ',
        'CODE_EXERCISE',
        'CUSTOM_ANSWER',
        'FILE_SUBMISSION',
      ]) {
        const blocksOfType = assignmentBlocks.filter(
          (b: any) => (b.type?.toUpperCase() || b.type) === type
        )
        const tasksOfType = existingTasks.filter(
          (t: any) => t.assignment_type === type
        )

        for (let i = 0; i < blocksOfType.length; i++) {
          const block = blocksOfType[i]
          const existingTask = tasksOfType[i]

          let contents = {}
          if (type === 'QUIZ') {
            const mappedQuestions = (block.questions || []).map((q: any) => ({
              questionText: q.content || q.text || q.questionText || '',
              options: (q.options || []).map((opt: any, optIdx: number) => {
                // Handle both array of strings (SmartArticle) and array of objects (TaskQuizObject)
                const optText = typeof opt === 'string' ? opt : opt.text || ''
                const isCorrect =
                  q.correctOptionIndex !== undefined
                    ? q.correctOptionIndex === optIdx
                    : !!opt.assigned_right_answer

                return {
                  text: optText,
                  assigned_right_answer: isCorrect,
                }
              }),
            }))
            contents = { questions: mappedQuestions }
          }

          const taskPayload = {
            title: block.title || `Smart Article ${type}`,
            description: block.content || block.text || '',
            hint: '',
            reference_file: '',
            assignment_type: type,
            contents: contents,
            max_grade_value: 100,
          }

          if (existingTask) {
            await updateAssignmentTask(
              taskPayload,
              existingTask.assignment_task_uuid,
              assignmentUUID,
              access_token
            )
          } else {
            await createAssignmentTask(
              taskPayload,
              assignmentUUID,
              access_token
            )
          }
        }

        for (let i = blocksOfType.length; i < tasksOfType.length; i++) {
          await deleteAssignmentTask(
            tasksOfType[i].assignment_task_uuid,
            assignmentUUID,
            access_token
          )
        }
      }
    }

    return assignmentUUID
  }

  async function setContent(content: any) {
    toast.promise(
      (async () => {
        const activity = { ...props.activity }
        activity.content = content

        // Sync Assignment tasks if this is a smart article and contains quiz/assignment blocks
        await syncAssignmentTasks(activity, content)

        const res = await updateActivity(
          activity,
          activity.activity_uuid,
          access_token
        )
        if (!res.success) {
          throw res
        }
        return res
      })(),
      {
        loading: 'Saving...',
        success: () => <b>Activity saved!</b>,
        error: (err) => {
          const errorMessage =
            err?.data?.detail ||
            err?.data?.message ||
            `Error ${err?.status || 'Unknown'}: Could not save`
          return <b>{errorMessage}</b>
        },
      }
    )
  }

  {
    return (
      <>
        <Toast></Toast>
        <OrgProvider orgslug={props.org.slug}>
          {!session.isLoading &&
            (props.activity.activity_type === 'TYPE_SMART_ARTICLE' ? (
              <SmartArticleEditor
                org={props.org}
                course={props.course}
                activity={props.activity}
                content={props.content}
                setContent={setContent}
              />
            ) : (
              <Editor
                org={props.org}
                course={props.course}
                activity={props.activity}
                content={props.content}
                setContent={setContent}
                session={session}
              ></Editor>
            ))}
        </OrgProvider>
      </>
    )
  }
}

export default EditorWrapper
