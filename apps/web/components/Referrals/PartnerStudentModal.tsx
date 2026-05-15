'use client'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import useSWR from 'swr'
import { getPartnerStudents } from '@services/referral/referral.service'
import { LucideLoader2, Users } from 'lucide-react'
import StudentTrackingList from '@components/Affiliation/StudentTrackingList'

interface PartnerStudentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner: {
    id: number
    username: string
    email: string
  } | null
  access_token: string
  org_id: string
}

function PartnerStudentModal({
  open,
  onOpenChange,
  partner,
  access_token,
  org_id,
}: PartnerStudentModalProps) {
  const { data, isLoading, error } = useSWR(
    open && partner
      ? [`partner-students`, partner.id, access_token, org_id]
      : null,
    ([, partnerId, token, org]) =>
      getPartnerStudents(token as string, org as string, partnerId as number)
  )

  const records = data?.data ?? []
  const fetchError = data?.error || (error ? 'Network error' : undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} className="text-gray-500" />
            <span>Students Referred by {partner?.username}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <LucideLoader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">Loading student data...</p>
            </div>
          ) : (
            <StudentTrackingList
              records={records}
              isLoading={false}
              error={fetchError}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PartnerStudentModal
