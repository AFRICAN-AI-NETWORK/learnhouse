'use client'
import React, { useState } from 'react'
import { Bell, Send, History, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import {
  createAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
  Announcement,
} from '@services/announcements'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { BarLoader } from 'react-spinners'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'react-hot-toast'

export default function AnnouncementsPage({
  params,
}: {
  params: Promise<{ orgslug: string }>
}) {
  const { orgslug } = React.use(params)
  const session = useLHSession() as any
  const access_token: string = session?.data?.tokens?.access_token ?? ''

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  // Use SWR for stable data fetching (fetch both active and inactive for admins)
  const {
    data: announcements = [],
    error: announcementsError,
    isLoading: loadingAnnouncements,
  } = useSWR(
    orgslug && access_token
      ? [`${orgslug}_announcements_all`, access_token]
      : null,
    ([, token]) => fetchAnnouncements(orgslug, false, token as string) // false = fetch all
  )

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) return

    setIsSubmitting(true)
    try {
      await createAnnouncement(orgslug, title, content, access_token)
      toast.success('Announcement published!')

      mutate([`${orgslug}_announcements_all`, access_token])

      setTitle('')
      setContent('')
    } catch (e) {
      toast.error('Failed to publish announcement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleStatus = async (
    announcementId: number,
    currentStatus: boolean
  ) => {
    try {
      await updateAnnouncement(
        orgslug,
        announcementId,
        access_token,
        undefined,
        undefined,
        !currentStatus
      )
      toast.success(
        currentStatus ? 'Announcement archived' : 'Announcement reactivated'
      )
      mutate([`${orgslug}_announcements_all`, access_token])
    } catch (e) {
      toast.error('Failed to update announcement status')
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto min-h-screen bg-[#f8f8f8] dark:bg-[#0f0f13]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3 dark:text-white">
            <Bell className="text-zinc-400 dark:text-white/45" /> Announcements
          </h1>
          <p className="text-zinc-500 font-medium dark:text-white/50">
            Post global updates and news for your students.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Composer */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSend}
            className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6 dark:border-white/8 dark:bg-[#13131a] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-50 pb-4 dark:border-white/8 dark:text-white/40">
              <Send size={16} /> New Announcement
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-wider pl-1 dark:text-white/45">
                  Announcement Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  type="text"
                  placeholder="e.g. Welcome to the new semester!"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:ring-indigo-500/15"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-wider pl-1 dark:text-white/45">
                  Announcement Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Write the announcement content here..."
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium resize-none dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:ring-indigo-500/15"
                  required
                />
              </div>
            </div>

            <div className="pt-6 flex items-center justify-end border-t border-zinc-50 dark:border-white/8">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-zinc-900 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-xl hover:shadow-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:hover:shadow-blue-950/30 dark:disabled:bg-white/10 dark:disabled:text-white/30"
              >
                {isSubmitting ? (
                  <BarLoader width={80} color="#ffffff" />
                ) : (
                  <>
                    Publish <Send size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 space-y-4 dark:border-white/8 dark:bg-[#13131a]">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 dark:text-white/40">
              <History size={16} /> Past Announcements
            </div>

            {loadingAnnouncements ? (
              <div className="text-center py-12">
                <BarLoader width={100} color="#e5e7eb" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-16 space-y-3 opacity-20 dark:text-white">
                <Bell size={40} className="mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  No announcements yet
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {announcements.map((ann: Announcement) => (
                  <div
                    key={ann.id}
                    className={`bg-white p-4 rounded-2xl border ${ann.is_active ? 'border-zinc-100' : 'border-red-100 opacity-60'} shadow-xs space-y-2 hover:border-zinc-200 transition-colors dark:bg-white/5 dark:hover:border-white/15`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          ann.is_active
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {ann.is_active ? 'Active' : 'Archived'}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-bold dark:text-white/35">
                        {new Date(ann.creation_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-zinc-900 truncate tracking-tight dark:text-white/85">
                      {ann.title}
                    </h4>
                    <button
                      onClick={() => toggleStatus(ann.id, ann.is_active)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-900 font-bold mt-2"
                    >
                      {ann.is_active ? 'Archive' : 'Reactivate'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden group dark:border dark:border-white/8">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle size={60} className="text-white" />
            </div>
            <h4 className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest relative z-10">
              Quick Tip
            </h4>
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mt-3 relative z-10">
              Global announcements appear directly in the student's top
              navigation bar via the bell icon, ensuring immediate visibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
