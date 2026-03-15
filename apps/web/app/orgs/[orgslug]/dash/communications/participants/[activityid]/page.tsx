'use client'
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Users,
  Mail,
  Bell,
  Send,
  ChevronLeft,
  Search,
  CheckCircle2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  getLiveParticipants,
  notifyParticipants,
} from '@services/courses/live_sessions'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { BarLoader } from 'react-spinners'

export default function ParticipantManagementPage() {
  const params = useParams()
  const activityId = params.activityid as string
  const session = useLHSession() as any
  const access_token: string = session?.data?.tokens?.access_token ?? ''
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [isNotifying, setIsNotifying] = useState(false)

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const res = await getLiveParticipants(activityId, access_token)
        setParticipants(res || [])
      } catch (e) {
        toast.error('Failed to load participants')
      } finally {
        setLoading(false)
      }
    }
    if (activityId) loadParticipants()
  }, [activityId])

  const filteredParticipants = participants.filter(
    (p) =>
      p.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredParticipants.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredParticipants.map((p) => p.user_id))
    }
  }

  const toggleSelectUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  const handleBatchNotify = async (
    type: 'CONFIRMATION' | 'REMINDER' | 'ENROLMENT'
  ) => {
    if (selectedUsers.length === 0) {
      toast.error('Select at least one participant')
      return
    }

    setIsNotifying(true)
    try {
      await notifyParticipants(activityId, selectedUsers, type, access_token)
      toast.success(`Successfully sent ${type.toLowerCase()} emails!`)
      setSelectedUsers([])
    } catch (e) {
      toast.error('Failed to send notifications')
    } finally {
      setIsNotifying(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/dash/communications"
            className="text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-widest mb-2"
          >
            <ChevronLeft size={14} /> Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
            <Users className="text-zinc-400" /> Participant Manager
          </h1>
          <p className="text-zinc-500 font-medium text-sm">
            Manage session registrations and trigger batch reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleBatchNotify('REMINDER')}
            disabled={selectedUsers.length === 0 || isNotifying}
            className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Bell size={14} /> Send Reminder
          </button>
          <button
            onClick={() => handleBatchNotify('ENROLMENT')}
            disabled={selectedUsers.length === 0 || isNotifying}
            className="bg-white border border-zinc-200 text-zinc-900 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 disabled:opacity-50 transition-all"
          >
            <Send size={14} /> Invite to Enroll
          </button>
        </div>
      </header>

      <div className="bg-white border border-zinc-200 rounded-[32px] overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center gap-4 bg-zinc-50/50">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Find participants by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium"
            />
          </div>
          <div className="flex items-center gap-3 px-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {selectedUsers.length} Selected
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-[10px] font-black text-zinc-900 uppercase tracking-widest hover:underline"
            >
              {selectedUsers.length === filteredParticipants.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-20">
            <BarLoader width={100} color="#e5e7eb" />
            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
              Loading registrations...
            </p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-30">
            <Users size={60} />
            <div>
              <p className="font-black uppercase tracking-widest text-xs">
                No participants found
              </p>
              <p className="text-[10px] font-medium max-w-xs mx-auto mt-1">
                Wait for students to register or check your search filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50/50 border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-12 text-center">
                    #
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Participant
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Registration Date
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredParticipants.map((p, idx) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`hover:bg-zinc-50/30 transition-colors group ${selectedUsers.includes(p.user_id) ? 'bg-zinc-50/50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(p.user_id)}
                          onChange={() => toggleSelectUser(p.user_id)}
                          className="w-4 h-4 rounded-md border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 font-black text-sm uppercase">
                          {p.user?.first_name?.[0] ||
                            p.user?.username?.[0] ||
                            '?'}
                        </div>
                        <div>
                          <p className="font-black text-zinc-900 tracking-tight leading-none mb-1">
                            {p.user?.first_name} {p.user?.last_name}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-bold tracking-tight">
                            {p.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-zinc-500">
                      {new Date(p.creation_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          p.user?.is_waitlist
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {p.user?.is_waitlist
                          ? 'Guest (Waitlist)'
                          : 'Enrolled Student'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedUsers([p.user_id])
                            handleBatchNotify('CONFIRMATION')
                          }}
                          className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                          title="Resend Confirmation"
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUsers([p.user_id])
                            handleBatchNotify('ENROLMENT')
                          }}
                          className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                          title="Send Enrolment Invitation"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 rounded-[32px] p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl pointer-events-none group-hover:opacity-20 transition-opacity">
          <Bell size={120} className="text-white" />
        </div>
        <div className="space-y-2 relative z-10 transition-transform group-hover:translate-x-1 duration-500">
          <h4 className="text-white font-black text-lg tracking-tight">
            Email Delivery Policy
          </h4>
          <p className="text-zinc-500 text-sm font-medium max-w-xl">
            Emails are dispatched via your authenticated SMTP provider. Please
            avoid excessive reminders to prevent your domain from being flagged
            as spam.
          </p>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="text-right">
            <p className="text-white font-black text-2xl tracking-tighter">
              {participants.length}
            </p>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              Total Registrants
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
