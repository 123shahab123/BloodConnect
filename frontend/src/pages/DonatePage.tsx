import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { notifApi } from '../services/api'
import { useAppStore, useAuthStore } from '../store'
import { BloodTypeBadge, UrgencyBadge, CountdownTimer, EmptyState, Skeleton, ScreenHeader } from '../components/ui'
import type { DonorNotification } from '../types'
import { makeLangPicker, pickLang } from '../i18n/lang'
import clsx from 'clsx'

export default function DonatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language, setUnread } = useAppStore()
  const { user } = useAuthStore()
  const [filter, setFilter] = useState<'all' | 'critical' | 'urgent' | 'planned'>('all')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['incoming-notifications'],
    queryFn: async () => {
      const res = await notifApi.getIncoming()
      const count = res.data.data.count || 0
      setUnread(count)
      return res.data.data
    },
    refetchInterval: 15_000, // poll every 15 seconds
    staleTime: 10_000,
  })

  const all: DonorNotification[] = data?.notifications || []
  const filtered = filter === 'all' ? all : all.filter(n => n.urgency === filter)

  const la = makeLangPicker(language)

  if (!user?.is_donor) {
    return (
      <div className="screen">
        <ScreenHeader title={t('nav.donate')} gradient />
        <EmptyState
          icon="🩸"
          title={la('اهداکننده نیستید', 'You are not a donor')}
          description={la('برای دریافت درخواست‌های اهدا، ابتدا به عنوان اهداکننده ثبت‌نام کنید.', 'Register as a donor to receive blood donation requests.')}
        />
      </div>
    )
  }

  return (
    <div className="screen">
      <ScreenHeader
        title={t('nav.donate')}
        subtitle={la('درخواست‌های اهدای خون', 'Incoming donation requests')}
        gradient
        right={
          <button onClick={() => refetch()}
            className={clsx('w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white transition-transform', isFetching && 'animate-spin')}>
            <RefreshCw className="w-5 h-5" />
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'critical', 'urgent', 'planned'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx(
              'flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all',
              filter === f ? 'bg-blood text-white shadow-sm' : 'bg-gray-100 text-neutral-medium hover:bg-gray-200'
            )}>
            {f === 'all'      ? la('همه', 'All') :
             f === 'critical' ? la('🚨 بحرانی', '🚨 Critical') :
             f === 'urgent'   ? la('⚠️ فوری', '⚠️ Urgent') :
                                la('📅 برنامه‌ریزی', '📅 Planned')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="💤"
            title={la('هیچ درخواست فعالی وجود ندارد', 'No active requests')}
            description={la(
              'وقتی بیمار به خون شما نیاز داشت، اینجا نشان داده می‌شود.',
              'When a patient needs your blood type, requests will appear here.'
            )}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(n => (
              <NotifCard key={n.id} notif={n} onClick={() => navigate(`/donate/${n.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NotifCard({ notif, onClick }: { notif: DonorNotification; onClick: () => void }) {
  const { language } = useAppStore()

  const urgencyBorder = {
    critical: 'border-red-400',
    urgent:   'border-orange-400',
    planned:  'border-blue-400',
  }[notif.urgency] || 'border-gray-200'

  const districtName = pickLang(language, {
    en: notif.district_name,
    fa: notif.district_name_fa,
    ps: notif.district_name_ps,
  })

  const la = makeLangPicker(language)

  return (
    <div onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-all border-s-4',
        urgencyBorder
      )}>
      <div className="flex items-start gap-3">
        <BloodTypeBadge type={notif.blood_type_needed} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <UrgencyBadge urgency={notif.urgency} lang={language} />
            <CountdownTimer endsAt={notif.response_window_ends_at} />
          </div>
          <p className="text-sm font-semibold text-neutral-dark">
            {districtName}
            {notif.distance_km != null && (
              <span className="text-blood ms-2">· {notif.distance_km} km</span>
            )}
          </p>
          {notif.notes && (
            <p className="text-xs text-neutral-medium mt-1 clamp-2">{notif.notes}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-neutral-medium">
              {la(`موج ${notif.wave}`, `Wave ${notif.wave}`)}
            </span>
            <span className="text-xs text-neutral-medium">·</span>
            <span className="text-xs text-neutral-medium">
              {notif.units_needed} {la('واحد', 'unit(s)')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 py-2 bg-blood/10 rounded-xl text-blood text-xs font-bold text-center">
        {la('مشاهده و پاسخ', 'View & Respond')}
      </div>
    </div>
  )
}
