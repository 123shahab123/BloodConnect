import React, { useState, useEffect } from 'react'
import { Save, Send, Settings, Bell, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi } from '../../services/api'

export default function AdminConfig() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [broadcast, setBroadcast] = useState({ titleEn: '', titleFa: '', bodyEn: '', bodyFa: '', filter: {} })
  const [tab, setTab] = useState<'config' | 'broadcast'>('config')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => adminApi.getConfig().then(r => r.data.data.config),
  })

  useEffect(() => { if (data) setConfig(data) }, [data])

  const saveMutation = useMutation({
    mutationFn: () => adminApi.updateConfig(dirty),
    onSuccess: () => { toast.success('Configuration saved'); setDirty({}) },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Save failed'),
  })

  const broadcastMutation = useMutation({
    mutationFn: () => adminApi.broadcast({ titleEn: broadcast.titleEn, titleFa: broadcast.titleFa, bodyEn: broadcast.bodyEn, bodyFa: broadcast.bodyFa }),
    onSuccess: (res) => {
      toast.success(`Notification sent to ${res.data.data?.count || 0} users`)
      setBroadcast({ titleEn: '', titleFa: '', bodyEn: '', bodyFa: '', filter: {} })
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Broadcast failed'),
  })

  const handleChange = (key: string, value: string) => {
    setConfig(c => ({ ...c, [key]: value }))
    setDirty(d => ({ ...d, [key]: value }))
  }

  const CONFIG_GROUPS = [
    {
      label: 'Wave Delays — Critical (minutes)',
      keys: ['wave_1_delay_critical','wave_2_delay_critical','wave_3_delay_critical','wave_4_delay_critical'],
      labels: ['Wave 1→2','Wave 2→3','Wave 3→4','Wave 4→5'],
    },
    {
      label: 'Wave Delays — Urgent (minutes)',
      keys: ['wave_1_delay_urgent','wave_2_delay_urgent','wave_3_delay_urgent','wave_4_delay_urgent'],
      labels: ['Wave 1→2','Wave 2→3','Wave 3→4','Wave 4→5'],
    },
    {
      label: 'Wave Delays — Planned (minutes)',
      keys: ['wave_1_delay_planned','wave_2_delay_planned','wave_3_delay_planned','wave_4_delay_planned'],
      labels: ['Wave 1→2','Wave 2→3','Wave 3→4','Wave 4→5'],
    },
    {
      label: 'Limits & Thresholds',
      keys: ['donation_cooldown_days','max_requests_per_day','max_donor_notifications','otp_expiry_minutes','otp_max_attempts'],
      labels: ['Donation Cooldown (days)','Max Requests/Day','Max Notifs/Donor/Day','OTP Expiry (mins)','OTP Max Attempts'],
    },
    {
      label: 'Maintenance Mode',
      keys: ['maintenance_mode','maintenance_message_en','maintenance_message_fa'],
      labels: ['Enabled (true/false)','Message (English)','Message (Dari)'],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-neutral-dark">System Configuration</h1>
        <p className="text-sm text-neutral-medium">Manage wave delays, limits, and system settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm w-fit">
        <button onClick={() => setTab('config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'config' ? 'bg-blood text-white' : 'text-neutral-medium hover:bg-gray-50'}`}>
          <Settings className="w-4 h-4" /> Configuration
        </button>
        <button onClick={() => setTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'broadcast' ? 'bg-blood text-white' : 'text-neutral-medium hover:bg-gray-50'}`}>
          <Bell className="w-4 h-4" /> Broadcast
        </button>
      </div>

      {tab === 'config' && (
        <>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              {CONFIG_GROUPS.map(group => (
                <div key={group.label} className="bg-white rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-neutral-dark mb-4 text-sm">{group.label}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {group.keys.map((key, i) => (
                      <div key={key}>
                        <label className="text-xs font-semibold text-neutral-medium block mb-1">{group.labels[i]}</label>
                        <input type="text" value={config[key] || ''} onChange={e => handleChange(key, e.target.value)}
                          className={`w-full border-2 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors ${dirty[key] !== undefined ? 'border-blue-400 bg-blue-50' : 'border-gray-100 focus:border-blood bg-white'}`} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.keys(dirty).length > 0 && (
            <div className="sticky bottom-0 bg-white border-t border-gray-100 rounded-t-2xl p-4 flex items-center justify-between shadow-lg">
              <p className="text-sm text-neutral-medium">{Object.keys(dirty).length} unsaved change(s)</p>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blood text-white font-bold text-sm disabled:opacity-50">
                <Save className="w-4 h-4" />{saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'broadcast' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3 bg-orange-50 rounded-xl p-3 border border-orange-100">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-700">Notifications will be sent to all active users. Use sparingly.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">Title (English)</label>
              <input type="text" value={broadcast.titleEn} onChange={e => setBroadcast(b => ({ ...b, titleEn: e.target.value }))}
                placeholder="e.g. System Maintenance" className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">Title (Dari / دری)</label>
              <input type="text" value={broadcast.titleFa} onChange={e => setBroadcast(b => ({ ...b, titleFa: e.target.value }))}
                placeholder="عنوان" dir="rtl" className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">Message (English)</label>
              <textarea value={broadcast.bodyEn} onChange={e => setBroadcast(b => ({ ...b, bodyEn: e.target.value }))} rows={4}
                placeholder="Message body..." className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-2.5 text-sm outline-none resize-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">Message (Dari / دری)</label>
              <textarea value={broadcast.bodyFa} onChange={e => setBroadcast(b => ({ ...b, bodyFa: e.target.value }))} rows={4}
                placeholder="متن پیام" dir="rtl" className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-2.5 text-sm outline-none resize-none" />
            </div>
          </div>

          <button onClick={() => broadcastMutation.mutate()} disabled={!broadcast.titleEn || !broadcast.bodyEn || broadcastMutation.isPending}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-blood text-white font-bold text-sm disabled:opacity-50">
            <Send className="w-5 h-5" />{broadcastMutation.isPending ? 'Sending...' : 'Send to All Users'}
          </button>
        </div>
      )}
    </div>
  )
}
