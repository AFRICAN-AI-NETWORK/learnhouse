'use client'
import React from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { updateOrganizationIntegrations } from '@services/settings/org'
import { toast } from 'react-hot-toast'
import { Button } from '@components/ui/button'
import { Label } from '@components/ui/label'
import { Textarea } from '@components/ui/textarea'
import { Youtube, Save, Info, Key, Globe } from 'lucide-react'
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'

const OrgEditIntegrations: React.FC = () => {
  const org = useOrg() as any
  const session = useLHSession() as any
  const [youtubeJson, setYoutubeJson] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Initialize from org config
  React.useEffect(() => {
    if (org?.config?.integrations?.youtube) {
      setYoutubeJson(org.config.integrations.youtube)
    }
  }, [org])

  const handleSave = async () => {
    if (!youtubeJson) return

    setIsSubmitting(true)
    const loadingToast = toast.loading('Updating integrations...')

    try {
      // Basic JSON validation
      try {
        JSON.parse(youtubeJson)
      } catch (e) {
        toast.error(
          'Invalid JSON format. Please paste the exact JSON from Google Cloud.',
          { id: loadingToast }
        )
        setIsSubmitting(false)
        return
      }

      await updateOrganizationIntegrations(
        org.id,
        { youtube: youtubeJson },
        session.data?.tokens?.access_token
      )

      mutate(`${getAPIUrl()}orgs/slug/${org.slug}`)
      toast.success('YouTube Integration updated successfully!', {
        id: loadingToast,
      })
    } catch (err) {
      toast.error('Failed to update integrations', { id: loadingToast })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="sm:mx-10 mx-0 bg-white rounded-2xl nice-shadow overflow-hidden border border-gray-100">
      <div className="bg-gray-50/50 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-700">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 tracking-tight">
              External Integrations
            </h1>
            <p className="text-gray-500 text-sm">
              Connect and manage your third-party API credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* YouTube Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Youtube className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-bold text-gray-800">
                YouTube Automation
              </h3>
            </div>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
              Active Feature
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex gap-4">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-blue-800 leading-relaxed">
              <p className="font-bold uppercase text-[10px] tracking-widest opacity-70">
                Instruction
              </p>
              <p>
                Paste the content of your **Google Cloud OAuth 2.0 Client ID
                JSON** file below. This enables the system to automatically
                schedule live broadcasts and archive recordings for your
                students.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label
              htmlFor="youtube-json"
              className="flex items-center gap-2 text-gray-700 font-bold"
            >
              <Key className="h-4 w-4" />
              Service Account / Client ID JSON
            </Label>
            <Textarea
              id="youtube-json"
              value={youtubeJson}
              onChange={(e) => setYoutubeJson(e.target.value)}
              placeholder='{ "web": { "client_id": "...", "project_id": "...", ... } }'
              className="font-mono text-xs bg-gray-50 border-gray-200 focus:border-black focus:ring-black min-h-[250px] rounded-xl transition-all"
            />
          </div>
        </section>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !youtubeJson}
            className="bg-black text-white hover:bg-zinc-800 px-8 py-6 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Integration Settings
          </Button>
        </div>
      </div>
    </div>
  )
}

export default OrgEditIntegrations
