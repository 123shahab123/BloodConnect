import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets, Bell, ChevronRight, MapPin, Clock, TrendingUp, Plus, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi, notifApi, requestApi } from '../services/api'
import { useAuthStore, useAppStore } from '../store'
import { BloodTypeBadge, UrgencyBadge, CountdownTimer, DonationBadge, Skeleton, EmptyState } from '../components/ui'
import type { DonorNotification, BloodRequest } from '../types'
import { makeLangPicker, pickLang } from '../i18n/lang'
import clsx from 'clsx'

// ── Availability Toggle ───────────────────────────────────────────────────────
function AvailabilityToggle({
  available, onToggle, loading, nextEligibleAt
}: {
  available: boolean
  onToggle: () => void
  loading: boolean
  nextEligibleAt?: string | null
}) {
  const { language } = useAppStore()
  const isBlocked = !!nextEligibleAt && new Date(nextEligibleAt) > new Date()
  const daysLeft  = isBlocked ? Math.ceil((new Date(nextEligibleAt!).getTime() - Date.now()) / 86400000) : 0
  const la = makeLangPicker(language)

  return (
    <div
      onClick={!isBlocked && !loading ? onToggle : undefined}
      className={clsx(
        'relative overflow-hidden rounded-3xl p-5 transition-all duration-500 select-none',
        isBlocked       ? 'bg-gradient-to-br from-gray-400 to-gray-500 cursor-not-allowed'
        : available     ? 'bg-gradient-to-br from-green-400 to-emerald-600 cursor-pointer'
                        : 'bg-gradient-to-br from-neutral-dark to-gray-700 cursor-pointer'
      )}>
      {available && !isBlocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map(i => (
            <div key={i} className="absolute w-32 h-32 rounded-full bg-white/10 animate-wave"
              style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
        </div>
      )}

      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={clsx('w-2.5 h-2.5 rounded-full',
              available && !isBlocked ? 'bg-white animate-pulse' : 'bg-white/50'
            )} />
            <span className="text-white font-bold text-lg">
              {isBlocked
                ? la(`${daysLeft} روز تا اهدای بعدی`, `${daysLeft} days until eligible`)
                : available
                  ? la('در دسترس برای اهدا', 'Available to Donate')
                  : la('غیر فعال', 'Unavailable')}
            </span>
          </div>
          <p className="text-white/80 text-xs">
            {isBlocked
              ? la('بعد از 56 روز می‌توانید دوباره اهدا کنید', '56-day WHO cooldown period')
              : la('برای تغییر وضعیت ضربه بزنید', 'Tap to change status')}
          </p>
        </div>

        {loading ? (
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
            available && !isBlocked ? 'bg-white' : 'bg-white/20')}>
            {isBlocked
              ? <Clock className="w-7 h-7 text-white" />
              : available
                ? <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                : <Droplets className="w-7 h-7 text-white/70" />}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Incoming request card ─────────────────────────────────────────────────────
function IncomingCard({ notif, onClick }: { notif: DonorNotification; onClick: () => void }) {
  const { language } = useAppStore()
  const districtName = pickLang(language, {
    en: notif.district_name,
    fa: notif.district_name_fa,
    ps: notif.district_name_ps,
  })

  return (
    <div onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-all border-s-4',
        notif.urgency === 'critical' ? 'border-red-500'
        : notif.urgency === 'urgent'  ? 'border-orange-400'
                                      : 'border-blue-400'
      )}>
      <div className="flex items-start gap-3">
        <BloodTypeBadge type={notif.blood_type_needed} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <UrgencyBadge urgency={notif.urgency} lang={language} />
            <CountdownTimer endsAt={notif.response_window_ends_at} className="text-xs" />
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-medium mt-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{districtName}</span>
            {notif.distance_km != null && (
              <span className="ms-1 font-semibold text-blood">· {notif.distance_km} km</span>
            )}
          </div>
          {notif.notes && (
            <p className="text-xs text-neutral-medium mt-1 clamp-1">{notif.notes}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </div>
  )
}

// ── Recent blood requests ─────────────────────────────────────────────────────
function RecentRequests() {
  const { language } = useAppStore()
  const la = makeLangPicker(language)
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['my-requests-home'],
    queryFn: () => requestApi.getMyList({ per_page: 3 }).then(r => r.data.data.data),
    staleTime: 30_000,
  })

  if (isLoading) return <Skeleton className="h-20 rounded-2xl" />

  const requests: BloodRequest[] = data || []

  if (!requests.length) return (
    <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
      <p className="text-neutral-medium text-sm">
        {la('هنوز درخواستی ندارید', 'No requests yet', 'تر اوسه غوښتنه نشته')}
      </p>
    </div>
  )

  return (
    <div className="space-y-2">
      {requests.map(r => (
        <div key={r.id} onClick={() => navigate(`/requests/${r.id}`)}
          className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
          <BloodTypeBadge type={r.blood_type_needed} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-neutral-dark">{r.blood_type_needed}</span>
              <UrgencyBadge urgency={r.urgency} lang={language} />
            </div>
            <p className="text-xs text-neutral-medium">
              {pickLang(language, {
                en: r.district_name || r.province_name,
                fa: r.district_name_fa || r.province_name_fa,
                ps: r.district_name_ps || r.province_name_ps,
              })}
            </p>
          </div>
          <span className={clsx(
            'text-xs font-bold px-2 py-0.5 rounded-full',
            r.status === 'fulfilled'   ? 'bg-green-100 text-green-700'
            : r.status === 'donor_found' ? 'bg-emerald-100 text-emerald-700'
            : r.status === 'cancelled' || r.status === 'expired' ? 'bg-gray-100 text-gray-500'
            : r.status === 'notified'  ? 'bg-blue-100 text-blue-600'
                                        : 'bg-yellow-100 text-yellow-700'
          )}>
            {r.status === 'fulfilled'   ? '✓ Done'
            : r.status === 'donor_found' ? '👤 Found'
            : r.status === 'notified'   ? '📡 Searching'
            : r.status === 'pending'    ? '⏳ Pending'
            : r.status === 'cancelled'  ? '✗ Cancelled'
                                        : '⌛ Expired'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── HomePage ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const { language, setUnread } = useAppStore()
  const qc = useQueryClient()
  const la = makeLangPicker(language)

  // Incoming donor notifications — poll every 20 seconds
  const { data: incomingData, isLoading: loadingIncoming } = useQuery({
    queryKey: ['incoming-notifications'],
    queryFn: async () => {
      const res = await notifApi.getIncoming()
      setUnread(res.data.data.count || 0)
      return res.data.data
    },
    enabled: user?.is_donor === true,
    refetchInterval: 20_000,
  })

  const notifications: DonorNotification[] = incomingData?.notifications || []

  // Toggle donor availability
  const toggleMutation = useMutation({
    mutationFn: (val: boolean) => userApi.updateAvailability(val),
    onSuccess: (_, val) => {
      setUser({ ...user!, is_available: val })
      toast.success(
        val ? la('✅ شما اکنون در دسترس هستید!', '✅ You are now available!')
            : la('⏸️ دسترسی غیرفعال شد', '⏸️ Availability turned off'),
        { duration: 2500 }
      )
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || la('خطایی رخ داد', 'Something went wrong')
      toast.error(msg)
    },
  })

  return (
    <div className="screen">
      {/* ── Header ── */}
      <div className="gradient-blood px-5 pb-6 safe-top pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs">{la('خوش آمدید', 'Welcome back')}</p>
            <h1 className="text-xl font-black text-white truncate max-w-[200px]">
              {user?.full_name ? user.full_name.split(' ')[0] : 'BloodConnect'}
            </h1>
          </div>
          <button onClick={() => navigate('/profile')}
            className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <span className="text-blood font-black text-lg">{user?.blood_type || '🩸'}</span>
            </div>
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3">
          {[
            { icon: '🩸', value: user?.donation_count ?? 0, label: la('اهداها', 'Donations') },
            { icon: '⭐', value: user?.reliability_score ? `${Math.round(user.reliability_score * 100)}%` : '—', label: la('اعتماد', 'Trust') },
            ...(user?.is_donor ? [{ icon: '🔔', value: notifications.length, label: la('درخواست', 'Requests') }] : []),
          ].map(s => (
            <div key={s.label} className="flex-1 bg-white/15 rounded-2xl px-3 py-2 text-center">
              <div className="text-white font-black text-lg">{s.value}</div>
              <div className="text-white/70 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Donor availability toggle ── */}
        {user?.is_donor && (
          <AvailabilityToggle
            available={user.is_available}
            onToggle={() => toggleMutation.mutate(!user.is_available)}
            loading={toggleMutation.isPending}
            nextEligibleAt={user.next_eligible_at}
          />
        )}

        {/* ── Request blood CTA ── */}
        <button onClick={() => navigate('/requests/new')}
          className="w-full gradient-blood rounded-2xl p-5 text-white text-start active:scale-[0.98] transition-transform shadow-[0_4px_20px_rgba(192,57,43,.4)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-black mb-0.5">{la('درخواست خون', 'Request Blood')}</div>
              <div className="text-white/80 text-xs">
                {la('فوری اهداکننده نزدیک پیدا کنید', 'Find a matching donor near you instantly')}
              </div>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🆘</div>
          </div>
        </button>

        {/* ── Incoming requests (donors only) ── */}
        {user?.is_donor && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-neutral-dark text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-blood" />
                {la('درخواست‌های ورودی', 'Incoming Requests')}
                {notifications.length > 0 && (
                  <span className="bg-blood text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {notifications.length}
                  </span>
                )}
              </h2>
              {notifications.length > 0 && (
                <button onClick={() => navigate('/donate')} className="text-blood text-xs font-semibold">
                  {la('همه', 'See all')}
                </button>
              )}
            </div>

            {loadingIncoming ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <div className="text-3xl mb-2">💤</div>
                <p className="text-neutral-medium text-sm">
                  {la('هیچ درخواست فعالی وجود ندارد', 'No active incoming requests')}
                </p>
                <p className="text-neutral-medium text-xs mt-1">
                  {la('وقتی بیمار به خون شما نیاز داشت اینجا نشان داده می‌شود', 'Requests appear here when a patient needs your blood type')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 3).map(n => (
                  <IncomingCard key={n.id} notif={n} onClick={() => navigate(`/donate/${n.id}`)} />
                ))}
                {notifications.length > 3 && (
                  <button onClick={() => navigate('/donate')}
                    className="w-full py-3 rounded-2xl bg-white text-blood text-sm font-semibold shadow-sm">
                    {la(`${notifications.length - 3} درخواست دیگر`, `${notifications.length - 3} more requests`)}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── My recent requests ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-neutral-dark text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blood" />
              {la('درخواست‌های من', 'My Requests')}
            </h2>
            <button onClick={() => navigate('/requests')} className="text-blood text-xs font-semibold">
              {la('همه', 'See all')}
            </button>
          </div>
          <RecentRequests />
        </div>

        {/* ── Donation badge ── */}
        {user?.is_donor && user.donation_count > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <DonationBadge count={user.donation_count} size="md" />
            <div>
              <p className="font-bold text-neutral-dark text-sm">{la('نشان اهداکننده', 'Donor Badge')}</p>
              <p className="text-xs text-neutral-medium">
                {la(`${user.donation_count} اهدای موفق`, `${user.donation_count} successful donation(s)`)}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ── FAB — quick blood request ── */}
      <button onClick={() => navigate('/requests/new')}
        className="fixed bottom-24 end-4 w-14 h-14 rounded-2xl gradient-blood text-white flex items-center justify-center shadow-[0_4px_20px_rgba(192,57,43,.5)] active:scale-95 transition-all z-40">
        <Plus className="w-7 h-7" />
      </button>
    </div>
  )
}
