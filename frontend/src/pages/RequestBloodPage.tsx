import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Phone, MapPin, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { requestApi, userApi } from '../services/api'
import { useAuthStore, useAppStore } from '../store'
import { Button, StepIndicator } from '../components/ui'
import type { BloodType, Urgency, Province, District } from '../types'
import { makeLangPicker, pickLang } from '../i18n/lang'
import clsx from 'clsx'

const BLOOD_TYPES: BloodType[] = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

const URGENCY_INFO = {
  critical: { icon:'🚨', colorClass:'border-red-400 bg-red-50', labelFa:'بحرانی – چند ساعت', labelEn:'Critical – Within hours', labelPs:'بحراني - څو ساعته', descFa:'اورژانسی، بیمار در خطر جدی است', descEn:'Emergency, patient is in serious danger', descPs:'بیړنی حالت، ناروغ په جدي خطر کې دی' },
  urgent:   { icon:'⚠️', colorClass:'border-orange-400 bg-orange-50', labelFa:'فوری – ۲۴ ساعت', labelEn:'Urgent – 24 hours', labelPs:'عاجل - ۲۴ ساعته', descFa:'فوری، درمان در آینده نزدیک مورد نیاز است', descEn:'Urgent, treatment needed soon', descPs:'عاجل، ژر درملنې ته اړتیا ده' },
  planned:  { icon:'📅', colorClass:'border-blue-400 bg-blue-50', labelFa:'برنامه‌ریزی – ۳ روز', labelEn:'Planned – 3 days', labelPs:'مخکې له وخته - ۳ ورځې', descFa:'برنامه‌ریزی شده، زمان کافی وجود دارد', descEn:'Planned, sufficient time available', descPs:'مخکې پلان شوی، کافي وخت شته' },
}

export default function RequestBloodPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { language } = useAppStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  // form uses camelCase internally — converted to snake_case only when submitting
  const [form, setForm] = useState({
    bloodType: '' as BloodType | '',
    urgency: '' as Urgency | '',
    provinceId: user?.province_id || 0,
    districtId: user?.district_id || 0,
    unitsNeeded: 1,
    contactPhone: '',
    notes: '',
    lat: null as number | null,
    lng: null as number | null,
    useGps: false,
  })

  const sf = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const la = makeLangPicker(language)

  useEffect(() => {
    userApi.getProvinces().then(r => setProvinces(r.data.data.provinces))
    if (form.provinceId) userApi.getDistricts(form.provinceId).then(r => setDistricts(r.data.data.districts))
  }, [])

  useEffect(() => {
    if (form.provinceId) {
      userApi.getDistricts(form.provinceId).then(r => {
        setDistricts(r.data.data.districts)
        sf('districtId', 0)
      })
    }
  }, [form.provinceId])

  const pName = (p: Province) => language === 'fa' ? p.name_fa : language === 'ps' ? p.name_ps : p.name_en
  const dName = (d: District) => language === 'fa' ? d.name_fa : language === 'ps' ? d.name_ps : d.name_en

  const validate = (): boolean => {
    if (step === 1) {
      if (!form.bloodType) { toast.error(la('گروه خون را انتخاب کنید', 'Select blood type')); return false }
      if (!form.urgency)   { toast.error(la('سطح فوریت را انتخاب کنید', 'Select urgency level')); return false }
    }
    if (step === 2) {
      if (!form.provinceId)   { toast.error(la('استان را انتخاب کنید', 'Select province')); return false }
      if (!form.districtId)   { toast.error(la('ناحیه را انتخاب کنید', 'Select district')); return false }
      if (!form.contactPhone.trim()) { toast.error(la('شماره تماس الزامی است', 'Contact phone required')); return false }
    }
    return true
  }

  const handleGps = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => { sf('lat', pos.coords.latitude); sf('lng', pos.coords.longitude); sf('useGps', true); toast.success(la('موقعیت ثبت شد!', 'Location captured!')) },
      () => toast.error(la('GPS در دسترس نیست', 'GPS unavailable'))
    )
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await requestApi.create({
        blood_type_needed: form.bloodType,
        urgency:           form.urgency,
        province_id:       form.provinceId,
        district_id:       form.districtId,
        units_needed:      form.unitsNeeded,
        contact_phone:     form.contactPhone,
        notes:             form.notes || null,
        lat:               form.lat,
        lng:               form.lng,
      })
      const id = res.data.data.request.id
      toast.success(la('🔍 درخواست ارسال شد! در جستجوی اهداکننده...', '🔍 Request submitted! Searching for donors...'), { duration: 5000 })
      navigate(`/requests/${id}`, { replace: true })
    } catch (err: any) {
      const msg = err.response?.data?.message || t('error.server')
      if (err.response?.data?.code === 'DUPLICATE_REQUEST') {
        toast.error(la('یک درخواست مشابه قبلاً فعال است.', 'A similar request is already active.'))
        navigate(`/requests/${err.response.data.existing_request_id}`)
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-light flex flex-col">
      {/* Header */}
      <div className="gradient-blood px-5 py-4 safe-top">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/requests')}
            className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <StepIndicator current={step} total={2} />
          <div className="w-10" />
        </div>
        <h1 className="text-2xl font-black text-white">{t('req.title')}</h1>
        <p className="text-white/80 text-sm mt-1">
          {step === 1 ? la('چه گروه خونی مورد نیاز است؟', 'What blood type is needed?')
                      : la('کجا و چطور تماس بگیریم؟', 'Where and how to contact?')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(100px + 68px + var(--safe-bottom, 0px))' }}>

        {/* ── Step 1: Blood Type + Urgency ── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {/* Blood type */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-3 block">{t('req.blood_type')}</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_TYPES.map(bt => (
                  <button key={bt} onClick={() => sf('bloodType', bt)}
                    className={clsx('py-3 rounded-xl border-2 font-black text-sm transition-all active:scale-95',
                      form.bloodType === bt ? 'bg-blood border-blood text-white shadow-lg scale-105'
                                            : 'border-gray-100 bg-gray-50 text-neutral-dark hover:border-blood/30')}>
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-3 block">{t('req.urgency')}</label>
              <div className="space-y-2">
                {(Object.entries(URGENCY_INFO) as [Urgency, typeof URGENCY_INFO.critical][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => sf('urgency', key)}
                    className={clsx('w-full rounded-xl border-2 p-3 text-start transition-all',
                      form.urgency === key ? cfg.colorClass + ' shadow-sm' : 'border-gray-100 bg-gray-50 hover:border-gray-200')}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cfg.icon}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-neutral-dark">{pickLang(language, { en: cfg.labelEn, fa: cfg.labelFa, ps: cfg.labelPs })}</div>
                        <div className="text-xs text-neutral-medium">{pickLang(language, { en: cfg.descEn, fa: cfg.descFa, ps: cfg.descPs })}</div>
                      </div>
                      {form.urgency === key && (
                        <div className="w-5 h-5 rounded-full bg-blood flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Units */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-3 block">{t('req.units')}</label>
              <div className="flex items-center gap-4 justify-center">
                <button onClick={() => sf('unitsNeeded', Math.max(1, form.unitsNeeded - 1))}
                  className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-neutral-dark active:bg-gray-200">−</button>
                <span className="text-3xl font-black text-blood w-12 text-center">{form.unitsNeeded}</span>
                <button onClick={() => sf('unitsNeeded', Math.min(10, form.unitsNeeded + 1))}
                  className="w-12 h-12 rounded-xl bg-blood/10 flex items-center justify-center text-2xl font-bold text-blood active:bg-blood/20">+</button>
              </div>
              <p className="text-center text-xs text-neutral-medium mt-2">{la('۱ واحد ≈ ۴۵۰ میلی‌لیتر خون کامل', '1 unit ≈ 450ml whole blood')}</p>
            </div>
          </div>
        )}

        {/* ── Step 2: Location + Contact ── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            {/* Location */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide block">{t('req.location')}</label>
              <div className="relative">
                <select value={form.provinceId} onChange={e => sf('provinceId', +e.target.value)}
                  className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 appearance-none bg-white text-sm font-medium outline-none">
                  <option value={0}>{la('استان', 'Province')}</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{pName(p)}</option>)}
                </select>
                <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={form.districtId} onChange={e => sf('districtId', +e.target.value)} disabled={!form.provinceId}
                  className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 appearance-none bg-white text-sm font-medium outline-none disabled:opacity-50">
                  <option value={0}>{la('ناحیه', 'District')}</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{dName(d)}</option>)}
                </select>
                <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button onClick={handleGps}
                className={clsx('w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors',
                  form.useGps ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-neutral-medium hover:border-blood/30')}>
                <MapPin className="w-4 h-4" />
                {form.useGps ? la('✓ موقعیت GPS ثبت شد', '✓ GPS location set') : la('موقعیت GPS (اختیاری)', 'GPS Location (optional)')}
              </button>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-2 block">{t('req.contact')}</label>
              <div className="relative">
                <Phone className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" inputMode="numeric" value={form.contactPhone}
                  onChange={e => sf('contactPhone', e.target.value)}
                  placeholder="+93 7XX XXX XXXX"
                  className="w-full ps-10 pe-4 py-3 border-2 border-gray-100 focus:border-blood rounded-xl text-sm font-medium outline-none transition-colors" />
              </div>
              <p className="text-xs text-neutral-medium mt-1">{la('فقط با اهداکنندگانی که قبول می‌کنند به اشتراک گذاشته می‌شود', 'Shared only with donors who accept')}</p>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-2 block">{t('req.notes')}</label>
              <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={3} maxLength={200}
                placeholder={t('req.notes_hint')}
                className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none transition-colors" />
              <p className="text-xs text-neutral-medium text-end">{form.notes.length}/200</p>
            </div>

            {/* Critical warning */}
            {form.urgency === 'critical' && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  {la('درخواست‌های بحرانی بلافاصله اهداکنندگان را در چندین موج هشدار می‌دهند. لطفاً فقط برای موارد اضطراری واقعی استفاده کنید.',
                      'Critical requests alert donors immediately across multiple waves. Only use for true emergencies.')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — positioned above the bottom nav (68px) */}
      <div className="fixed bottom-0 inset-x-0 px-4 pt-3 pb-3 bg-white border-t border-gray-100 z-40"
        style={{ paddingBottom: 'calc(12px + 68px + var(--safe-bottom, 0px))' }}>
        <Button fullWidth loading={loading}
          onClick={step < 2 ? () => { if (validate()) setStep(2) } : handleSubmit}>
          {step < 2 ? t('reg.next') : t('req.submit')}
        </Button>
      </div>
    </div>
  )
}
