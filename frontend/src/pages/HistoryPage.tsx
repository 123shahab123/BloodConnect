import React, { useState } from 'react'
import { Clock, Bell, Droplets } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi, notifApi } from '../services/api'
import { useAuthStore, useAppStore } from '../store'
import { EmptyState, Skeleton, ScreenHeader, DonationBadge } from '../components/ui'
import type { DonationRecord, InAppNotification } from '../types'
import { localeForLanguage, makeLangPicker, pickLang } from '../i18n/lang'
import clsx from 'clsx'

type Tab = 'donations' | 'notifications'

export default function HistoryPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { language } = useAppStore()
  const [tab, setTab] = useState<Tab>(user?.is_donor ? 'donations' : 'notifications')
  const qc = useQueryClient()
  const la = makeLangPicker(language)

  const { data: donations = [], isLoading: loadingDonations } = useQuery<DonationRecord[]>({
    queryKey: ['donation-history'],
    queryFn: async () => {
      const res = await userApi.getDonationHistory()
      const d = res.data?.data
      // Laravel paginator wraps items in .data, otherwise it's a plain array
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.data)) return d.data
      return []
    },
    enabled: user?.is_donor === true,
  })

  const { data: notifResult, isLoading: loadingNotifs } = useQuery({
    queryKey: ['in-app-notifs'],
    queryFn: async () => {
      const res = await notifApi.getInApp()
      const d = res.data?.data
      // Backend returns { notifications: PaginatorObject, unread: N }
      // PaginatorObject has .data array inside it
      let items: InAppNotification[] = []
      if (Array.isArray(d?.notifications)) {
        items = d.notifications
      } else if (Array.isArray(d?.notifications?.data)) {
        items = d.notifications.data
      } else if (Array.isArray(d?.data)) {
        items = d.data
      }
      return { notifications: items, unread: (d?.unread ?? 0) as number }
    },
  })

  const notifications: InAppNotification[] = notifResult?.notifications ?? []
  const unread: number = notifResult?.unread ?? 0

  const markAllMutation = useMutation({
    mutationFn: () => notifApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['in-app-notifs'] }),
  })

  return (
    <div className="screen">
      <ScreenHeader
        title={t('nav.history')}
        gradient
        right={tab === 'notifications' && unread > 0 ? (
          <button
            onClick={() => markAllMutation.mutate()}
            className="text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20">
            {la('همه خوانده شد', 'Mark all read')}
          </button>
        ) : undefined}
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 py-2">
        {user?.is_donor && (
          <button
            onClick={() => setTab('donations')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all',
              tab === 'donations' ? 'bg-blood text-white' : 'text-neutral-medium hover:bg-gray-50'
            )}>
            <Droplets className="w-4 h-4" />
            {la('اهداها', 'Donations')}
          </button>
        )}
        <button
          onClick={() => setTab('notifications')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all',
            tab === 'notifications' ? 'bg-blood text-white' : 'text-neutral-medium hover:bg-gray-50'
          )}>
          <Bell className="w-4 h-4" />
          {la('اعلانات', 'Notifications')}
          {unread > 0 && (
            <span className="bg-white text-blood text-xs font-black rounded-full px-1.5 min-w-[18px] text-center">
              {unread}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ── Donations tab ────────────────────────────────────── */}
        {tab === 'donations' && (
          <>
            {/* Summary card */}
            {user?.is_donor && (
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blood flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-2xl">{user.donation_count || 0}</span>
                </div>
                <div>
                  <p className="font-bold text-neutral-dark text-lg">
                    {la('مجموع اهداها', 'Total Donations')}
                  </p>
                  <DonationBadge count={user.donation_count || 0} size="md" />
                  {user.next_eligible_at && new Date(user.next_eligible_at) > new Date() && (
                    <p className="text-xs text-neutral-medium mt-1">
                      {la(
                        `اهدای بعدی: ${new Date(user.next_eligible_at).toLocaleDateString('fa-IR')}`,
                        `Next eligible: ${new Date(user.next_eligible_at).toLocaleDateString()}`
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {loadingDonations ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : donations.length === 0 ? (
              <EmptyState
                icon="🩸"
                title={la('هنوز اهدایی انجام نداده‌اید', 'No donations yet')}
                description={la(
                  'تاریخچه اهداهای شما اینجا نمایش داده می‌شود.',
                  'Your donation history will appear here.'
                )}
              />
            ) : (
              <div className="space-y-3">
                {donations.map(d => <DonationCard key={d.id} donation={d} />)}
              </div>
            )}
          </>
        )}

        {/* ── Notifications tab ─────────────────────────────────── */}
        {tab === 'notifications' && (
          <>
            {loadingNotifs ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon="🔔"
                title={la('هیچ اعلانی ندارید', 'No notifications yet')}
                description={la(
                  'اعلان‌های سیستم اینجا نمایش داده می‌شوند.',
                  'System notifications will appear here.'
                )}
              />
            ) : (
              <div className="space-y-2">
                {notifications.map(n => <NotifRow key={n.id} notif={n} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DonationCard({ donation }: { donation: DonationRecord }) {
  const { language } = useAppStore()
  const la = makeLangPicker(language)
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-blood flex items-center justify-center text-white font-black text-sm flex-shrink-0">
        {donation.blood_type}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-neutral-dark truncate">
            {donation.district_name || donation.province_name || '—'}
          </span>
          {donation.confirmed_by_requester && (
            <span className="text-green-600 text-xs font-semibold flex-shrink-0 ms-2">
              ✓ {la('تأیید شد', 'Confirmed', 'تایید شو')}
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-medium mt-0.5">
          {new Date(donation.donated_at).toLocaleDateString(
            localeForLanguage(language),
            { year: 'numeric', month: 'long', day: 'numeric' }
          )}
        </p>
      </div>
    </div>
  )
}

function NotifRow({ notif }: { notif: InAppNotification }) {
  const { language } = useAppStore()
  const title = pickLang(language, { en: notif.title_en, fa: notif.title_fa, ps: notif.title_ps })
  const body  = pickLang(language, { en: notif.body_en, fa: notif.body_fa, ps: notif.body_ps })
  const timeAgo = formatTimeAgo(notif.created_at, language)

  return (
    <div className={clsx(
      'rounded-2xl px-4 py-3 flex items-start gap-3 transition-all',
      notif.is_read ? 'bg-white shadow-sm' : 'bg-red-50 border border-red-100'
    )}>
      <div className={clsx(
        'w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0',
        notif.is_read ? 'bg-gray-200' : 'bg-blood'
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-dark clamp-1">{title}</p>
        <p className="text-xs text-neutral-medium mt-0.5 clamp-2">{body}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (lang !== 'en') {
    if (days > 0) return `${days} روز پیش`
    if (hrs  > 0) return `${hrs} ساعت پیش`
    return `${mins} دقیقه پیش`
  }
  if (days > 0) return `${days}d ago`
  if (hrs  > 0) return `${hrs}h ago`
  return `${mins}m ago`
}
