import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ChevronDown, MapPin, CheckCircle, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi, userApi, tokenStorage } from '../../services/api'
import { useAuthStore, useAppStore } from '../../store'
import { Button, StepIndicator } from '../../components/ui'
import type { Province, District, BloodType } from '../../types'
import { makeLangPicker, pickLang } from '../../i18n/lang'
import clsx from 'clsx'

const BLOOD_TYPES: BloodType[] = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { language } = useAppStore()
  const { setAuth } = useAuthStore()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)

  const [form, setForm] = useState({
    phone: '', password: '', passwordConfirm: '',
    full_name: '', blood_type: '' as BloodType | '',
    email: '',
    province_id: 0, district_id: 0,
    age: '', gender: '' as 'male' | 'female' | 'prefer_not_to_say' | '',
    is_donor: false,
    language_pref: language,
    lat: null as number | null, lng: null as number | null, useGps: false,
  })

  const t = makeLangPicker(language)

  useEffect(() => {
    userApi.getProvinces().then(r => setProvinces(r.data.data.provinces)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.province_id) return
    setLoadingDistricts(true)
    userApi.getDistricts(form.province_id)
      .then(r => { setDistricts(r.data.data.districts); setForm(f => ({ ...f, district_id: 0 })) })
      .catch(() => {})
      .finally(() => setLoadingDistricts(false))
  }, [form.province_id])

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const pName = (p: Province) => language === 'fa' ? p.name_fa : language === 'ps' ? p.name_ps : p.name_en
  const dName = (d: District) => language === 'fa' ? d.name_fa : language === 'ps' ? d.name_ps : d.name_en

  const handleGps = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => { setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude, useGps: true })); toast.success(t('موقعیت ثبت شد!', 'Location captured!')) },
      () => toast.error(t('موقعیت در دسترس نیست', 'GPS unavailable'))
    )
  }

  const validate = (): boolean => {
    if (step === 1) {
      const cleanPhone = form.phone.trim().replace(/\s/g, '')
      if (cleanPhone.length < 7) { toast.error(t('شماره تلفن معتبر وارد کنید', 'Enter a valid phone number')); return false }
      if (form.password.length < 6) { toast.error(t('رمز عبور حداقل ۶ کاراکتر', 'Password must be at least 6 characters')); return false }
      if (form.password !== form.passwordConfirm) { toast.error(t('رمز عبور تطابق ندارد', 'Passwords do not match')); return false }
      if (form.full_name.trim().length < 2) { toast.error(t('نام کامل را وارد کنید', 'Enter your full name')); return false }
      if (!form.blood_type) { toast.error(t('گروه خون را انتخاب کنید', 'Select your blood type')); return false }
      const age = parseInt(form.age); if (!form.age || age < 16 || age > 80) { toast.error(t('سن باید بین ۱۶ تا ۸۰ باشد', 'Age must be 16-80')); return false }
      if (form.is_donor && (age < 18 || age > 65)) { toast.error(t('اهداکننده باید بین ۱۸ تا ۶۵ سال باشد', 'Donors must be 18-65')); return false }
    }
    if (step === 2) {
      if (!form.province_id) { toast.error(t('استان را انتخاب کنید', 'Select a province')); return false }
      if (!form.district_id) { toast.error(t('ناحیه را انتخاب کنید', 'Select a district')); return false }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const payload: Record<string, any> = {
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.passwordConfirm,
        full_name: form.full_name.trim(),
        blood_type: form.blood_type,
        province_id: form.province_id,
        district_id: form.district_id,
        age: parseInt(form.age),
        is_donor: form.is_donor,
        language_pref: language,
      }
      if (form.gender) payload.gender = form.gender
      if (form.email.trim()) payload.email = form.email.trim()
      if (form.lat) { payload.lat = form.lat; payload.lng = form.lng }

      const res = await authApi.register(payload)
      const { access_token, user } = res.data.data
      tokenStorage.set(access_token)
      setAuth(access_token, user)
      toast.success(t('خوش آمدید به BloodConnect! 🩸', 'Welcome to BloodConnect! 🩸'))
      navigate('/home', { replace: true })
    } catch (err: any) {
      const msg = err.response?.data?.message || t('خطا در ثبت‌نام', 'Registration failed')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    t('اطلاعات شخصی', 'Personal Info'),
    t('موقعیت', 'Location'),
    t('اهداکننده', 'Donor'),
  ]

  return (
    <div className="min-h-screen bg-neutral-light flex flex-col">
      {/* Header */}
      <div className="gradient-blood px-5 py-4 safe-top">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/auth')}
            className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <StepIndicator current={step} total={3} />
          <div className="w-10" />
        </div>
        <h1 className="text-2xl font-black text-white">{t('ثبت‌نام', 'Register')}</h1>
        <p className="text-white/80 text-sm mt-1">{steps[step - 1]}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">

        {/* ── Step 1: Personal Info ──────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {/* Phone */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-2 block">{t('شماره تلفن *', 'Phone Number *')}</label>
              <div className="relative">
                <div className="absolute start-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <span>🇦🇫</span><span className="font-semibold text-sm text-neutral-dark">+93</span>
                  <div className="w-px h-4 bg-gray-200" />
                </div>
                <input type="tel" inputMode="numeric" value={form.phone} onChange={e => set('phone', e.target.value.replace(/[^0-9+\s]/g, ''))}
                  placeholder="7XX XXX XXXX"
                  className="w-full ps-[88px] pe-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blood outline-none text-base font-semibold" />
              </div>
            </div>

            {/* Password */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide block">{t('رمز عبور *', 'Password *')}</label>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder={t('حداقل ۶ کاراکتر', 'At least 6 characters')}
                  className="w-full ps-10 pe-12 py-3 rounded-xl border-2 border-gray-100 focus:border-blood outline-none text-base font-medium" />
                <button onClick={() => setShowPass(v => !v)} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={form.passwordConfirm} onChange={e => set('passwordConfirm', e.target.value)}
                  placeholder={t('تکرار رمز عبور', 'Confirm password')}
                  className={clsx('w-full ps-10 pe-4 py-3 rounded-xl border-2 outline-none text-base font-medium',
                    form.passwordConfirm && form.password !== form.passwordConfirm ? 'border-red-400' : 'border-gray-100 focus:border-blood')} />
              </div>
            </div>

            {/* Full Name */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-2 block">{t('نام کامل *', 'Full Name *')}</label>
              <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder={t('نام و نام خانوادگی', 'Your full name')}
                className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 text-base font-medium outline-none" />
            </div>

            {/* Email (optional) */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-2 block">
                {t('ایمیل (اختیاری)', 'Email (optional)')}
              </label>
              <div className="relative">
                <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="example@email.com"
                  className="w-full ps-10 pe-4 py-3 rounded-xl border-2 border-gray-100 focus:border-blood outline-none text-base font-medium" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{t('بیشتر مردم افغانستان ایمیل ندارند. کاملاً اختیاری است.', 'Email is optional — most Afghans use phone only.')}</p>
            </div>

            {/* Blood type */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-3 block">{t('گروه خون *', 'Blood Type *')}</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_TYPES.map(bt => (
                  <button key={bt} onClick={() => set('blood_type', bt)}
                    className={clsx('py-3 rounded-xl border-2 font-black text-sm transition-all active:scale-95',
                      form.blood_type === bt ? 'bg-blood border-blood text-white shadow-lg scale-105' : 'border-gray-100 bg-gray-50 text-neutral-dark')}>
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Age + Gender */}
            <div className="bg-white rounded-2xl p-4 shadow-sm grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-2 block">{t('سن *', 'Age *')}</label>
                <input type="number" inputMode="numeric" min={16} max={80} value={form.age} onChange={e => set('age', e.target.value)}
                  placeholder="18"
                  className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 text-base font-medium outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-2 block">{t('جنسیت', 'Gender')}</label>
                <div className="relative">
                  <select value={form.gender} onChange={e => set('gender', e.target.value)}
                    className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-3 py-3 text-sm font-medium outline-none appearance-none bg-white">
                    <option value="">{t('انتخاب...', 'Select...')}</option>
                    <option value="male">{t('مرد', 'Male')}</option>
                    <option value="female">{t('زن', 'Female')}</option>
                    <option value="prefer_not_to_say">{t('ترجیح نمی‌دهم', 'Prefer not to say')}</option>
                  </select>
                  <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Location ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide block">{t('استان *', 'Province *')}</label>
              <div className="relative">
                <select value={form.province_id} onChange={e => set('province_id', +e.target.value)}
                  className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 appearance-none bg-white text-sm font-medium outline-none">
                  <option value={0}>{t('استان را انتخاب کنید', 'Select province')}</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{pName(p)}</option>)}
                </select>
                <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide block">{t('ناحیه *', 'District *')}</label>
              <div className="relative">
                <select value={form.district_id} onChange={e => set('district_id', +e.target.value)}
                  disabled={!form.province_id || loadingDistricts}
                  className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 appearance-none bg-white text-sm font-medium outline-none disabled:opacity-50">
                  <option value={0}>{loadingDistricts ? '...' : t('ناحیه را انتخاب کنید', 'Select district')}</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{dName(d)}</option>)}
                </select>
                <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <button onClick={handleGps}
              className={clsx('w-full flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed transition-colors',
                form.useGps ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blood/30')}>
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', form.useGps ? 'bg-green-100' : 'bg-gray-100')}>
                <MapPin className={clsx('w-5 h-5', form.useGps ? 'text-green-600' : 'text-gray-500')} />
              </div>
              <div className="text-start flex-1">
                <div className="font-semibold text-sm text-neutral-dark">{t('موقعیت GPS (اختیاری)', 'GPS Location (optional)')}</div>
                <div className="text-xs text-neutral-medium">
                  {form.useGps ? t('موقعیت ثبت شد ✓', '✓ Location captured') : t('برای پیدا کردن اهداکننده نزدیک‌تر', 'Helps find closer donors')}
                </div>
              </div>
              {form.useGps && <CheckCircle className="w-5 h-5 text-green-500" />}
            </button>
          </div>
        )}

        {/* ── Step 3: Donor Registration ────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => set('is_donor', !form.is_donor)}
              className={clsx('w-full rounded-2xl p-5 border-2 transition-all text-start',
                form.is_donor ? 'bg-red-50 border-blood shadow-lg' : 'bg-white border-gray-100')}>
              <div className="flex items-start gap-4">
                <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
                  form.is_donor ? 'bg-blood' : 'bg-gray-100')}>🩸</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-neutral-dark">{t('ثبت‌نام به عنوان اهداکننده', 'Register as Blood Donor')}</h3>
                    <div className={clsx('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      form.is_donor ? 'bg-blood border-blood' : 'border-gray-300')}>
                      {form.is_donor && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-medium mt-1">
                    {t('با ثبت‌نام به عنوان اهداکننده به نجات جان‌های انسانی کمک می‌کنید',
                       'By registering as a donor you help save human lives')}
                  </p>
                </div>
              </div>
            </button>

            {form.is_donor && (
              <div className="bg-green-50 rounded-2xl p-4 border border-green-200 animate-fade-in">
                <h4 className="font-bold text-green-800 text-sm mb-2">✅ {t('شرایط اهداکننده', 'Donor Requirements')}</h4>
                <ul className="space-y-1">
                  {(language === 'en'
                    ? ['Age 18–65 years','Weight ≥ 50 kg','No serious medical conditions','No donation in past 56 days']
                    : ['سن ۱۸ تا ۶۵ سال','وزن حداقل ۵۰ کیلوگرم','بدون بیماری جدی','آخرین اهدا بیش از ۵۶ روز پیش']
                  ).map(r => (
                    <li key={r} className="text-green-700 text-xs flex items-center gap-2"><span className="text-green-500">•</span>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h4 className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-3">{t('خلاصه', 'Summary')}</h4>
              <div className="space-y-2 text-sm">
                {[
                  [t('شماره تلفن','Phone'), form.phone],
                  [t('نام کامل','Full Name'), form.full_name],
                  [t('گروه خون','Blood Type'), form.blood_type],
                  [t('سن','Age'), form.age],
                  [t('ایمیل','Email'), form.email || t('—','—')],
                  [t('استان','Province'), provinces.find(p => p.id === form.province_id) ? pName(provinces.find(p => p.id === form.province_id)!) : '—'],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-neutral-medium">{label}</span>
                    <span className={clsx('font-semibold', label === t('گروه خون','Blood Type') ? 'text-blood font-black' : 'text-neutral-dark')}>{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 inset-x-0 px-4 py-4 bg-white border-t border-gray-100"
        style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}>
        <Button fullWidth loading={loading}
          onClick={step < 3 ? () => { if (validate()) setStep(s => s + 1) } : handleSubmit}>
          {step < 3 ? t('بعدی', 'Next') : t('تکمیل ثبت‌نام', 'Complete Registration')}
        </Button>
        {step === 1 && (
          <div className="text-center mt-3">
            <span className="text-sm text-neutral-medium">{t('قبلاً ثبت‌نام کرده‌اید؟ ', 'Already registered? ')}</span>
            <button onClick={() => navigate('/auth')} className="text-blood font-bold text-sm">{t('ورود', 'Sign In')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
