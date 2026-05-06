'use client'
import { useOrg } from '@components/Contexts/OrgContext'
import { getActivityMediaDirectory } from '@services/media/media'
import React, { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useMediaQuery } from 'usehooks-ts'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Using the mjs worker for newer react-pdf versions
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

function DocumentPdfActivity({
  activity,
  course,
}: {
  activity: any
  course: any
}) {
  const org = useOrg() as any
  const [numPages, setNumPages] = useState<number>()
  const [pageNumber, setPageNumber] = useState<number>(1)
  const isMobile = useMediaQuery('(max-width: 768px)')

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages)
  }

  const pdfUrl = getActivityMediaDirectory(
    org?.org_uuid,
    course?.course_uuid,
    activity.activity_uuid,
    activity.content.filename,
    'documentpdf'
  )

  return (
    <div className="flex w-full flex-col items-center overflow-hidden rounded-lg bg-white">
      <div className="z-10 flex w-full items-center justify-between border-b border-slate-200 bg-white p-3 md:p-4">
        <span className="text-sm font-semibold text-slate-700 md:text-base">
          {activity?.name || 'PDF Document'}
        </span>
        {numPages && (
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="flex cursor-pointer items-center rounded-md border border-slate-200 bg-white p-1 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 md:px-3 md:py-1.5"
            >
              <ChevronLeft size={16} className="md:mr-1" />
              <span className="hidden md:inline text-sm font-medium">
                Previous
              </span>
            </button>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 md:text-sm">
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="flex cursor-pointer items-center rounded-md border border-slate-200 bg-white p-1 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 md:px-3 md:py-1.5"
            >
              <span className="hidden md:inline text-sm font-medium">Next</span>
              <ChevronRight size={16} className="md:ml-1" />
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-[500px] w-full justify-center overflow-x-auto bg-slate-50 p-2 md:p-8">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex justify-center flex-col items-center"
          loading={
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground text-sm font-medium animate-pulse">
                Loading PDF safely...
              </p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center p-10 text-destructive text-center space-y-2">
              <p className="font-bold">Failed to load PDF.</p>
              <p className="text-sm">
                The document might be missing or corrupted.
              </p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="rounded-sm overflow-hidden shadow-2xl bg-white"
            width={
              isMobile
                ? typeof window !== 'undefined'
                  ? window.innerWidth - 32
                  : 350
                : 800
            }
          />
        </Document>
      </div>
    </div>
  )
}

export default DocumentPdfActivity
