import FormLayout, {
  FormField,
  FormLabel,
  FormMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import React, { useState, useRef } from 'react'
import * as Form from '@radix-ui/react-form'
import BarLoader from 'react-spinners/BarLoader'
import { constructAcceptValue } from '@/lib/constants'
import { FileText, Upload, FileUp, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

const SUPPORTED_FILES = constructAcceptValue(['pdf'])

function DocumentPdfModal({ submitFileActivity, chapterId, course }: any) {
  const [documentpdf, setDocumentPdf] = React.useState(null) as any
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = React.useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDocumentPdfChange = (event: React.ChangeEvent<any>) => {
    if (event.target.files && event.target.files[0]) {
      setDocumentPdf(event.target.files[0])
    }
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!documentpdf || !name) return

    setIsSubmitting(true)
    let status = await submitFileActivity(
      documentpdf,
      'documentpdf',
      {
        name: name,
        chapter_id: chapterId,
        activity_type: 'TYPE_DOCUMENT',
        activity_sub_type: 'SUBTYPE_DOCUMENT_PDF',
        published_version: 1,
        version: 1,
        course_id: course.id,
      },
      chapterId
    )
    setIsSubmitting(false)
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <FormLayout onSubmit={handleSubmit} className="space-y-6">
      <FormField name="documentpdf-activity-name">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <FileText size={16} className="text-zinc-500" />
              PDF Document name
            </FormLabel>
            <FormMessage
              match="valueMissing"
              className="text-[10px] font-bold text-rose-500 uppercase tracking-tight"
            >
              Name required
            </FormMessage>
          </div>
          <Form.Control asChild>
            <Input
              onChange={handleNameChange}
              type="text"
              required
              placeholder="e.g. Course Syllabus"
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
            />
          </Form.Control>
        </div>
      </FormField>

      <FormField name="documentpdf-activity-file">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <Upload size={16} className="text-zinc-500" />
              PDF Document file
            </FormLabel>
            <FormMessage
              match="valueMissing"
              className="text-[10px] font-bold text-rose-500 uppercase tracking-tight"
            >
              File required
            </FormMessage>
          </div>

          <Form.Control asChild>
            <div className="relative">
              <input
                ref={fileInputRef}
                accept={SUPPORTED_FILES}
                type="file"
                onChange={handleDocumentPdfChange}
                required
                className="hidden"
              />
              <motion.div
                whileHover={{ scale: 0.995 }}
                whileTap={{ scale: 0.98 }}
                onClick={triggerFileSelect}
                className={`
                  relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer group flex flex-col items-center justify-center text-center gap-3
                  ${
                    documentpdf
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100/80 hover:border-zinc-300'
                  }
                `}
              >
                <div
                  className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-colors
                  ${documentpdf ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400 group-hover:text-zinc-500'}
                `}
                >
                  {documentpdf ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    <FileUp size={24} />
                  )}
                </div>

                <div className="space-y-1">
                  <p
                    className={`font-bold text-sm ${documentpdf ? 'text-emerald-900' : 'text-zinc-900'}`}
                  >
                    {documentpdf ? documentpdf.name : 'Choose a PDF file'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {documentpdf
                      ? `${(documentpdf.size / 1024 / 1024).toFixed(2)} MB`
                      : 'Drag and drop or click to browse'}
                  </p>
                </div>
              </motion.div>
            </div>
          </Form.Control>
        </div>
      </FormField>

      <div className="flex justify-end mt-8">
        <Form.Submit asChild>
          <motion.button
            whileHover={{ scale: 1.01, translateY: -0.5 }}
            whileTap={{ scale: 0.99 }}
            disabled={isSubmitting || !documentpdf || !name}
            className={`
              relative overflow-hidden group py-3 px-10 rounded-xl font-bold text-sm tracking-tight transition-all duration-300 flex items-center justify-center shadow-lg active:shadow-sm
              ${
                isSubmitting || !documentpdf || !name
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'
                  : 'bg-zinc-900 text-white hover:bg-black'
              }
            `}
          >
            <div className="absolute inset-0 bg-linear-to-tr from-zinc-900 via-zinc-800 to-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <span className="relative z-10">
              {isSubmitting ? (
                <BarLoader
                  cssOverride={{ borderRadius: 60 }}
                  width={80}
                  color="#ffffff"
                />
              ) : (
                'Create activity'
              )}
            </span>
          </motion.button>
        </Form.Submit>
      </div>
    </FormLayout>
  )
}

export default DocumentPdfModal
