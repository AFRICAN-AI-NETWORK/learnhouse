'use client'
import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import {
  useAssignmentsTask,
  useAssignmentsTaskDispatch,
} from '@components/Contexts/Assignments/AssignmentsTaskContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
  Textarea,
} from '@components/Objects/StyledElements/Form/Form'
import * as Form from '@radix-ui/react-form'
import {
  updateAssignmentTask,
  updateReferenceFile,
} from '@services/courses/assignments'
import { getTaskRefFileDir } from '@services/media/media'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import {
  AlignLeft,
  Award,
  Check,
  ClipboardList,
  Download,
  FileCheck,
  FileUp,
  FolderOpen,
  Info,
  Lightbulb,
  Loader,
  Type,
} from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import toast from 'react-hot-toast'
import { constructAcceptValue } from '@/lib/constants'
import { useTranslation } from 'react-i18next'

const SUPPORTED_FILES = constructAcceptValue([
  'pdf',
  'docx',
  'mp4',
  'jpg',
  'png',
  'pptx',
  'zip',
])

export function AssignmentTaskGeneralEdit() {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const assignmentTaskState = useAssignmentsTask() as any
  const assignmentTaskStateHook = useAssignmentsTaskDispatch() as any
  const assignment = useAssignments() as any

  const validationSchema = Yup.object().shape({
    title: Yup.string().nullable(),
    description: Yup.string().nullable(),
    hint: Yup.string().nullable(),
    max_grade_value: Yup.number()
      .min(20, t('dashboard.assignments.editor.task_editor.general.max_grade_error'))
      .max(100, t('dashboard.assignments.editor.task_editor.general.max_grade_error'))
      .nullable(),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema) as any,
    values: {
      title: assignmentTaskState.assignmentTask.title,
      description: assignmentTaskState.assignmentTask.description,
      hint: assignmentTaskState.assignmentTask.hint,
      max_grade_value: assignmentTaskState.assignmentTask.max_grade_value,
    },
  })

  const onSubmit = async (values: any) => {
    const res = await updateAssignmentTask(
      values,
      assignmentTaskState.assignmentTask.assignment_task_uuid,
      assignment.assignment_object.assignment_uuid,
      access_token
    )
    if (res) {
      assignmentTaskStateHook({ type: 'reload' })
      toast.success(t('dashboard.assignments.editor.toasts.task_updated'))
    } else {
      toast.error(t('dashboard.assignments.editor.toasts.task_update_error'))
    }
  }

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-200 flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">
              {t(
                'dashboard.assignments.editor.task_editor.general.basic_info',
                'Task Configuration'
              )}
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3">
                <FormField name="title">
                  <div className="flex items-center space-x-2 mb-2">
                    <Type className="w-3.5 h-3.5 text-slate-400" />
                    <FormLabelAndMessage
                      label={t(
                        'dashboard.assignments.editor.task_editor.general.title'
                      )}
                      message={errors.title?.message as string}
                    />
                  </div>
                  <Form.Control asChild>
                    <Input
                      {...register('title')}
                      type="text"
                      className="font-medium"
                      placeholder={t(
                        'dashboard.assignments.editor.task_editor.general.title_placeholder',
                        'e.g., Introduction to Python'
                      )}
                    />
                  </Form.Control>
                </FormField>
              </div>
              <div className="md:col-span-1">
                <FormField name="max_grade_value">
                  <div className="flex items-center space-x-2 mb-2">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    <FormLabelAndMessage
                      label={t(
                        'dashboard.assignments.editor.task_editor.general.max_grade_value'
                      )}
                      message={errors.max_grade_value?.message as string}
                    />
                  </div>
                  <Form.Control asChild>
                    <Input
                      {...register('max_grade_value')}
                      type="number"
                      className="text-center font-bold text-blue-600 bg-blue-50/30"
                    />
                  </Form.Control>
                </FormField>
              </div>
            </div>

            <FormField name="description">
              <div className="flex items-center space-x-2 mb-2">
                <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                <FormLabelAndMessage
                  label={t(
                    'dashboard.assignments.editor.task_editor.general.description'
                  )}
                  message={errors.description?.message as string}
                />
              </div>
              <Form.Control asChild>
                <Input
                  {...register('description')}
                  type="text"
                  placeholder={t(
                    'dashboard.assignments.editor.task_editor.general.description_placeholder',
                    'Briefly describe this task...'
                  )}
                />
              </Form.Control>
            </FormField>

            <FormField name="hint">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <FormLabelAndMessage
                  label={t(
                    'dashboard.assignments.editor.task_editor.general.hint'
                  )}
                  message={errors.hint?.message as string}
                />
              </div>
              <Form.Control asChild>
                <Textarea
                  {...register('hint')}
                  placeholder={t(
                    'dashboard.assignments.editor.task_editor.general.hint_placeholder',
                    'Provide a hint for students...'
                  )}
                  className="min-h-[100px] resize-none pb-8"
                />
              </Form.Control>
            </FormField>
          </div>
        </div>

        {/* Section 2: Resources */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">
                {t(
                  'dashboard.assignments.editor.task_editor.general.resources',
                  'Support Material'
                )}
              </h3>
            </div>
          </div>
          <div className="p-6">
            <FormField name="reference_file">
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <Info className="w-4 h-4 text-slate-400" />
                    <span>
                      {t(
                        'dashboard.assignments.editor.task_editor.general.reference_file_info'
                      )}
                    </span>
                  </div>
                  <span className="font-bold text-slate-400">
                    {t(
                      'dashboard.assignments.editor.task_editor.general.max_size',
                      'MAX 10MB'
                    )}
                  </span>
                </div>
              </div>
              <Form.Control asChild>
                <UpdateTaskRef />
              </Form.Control>
            </FormField>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end pt-4">
          <Form.Submit asChild>
            <button className="group flex items-center justify-center space-x-2.5 px-10 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-xl shadow-slate-200 active:scale-95">
              <Check className="w-5 h-5 group-hover:scale-110 transition-transform text-emerald-400" />
              <span>
                {t(
                  'dashboard.assignments.editor.task_editor.general.submit',
                  'Save Changes'
                )}
              </span>
            </button>
          </Form.Submit>
        </div>
      </div>
    </FormLayout>
  )
}

function UpdateTaskRef() {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const access_token = session?.data?.tokens?.access_token
  const assignmentTaskState = useAssignmentsTask() as any
  const assignmentTaskStateHook = useAssignmentsTaskDispatch() as any
  const assignment = useAssignments() as any
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('') as any

  const handleFileChange = async (event: any) => {
    const file = event.target.files[0]
    setIsLoading(true)
    const res = await updateReferenceFile(
      file,
      assignmentTaskState.assignmentTask.assignment_task_uuid,
      assignment.assignment_object.assignment_uuid,
      access_token
    )
    assignmentTaskStateHook({ type: 'reload' })
    // wait for 1 second to show loading animation
    await new Promise((r) => setTimeout(r, 1500))
    if (res.success === false) {
      setError(res.data.detail)
      setIsLoading(false)
    } else {
      toast.success(
        t(
          'dashboard.assignments.editor.task_editor.general.reference_file_updated'
        )
      )
      setIsLoading(false)
      setError('')
    }
  }

  const getTaskRefDirUI = () => {
    return getTaskRefFileDir(
      org?.org_uuid,
      assignment.course_object.course_uuid,
      assignment.activity_object.activity_uuid,
      assignment.assignment_object.assignment_uuid,
      assignmentTaskState.assignmentTask.assignment_task_uuid,
      assignmentTaskState.assignmentTask.reference_file
    )
  }

  return (
    <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl min-h-[160px] transition-all hover:border-blue-400 group overflow-hidden">
      <div className="flex flex-col justify-center items-center h-full p-8">
        <div className="flex flex-col justify-center items-center space-y-4">
          <div className="flex flex-col justify-center items-center">
            {error && (
              <div className="mb-4 flex justify-center bg-rose-50 border border-rose-100 rounded-xl text-rose-900 px-4 py-2.5 space-x-2 items-center transition-all shadow-sm">
                <Info size={14} className="text-rose-500 shrink-0" />
                <div className="text-[11px] font-bold">{error}</div>
              </div>
            )}
          </div>

          {assignmentTaskState.assignmentTask.reference_file && !isLoading && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="relative flex flex-col items-center p-6 bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 w-[250px]">
                <div className="absolute -top-3 -right-3 bg-emerald-500 rounded-full p-2 text-white shadow-lg border-4 border-slate-50">
                  <FileCheck size={18} />
                </div>
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-3">
                  <FolderOpen size={32} className="text-blue-500" />
                </div>
                <div className="font-bold text-slate-800 text-xs mb-1 truncate w-full text-center px-4">
                  {assignmentTaskState.assignmentTask.reference_file
                    .split('/')
                    .pop()}
                </div>
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  {assignmentTaskState.assignmentTask.reference_file
                    .split('.')
                    .pop()}{' '}
                  RESOURCES
                </div>

                <div className="flex space-x-2 mt-6 w-full">
                  <Link
                    href={getTaskRefDirUI()}
                    download
                    target="_blank"
                    className="flex-[1.2] bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl text-[9px] font-bold text-center transition-all flex items-center justify-center space-x-1 whitespace-nowrap"
                  >
                    <Download size={12} />
                    <span>DOWNLOAD</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById('fileInput')?.click()
                    }
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl text-[9px] font-bold transition-colors flex items-center justify-center space-x-1 whitespace-nowrap"
                  >
                    <FileUp size={12} />
                    <span>CHANGE</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-slate-900 rounded-full shadow-lg">
                <Loader className="w-6 h-6 text-white animate-spin" />
              </div>
              <div className="font-bold text-slate-900 text-[11px] uppercase tracking-widest animate-pulse">
                Syncing Assets...
              </div>
            </div>
          ) : (
            <>
              {!assignmentTaskState.assignmentTask.reference_file && (
                <div className="flex flex-col items-center space-y-4 py-4">
                  <div className="p-6 bg-white rounded-3xl shadow-lg border border-slate-50 text-slate-200 group-hover:text-blue-500 group-hover:scale-105 transition-all duration-500 group-hover:border-blue-100">
                    <FileUp className="w-10 h-10" />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <button
                      type="button"
                      className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-full font-bold text-[11px] uppercase tracking-wider shadow-lg transition-all active:scale-95"
                      onClick={() =>
                        document.getElementById('fileInput')?.click()
                      }
                    >
                      Attach Resource
                    </button>
                    <p className="mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      Standard formats supported (PDF, DOCX, ZIP)
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <input
            type="file"
            accept={SUPPORTED_FILES}
            id="fileInput"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  )
}
