import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { requestApi } from '../services/api'
import { useAppStore } from '../store'
import { BloodTypeBadge, UrgencyBadge, StatusBadge, EmptyState, Skeleton, ScreenHeader, Button } from '../components/ui'
import type { BloodRequest } from '../types'
import { makeLangPicker, pickLang } from '../i18n/lang'
import clsx from 'clsx'

const STATUS_TABS = ['all', 'pending', 'notified', 'donor_found', 'fulfilled', 'cancelled'] as const

export default function RequestsPage() {
  const { t }        = useTranslation()
  const navigate     = useNavigate()
  const { language } = useAppStore()
  const la = makeLangPicker(language)

  const [tab,  setTab]  = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['my-requests', tab, page],
    queryFn: async () => {
      const res = await requestApi.getMyList({
        status:   tab === 'all' ? undefined : tab,
        page,
        per_page: 20,
      })
      const d = res.data?.data
      // Laravel paginator: { data: [...], total: N, last_page: N }
      const items: BloodRequest[] = Array.isArray(d)
        ? d
        : Array.isArray(d?.data) ? d.data : []
      const total      = d?.total      ?? items.length
      const totalPages = d?.last_page  ?? 1
      return { requests: items, total, totalPages }
    },
    staleTime: 0,            // always fresh — show requests immediately after creation
    refetchInterval: 20_000, // auto-refresh every 20s
  })

  const requests: BloodRequest[] = data?.requests   ?? []
  const totalPages: number       = data?.totalPages ?? 1
  const total: number            = data?.total      ?? 0

  return (
    <div className="screen">
      <ScreenHeader
        title={la('درخواست‌های من', 'My Requests')}
        subtitle={la(`${total} درخواست`, `${total} total`)}
        gradient
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()}
              className={clsx('w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white',
                isFetching && 'animate-spin')}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/requests/new')}
              className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Status tabs */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => { setTab(s); setPage(1) }}
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                tab === s ? 'bg-blood text-white' : 'bg-gray-100 text-neutral-medium hover:bg-gray-200'
              )}>
              {s === 'all'        ? la('همه', 'All')
               : s === 'pending'  ? la('در انتظار', 'Pending')
               : s === 'notified' ? la('در جستجو', 'Searching')
               : s === 'donor_found' ? la('یافت شد', 'Found')
               : s === 'fulfilled'   ? la('تکمیل', 'Done')
               : la('لغو', 'Cancelled')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon="🩸"
            title={la('هیچ درخواستی وجود ندارد', 'No requests yet')}
            description={la(
              'برای ایجاد اولین درخواست خون دکمه + را فشار دهید.',
              'Tap the + button to create your first blood request.'
            )}
            action={
              <Button onClick={() => navigate('/requests/new')} icon={<Plus className="w-5 h-5" />}>
                {la('درخواست خون', 'Request Blood')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <RequestCard
                key={r.id}
                request={r}
                onClick={() => navigate(`/requests/${r.id}`)}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl bg-white text-sm font-medium disabled:opacity-40 shadow-sm">
                  {la('قبلی', 'Prev')}
                </button>
                <span className="text-sm text-neutral-medium font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl bg-white text-sm font-medium disabled:opacity-40 shadow-sm">
                  {la('بعدی', 'Next')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/requests/new')}
        className="fixed bottom-24 end-4 w-14 h-14 rounded-2xl gradient-blood text-white flex items-center justify-center shadow-[0_4px_20px_rgba(192,57,43,.5)] active:scale-95 transition-all z-40">
        <Plus className="w-7 h-7" />
      </button>
    </div>
  )
}

function RequestCard({ request, onClick }: { request: BloodRequest; onClick: () => void }) {
  const { language } = useAppStore()
  const la = makeLangPicker(language)

  const borderColor = {
    fulfilled:   'border-green-400',
    notified:    'border-blue-400',
    pending:     'border-blood',
    donor_found: 'border-emerald-400',
    cancelled:   'border-gray-200',
    expired:     'border-gray-200',
  }[request.status] || 'border-blood'

  const timeAgo = formatTimeAgo(request.created_at, language)

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-all border-s-4',
        borderColor
      )}>
      <div className="flex items-start gap-3">
        <BloodTypeBadge type={request.blood_type_needed} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <UrgencyBadge urgency={request.urgency} lang={language} />
            <StatusBadge status={request.status} lang={language} />
          </div>
          <p className="text-xs text-neutral-medium">
            {pickLang(language, {
              en: request.district_name || request.province_name,
              fa: request.district_name_fa || request.province_name_fa,
              ps: request.district_name_ps || request.province_name_ps,
            }) || '—'}
            {request.donors_accepted > 0 && (
              <span className="ms-2 text-green-600 font-semibold">
                · {request.donors_accepted} {la('اهداکننده', 'donor(s)')}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
      </div>

      {/* Active wave indicator */}
      {['pending', 'notified'].includes(request.status) && (
        <div className="mt-3 bg-neutral-light rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span className="text-xs text-neutral-medium">
            {la(`موج ${request.current_wave}`, `Wave ${request.current_wave}`)}
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blood animate-pulse" />
            <span className="text-xs text-blood font-medium">
              {la('در جستجوی اهداکننده...', 'Searching for donors...')}
            </span>
          </div>
        </div>
      )}
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
