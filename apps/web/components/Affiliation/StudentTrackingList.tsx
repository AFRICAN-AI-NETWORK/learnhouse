'use client'
import React from 'react'
import { Badge } from '@components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@components/ui/table'
import { CommissionStatus } from 'types/referral'
import type { CommissionRecord } from 'types/referral'
import { CheckCircle2, Clock, UserCheck } from 'lucide-react'

interface StudentTrackingListProps {
  records: CommissionRecord[]
  isLoading: boolean
  error: string | undefined
}

const STATUS_CONFIG: Record<
  CommissionStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning'
    icon: any
  }
> = {
  [CommissionStatus.PENDING]: {
    label: 'Registered',
    variant: 'secondary',
    icon: Clock,
  },
  [CommissionStatus.ELIGIBLE]: {
    label: 'Paid',
    variant: 'default',
    icon: CheckCircle2,
  },
  [CommissionStatus.PAID]: {
    label: 'Commission Paid',
    variant: 'outline',
    icon: UserCheck,
  },
  [CommissionStatus.CANCELLED]: {
    label: 'Cancelled',
    variant: 'secondary',
    icon: Clock,
  },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StudentTrackingList({
  records,
  isLoading,
  error,
}: StudentTrackingListProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="font-bold text-lg text-slate-900">Student Tracking</h2>
          <p className="text-slate-500 text-sm">
            Monitor students who registered through your link.
          </p>
        </div>
        <Badge variant="outline" className="bg-white">
          {records.length} {records.length === 1 ? 'Referral' : 'Referrals'}
        </Badge>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse h-16 bg-slate-50 rounded-xl"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-rose-500 text-sm px-6">
          <p className="font-bold mb-1">Failed to load tracking data</p>
          <p className="opacity-80">{error}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCheck className="text-slate-300" size={32} />
          </div>
          <h3 className="text-slate-900 font-bold mb-1">No referrals yet</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Once students register using your referral link, they will appear
            here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-slate-600 font-bold px-6">
                  Student
                </TableHead>
                <TableHead className="text-slate-600 font-bold">
                  Course
                </TableHead>
                <TableHead className="text-slate-600 font-bold">
                  Registration Date
                </TableHead>
                <TableHead className="text-slate-600 font-bold">
                  Status
                </TableHead>
                <TableHead className="text-slate-600 font-bold text-right px-6">
                  Earnings
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const config = STATUS_CONFIG[record.status] || {
                  label: record.status,
                  variant: 'secondary',
                  icon: Clock,
                }
                const StatusIcon = config.icon

                return (
                  <TableRow
                    key={record.id}
                    className="hover:bg-slate-50/50 border-slate-50 transition-colors"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {record.referred_username}
                        </span>
                        <span className="text-xs text-slate-500">
                          {record.referred_user_email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-slate-700">
                        {record.course_name || 'General Platform'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-slate-600">
                        {formatDate(record.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant={config.variant as any}
                        className={`flex items-center gap-1.5 w-fit ${
                          record.status === CommissionStatus.ELIGIBLE ||
                          record.status === CommissionStatus.PAID
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <StatusIcon size={12} />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                      <span
                        className={`font-bold ${record.amount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}
                      >
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(record.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default StudentTrackingList
