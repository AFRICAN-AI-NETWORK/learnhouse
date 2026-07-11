'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { CheckCircle2 } from 'lucide-react'
import { SiWhatsapp } from '@icons-pack/react-simple-icons'
import CountdownTimer from '@components/Utils/CountdownTimer'
import { useTranslation } from 'react-i18next'

interface CourseWaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  courseName: string
  launchDate?: string
  whatsappGroupUrl?: string
}

export default function CourseWaitlistModal({
  isOpen,
  onClose,
  courseName,
  launchDate,
  whatsappGroupUrl,
}: CourseWaitlistModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg rounded-3xl p-6">
        <div className="flex flex-col items-center justify-center py-4 px-2 text-center">
          <div className="mb-4 rounded-full bg-emerald-100 p-4 ring-8 ring-emerald-50">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 mb-2 text-center">
              You're registered for {courseName}!
            </DialogTitle>
          </DialogHeader>

          {launchDate ? (
            <>
              <p className="text-slate-600 mb-6 max-w-[360px] mx-auto">
                This course is currently on waitlist. Check back when the
                countdown finishes to access your course materials!
              </p>
              <div className="mb-6 w-full flex justify-center">
                <CountdownTimer
                  launchDate={launchDate}
                  displayFormat="detailed"
                />
              </div>
            </>
          ) : (
            <p className="text-slate-600 mb-6 max-w-[360px] mx-auto">
              You have successfully registered. Join the community group below
              to stay updated!
            </p>
          )}

          {whatsappGroupUrl && (
            <div className="w-full rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    <SiWhatsapp size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      Stay updated on WhatsApp
                    </p>
                    <p className="text-xs leading-5 text-slate-600">
                      Join the official group for course updates and helpful
                      information.
                    </p>
                  </div>
                </div>

                <a
                  href={whatsappGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  <SiWhatsapp size={16} />
                  Join Group
                </a>
              </div>
            </div>
          )}

          <div className="mt-8 w-full flex justify-center">
            <button
              type="button"
              className="inline-flex justify-center rounded-lg border border-transparent bg-slate-100 px-6 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              onClick={onClose}
            >
              Close and go to Dashboard
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
