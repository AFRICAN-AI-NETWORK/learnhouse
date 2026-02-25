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

interface CommissionHistoryListProps {
  records: CommissionRecord[]
  isLoading: boolean
  error: string | undefined
}

const STATUS_BADGE: Record<
  CommissionStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  [CommissionStatus.PENDING]: { label: 'Pending', variant: 'secondary' },
  [CommissionStatus.ELIGIBLE]: { label: 'Eligible', variant: 'default' },
  [CommissionStatus.PAID]: { label: 'Paid', variant: 'outline' },
  [CommissionStatus.CANCELLED]: { label: 'Cancelled', variant: 'secondary' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function CommissionHistoryList({
  records,
  isLoading,
  error,
}: CommissionHistoryListProps) {
  return (
    <div className="bg-white rounded-xl nice-shadow px-6 py-5">
      <div className="flex flex-col bg-gray-50 -space-y-1 px-4 py-3 rounded-md mb-4">
        <h2 className="font-bold text-lg text-gray-800">Commission History</h2>
        <p className="text-gray-500 text-sm">
          All commissions earned through your referrals.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse h-12 bg-gray-100 rounded-lg"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 text-rose-500 text-sm">{error}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          No commissions yet. Share your referral code to get started!
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referred User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Eligible Date</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const badge = STATUS_BADGE[record.status] ?? {
                label: record.status,
                variant: 'secondary' as const,
              }
              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.referred_username}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: record.currency || 'USD',
                    }).format(record.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(record.eligible_date)}</TableCell>
                  <TableCell>{formatDate(record.completion_date)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default CommissionHistoryList
