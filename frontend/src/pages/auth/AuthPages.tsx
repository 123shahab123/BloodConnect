import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Phone,
  Lock,
  ArrowRight,
  ChevronDown,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { authApi, userApi } from "../../services/api";
import { tokenStorage } from "../../services/api";
import { useAuthStore, useAppStore } from "../../store";
import clsx from "clsx";
import type { Language } from "../../types";

// ─── Language selector ────────────────────────────────────────────────────────
const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useAppStore();
  const [open, setOpen] = useState(false);
  const langs: { code: Language; label: string; flag: string }[] = [
    { code: "fa", label: "دری", flag: "🇦🇫" },
    { code: "ps", label: "پښتو", flag: "🇦🇫" },
    { code: "en", label: "English", flag: "🌐" },
  ];
  const current = langs.find((l) => l.code === language) || langs[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white text-sm font-medium">
        <span>{current.flag}</span><span>{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1 bg-white rounded-xl shadow-lg overflow-hidden z-20 min-w-[130px]">
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLanguage(l.code);
                setOpen(false);
              }}
              className={clsx(
                "w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors",
                l.code === language
                  ? "text-blood font-semibold"
                  : "text-neutral-dark",
              )}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Animated blood drop ──────────────────────────────────────────────────────
const BloodDrop: React.FC = () => (
  <div className="relative flex items-center justify-center">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="absolute w-24 h-24 rounded-full border-2 border-white/20 animate-wave"
        style={{ animationDelay: `${i * 0.6}s` }}
      />
    ))}
    <div className="relative w-24 h-24 gradient-blood rounded-full flex items-center justify-center shadow-2xl animate-heartbeat">
      <svg viewBox="0 0 48 56" className="w-12 h-12 fill-white">
        <path d="M24 4C24 4 4 20 4 34C4 45.05 13 52 24 52C35 52 44 45.05 44 34C44 20 24 4 24 4Z" />
      </svg>
    </div>
  </div>
);

// ─── Login Page ───────────────────────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useAppStore();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = (fa: string, en: string, ps?: string) =>
    language === "en" ? en : language === "ps" && ps ? ps : fa;

  const handleLogin = async () => {
    const cleanPhone = phone.trim().replace(/\s/g, "");
    if (cleanPhone.length < 7) {
      toast.error(
        t("شماره تلفن معتبر وارد کنید", "Enter a valid phone number"),
      );
      return;
    }
    if (!password) {
      toast.error(t("رمز عبور را وارد کنید", "Enter your password"));
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(cleanPhone, password);
      const { access_token, user } = res.data.data;
      tokenStorage.set(access_token);
      setAuth(access_token, user);
      navigate("/home", { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        t("خطا در ورود. دوباره تلاش کنید.", "Login failed. Please try again.");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg,#C0392B 0%,#922B21 45%,#1a1a2e 100%)",
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 pt-4"
        style={{ paddingTop: "calc(16px + var(--safe-top))" }}
      >
        <span className="text-white/50 text-xs font-medium">BloodConnect</span>
        <LanguageSelector />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-6 pb-4">
        <BloodDrop />
        <div className="mt-8 text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">
            BloodConnect
          </h1>
          <p className="text-white/80 text-base mt-2 font-medium">
            {t(
              "یک قطره خون، یک زندگی نجات یافته",
              "One drop of blood, one life saved",
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-8 bg-white/10 backdrop-blur rounded-2xl px-6 py-4">
          {[
            { value: "34", label: t("ولایت", "Provinces") },
            { value: "24/7", label: t("فعال", "Active") },
            { value: "🩸", label: t("اهدای خون", "Blood Donation") },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-white font-black text-xl">{s.value}</div>
              <div className="text-white/70 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Login card */}
      <div
        className="bg-white rounded-t-3xl px-5 pt-7 pb-8"
        style={{ paddingBottom: "calc(32px + var(--safe-bottom))" }}
      >
        <h2 className="text-xl font-bold text-neutral-dark mb-1">
          {t("ورود به حساب کاربری", "Sign In")}
        </h2>
        <p className="text-neutral-medium text-sm mb-6">
          {t(
            "با شماره تلفن و رمز عبور وارد شوید",
            "Sign in with your phone number and password",
          )}
        </p>

        <div className="space-y-4">
          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-neutral-medium block mb-1.5">
              {t("شماره تلفن", "Phone Number")}
            </label>
            <div className="relative">
              <div className="absolute start-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-neutral-dark">
                <span className="text-base">🇦🇫</span>
                <span className="font-semibold text-sm">+93</span>
                <div className="w-px h-5 bg-gray-200" />
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/[^0-9+\s]/g, ""))
                }
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="7XX XXX XXXX"
                autoFocus
                className="w-full ps-[88px] pe-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-blood outline-none text-base font-semibold text-neutral-dark min-h-[52px] transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-neutral-medium block mb-1.5">
              {t("رمز عبور", "Password")}
            </label>
            <div className="relative">
              <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="w-full ps-10 pe-12 py-3.5 rounded-2xl border-2 border-gray-200 focus:border-blood outline-none text-base font-medium text-neutral-dark min-h-[52px] transition-colors"
              />
              <button
                onClick={() => setShowPass((v) => !v)}
                className="absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-400 p-1"
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading || phone.length < 7 || !password}
          className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blood text-white font-bold text-base disabled:opacity-50 active:scale-95 transition-all"
          style={{ boxShadow: "0 4px 14px rgba(192,57,43,.4)" }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>{t("ورود", "Sign In")}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Register link */}
        <div className="text-center mt-5">
          <span className="text-sm text-neutral-medium">
            {t("حساب کاربری ندارید؟ ", "Don't have an account? ")}
          </span>
          <button
            onClick={() => navigate("/register")}
            className="text-blood font-bold text-sm"
          >
            {t("ثبت‌نام کنید", "Register")}
          </button>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 mt-4 justify-center text-xs text-gray-400">
          <Shield className="w-3.5 h-3.5" />
          <span>
            {t(
              "اطلاعات شما کاملاً رمزنگاری شده است",
              "Your data is fully encrypted",
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

// Keep OtpScreen as a redirect for backward compat
export const PhoneScreen = LoginPage;
export const OtpScreen: React.FC = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate("/auth", { replace: true });
  }, []);
  return null;
};
