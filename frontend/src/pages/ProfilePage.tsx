import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Edit2, ChevronRight, Shield, Globe, Bell, BellOff, Info, CheckCircle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMutation } from '@tanstack/react-query'
import { authApi, userApi } from '../services/api'
import { useAuthStore, useAppStore } from '../store'
import { BloodTypeBadge, DonationBadge, Button, BottomSheet, Switch } from '../components/ui'
import { usePushNotifications } from '../hooks/usePushNotifications'
import type { Language } from '../types'
import { makeLangPicker } from '../i18n/lang'
import clsx from 'clsx'

export default function ProfilePage() {
  const navigate     = useNavigate()
  const { user, logout } = useAuthStore()
  const { language, setLanguage } = useAppStore()
  const [langSheet,   setLangSheet]   = useState(false)
  const [logoutSheet, setLogoutSheet] = useState(false)
  const [passSheet,   setPassSheet]   = useState(false)
  const [passForm,    setPassForm]    = useState({ current: '', next: '', confirm: '' })
  const [showPass,    setShowPass]    = useState(false)
  const push = usePushNotifications()

  const la = makeLangPicker(language)

  const LANGS: { code: Language; label: string; flag: string }[] = [
    { code: 'fa', label: 'دری',    flag: '🇦🇫' },
    { code: 'ps', label: 'پښتو',  flag: '🇦🇫' },
    { code: 'en', label: 'English', flag: '🌐' },
  ]

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled:  () => { logout(); navigate('/auth', { replace: true }) },
  })

  const changePwMutation = useMutation({
    mutationFn: () => userApi.changePassword({
      current_password: passForm.current,
      password:         passForm.next,
      password_confirmation: passForm.confirm,
    }),
    onSuccess: () => {
      toast.success(la('رمز عبور تغییر کرد', 'Password changed!'))
      setPassSheet(false)
      setPassForm({ current: '', next: '', confirm: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || la('خطا', 'Error')),
  })

  const handleChangeLang = (code: Language) => {
    setLanguage(code)
    userApi.updateMe({ language_pref: code }).catch(() => {})
    setLangSheet(false)
  }

  if (!user) return null

  const nextEligible = user.next_eligible_at ? new Date(user.next_eligible_at) : null
  const isEligible   = !nextEligible || nextEligible <= new Date()
  const daysLeft     = nextEligible && nextEligible > new Date()
    ? Math.ceil((nextEligible.getTime() - Date.now()) / 86400000) : 0

  const bloodRecipients: Record<string, string> = {
    'O-':'All types','O+':'O+, A+, B+, AB+','A-':'A-, A+, AB-, AB+','A+':'A+, AB+',
    'B-':'B-, B+, AB-, AB+','B+':'B+, AB+','AB-':'AB-, AB+','AB+':'AB+ only',
  }

  return (
    <div className="screen">
      {/* Header */}
      <div className="gradient-blood px-5 pb-10 safe-top pt-4">
        <h1 className="text-xl font-black text-white mb-6">
          {la('پروفایل', 'Profile')}
        </h1>
        <div className="flex items-end gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-lg">
              <span className="text-blood font-black text-3xl">{user.blood_type}</span>
            </div>
            {user.is_verified && (
              <div className="absolute -bottom-1 -end-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="pb-1">
            <h2 className="text-xl font-black text-white">{user.full_name || '—'}</h2>
            <p className="text-white/70 text-sm mt-0.5">{user.phone}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {user.is_donor && (
                <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  🩸 {la('اهداکننده', 'Donor')}
                </span>
              )}
              {user.has_email && (
                <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  ✉️ {user.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 -mt-4 pb-6 space-y-4">
        {/* Donor stats */}
        {user.is_donor && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-blood">{user.donation_count}</div>
                <div className="text-xs text-neutral-medium">{la('اهداها', 'Donations')}</div>
              </div>
              <div>
                <div className="text-2xl font-black text-neutral-dark">
                  {Math.round(user.reliability_score * 100)}%
                </div>
                <div className="text-xs text-neutral-medium">{la('اعتماد', 'Trust')}</div>
              </div>
              <div>
                <div className={clsx('text-2xl font-black', isEligible ? 'text-green-600' : 'text-orange-500')}>
                  {isEligible ? '✓' : daysLeft}
                </div>
                <div className="text-xs text-neutral-medium">
                  {isEligible ? la('واجد شرایط', 'Eligible') : la('روز مانده', 'Days left')}
                </div>
              </div>
            </div>
            {user.donation_count > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex justify-center">
                <DonationBadge count={user.donation_count} size="md" />
              </div>
            )}
          </div>
        )}

        {/* Eligibility cooldown bar */}
        {user.is_donor && !isEligible && (
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-orange-700">
                {la('دوره انتظار اهدا', 'Donation Cooldown')}
              </span>
              <span className="text-sm font-black text-orange-600">{daysLeft} {la('روز', 'days')}</span>
            </div>
            <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full transition-all"
                style={{ width: `${Math.max(5, 100 - (daysLeft / 56) * 100)}%` }} />
            </div>
            <p className="text-xs text-orange-600 mt-1.5">
              {la('استاندارد WHO: ۵۶ روز بین اهداها', 'WHO standard: 56 days between donations')}
            </p>
          </div>
        )}

        {/* Blood type info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <BloodTypeBadge type={user.blood_type} size="md" />
            <div>
              <p className="font-bold text-neutral-dark text-sm">
                {la('گروه خون شما', 'Your Blood Type')}
              </p>
              <p className="text-xs text-neutral-medium mt-0.5">
                {user.blood_type === 'O-'
                  ? la('اهداکننده جهانی — برای همه مناسب', 'Universal donor — compatible with all')
                  : user.blood_type === 'AB+'
                    ? la('دریافت‌کننده جهانی — همه گروه‌ها قابل دریافت', 'Universal recipient — can receive all types')
                    : la(`می‌تواند اهدا کند به: ${bloodRecipients[user.blood_type] || user.blood_type}`,
                         `Can donate to: ${bloodRecipients[user.blood_type] || user.blood_type}`)}
              </p>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <MenuItem icon={<Globe className="w-4 h-4" />}
            label={la('زبان', 'Language')}
            right={<span className="text-xs text-neutral-medium">{LANGS.find(l => l.code === language)?.label}</span>}
            onClick={() => setLangSheet(true)} />
          <div className="border-t border-gray-50" />
          <MenuItem icon={push.isEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            label={la('اعلان‌های فشاری', 'Push Notifications')}
            right={
              push.isSupported
                ? <Switch checked={push.isEnabled} onChange={push.toggle} loading={push.isBusy} />
                : <span className="text-xs text-neutral-medium">{la('پشتیبانی نمی‌شود', 'Not supported')}</span>
            }
            onClick={push.isSupported ? push.toggle : () => {}} />
          <div className="border-t border-gray-50" />
          <MenuItem icon={<Lock className="w-4 h-4" />}
            label={la('تغییر رمز عبور', 'Change Password')}
            onClick={() => setPassSheet(true)} />
          <div className="border-t border-gray-50" />
          <MenuItem icon={<Info className="w-4 h-4" />}
            label={la('درباره BloodConnect', 'About BloodConnect')}
            onClick={() => toast('BloodConnect v2.0 — Made with ❤️ for Afghanistan 🇦🇫', { duration: 4000, icon: '🩸' })} />
        </div>

        <div className="text-center text-xs text-gray-400 py-1">
          BloodConnect v2.0 · {la('ساخته شده برای افغانستان', 'Made for Afghanistan')} 🇦🇫
        </div>

        <Button onClick={() => setLogoutSheet(true)} variant="secondary" fullWidth
          icon={<LogOut className="w-5 h-5" />}>
          {la('خروج', 'Sign Out')}
        </Button>
      </div>

      {/* Language sheet */}
      <BottomSheet isOpen={langSheet} onClose={() => setLangSheet(false)} title={la('زبان', 'Language')}>
        <div className="space-y-2">
          {LANGS.map(l => (
            <button key={l.code} onClick={() => handleChangeLang(l.code)}
              className={clsx('w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all border-2',
                l.code === language ? 'bg-blood/10 border-blood/30' : 'bg-gray-50 border-transparent')}>
              <span className="text-2xl">{l.flag}</span>
              <div className="text-start flex-1">
                <div className="font-bold text-neutral-dark">{l.label}</div>
                <div className="text-xs text-neutral-medium">
                  {l.code === 'fa' ? 'Dari' : l.code === 'ps' ? 'Pashto' : 'English'}
                </div>
              </div>
              {l.code === language && <CheckCircle className="w-5 h-5 text-blood" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Change password sheet */}
      <BottomSheet isOpen={passSheet} onClose={() => setPassSheet(false)}
        title={la('تغییر رمز عبور', 'Change Password')}>
        <div className="space-y-3">
          {[
            { key: 'current', label: la('رمز عبور فعلی', 'Current Password') },
            { key: 'next',    label: la('رمز عبور جدید', 'New Password') },
            { key: 'confirm', label: la('تکرار رمز عبور جدید', 'Confirm New Password') },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-bold text-neutral-medium block mb-1">{label}</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={(passForm as any)[key]}
                onChange={e => setPassForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 text-sm outline-none"
              />
            </div>
          ))}
          <button onClick={() => setShowPass(v => !v)} className="text-xs text-blood font-medium">
            {showPass ? la('پنهان کردن', 'Hide') : la('نمایش رمزها', 'Show passwords')}
          </button>
          <Button fullWidth loading={changePwMutation.isPending}
            onClick={() => changePwMutation.mutate()}>
            {la('تغییر رمز عبور', 'Change Password')}
          </Button>
        </div>
      </BottomSheet>

      {/* Logout sheet */}
      <BottomSheet isOpen={logoutSheet} onClose={() => setLogoutSheet(false)}
        title={la('خروج از حساب', 'Sign Out')}>
        <p className="text-sm text-neutral-medium mb-5">
          {la('آیا مطمئن هستید که می‌خواهید خارج شوید؟', 'Are you sure you want to sign out?')}
        </p>
        <div className="space-y-2">
          <Button fullWidth variant="danger" loading={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}>
            {la('بله، خارج شوید', 'Yes, Sign Out')}
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setLogoutSheet(false)}>
            {la('لغو', 'Cancel')}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}

function MenuItem({ icon, label, right, onClick }: {
  icon: React.ReactNode; label: string; right?: React.ReactNode; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-start">
      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-neutral-medium flex-shrink-0">
        {icon}
      </div>
      <span className="flex-1 font-medium text-sm text-neutral-dark">{label}</span>
      {right || <ChevronRight className="w-4 h-4 text-gray-300" />}
    </button>
  )
}
