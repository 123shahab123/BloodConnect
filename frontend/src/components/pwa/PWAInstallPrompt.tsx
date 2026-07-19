import React, { useEffect, useState } from "react";
import { Download, Check, Smartphone, Share } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../store";
import { pwaInstall } from "../../lib/pwaInstall";
import { makeLangPicker } from "../../i18n/lang";

export default function PWAInstallPrompt() {
  const { language } = useAppStore();
  const la = makeLangPicker(language);

  const [installed, setInstalled] = useState(pwaInstall.isInstalled);
  const [canPrompt, setCanPrompt] = useState(pwaInstall.canPromptInstall);
  const [installing, setInstalling] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Re-sync in case the event/flag arrived before this component mounted
    setInstalled(pwaInstall.isInstalled);
    setCanPrompt(pwaInstall.canPromptInstall);

    return pwaInstall.subscribe(() => {
      setInstalled(pwaInstall.isInstalled);
      setCanPrompt(pwaInstall.canPromptInstall);
    });
  }, []);

  const handleInstallClick = async () => {
    if (pwaInstall.isIOS()) {
      setShowIosGuide(true);
      return;
    }
    if (!canPrompt) {
      toast(
        la(
          "مرورگر شما هنوز نصب مستقیم را ارائه نداده — چند ثانیه صبر کنید یا صفحه را رفرش کنید",
          "Your browser hasn't offered direct install yet — wait a few seconds or refresh the page",
        ),
        { icon: "⏳" },
      );
      return;
    }

    setInstalling(true);
    try {
      await pwaInstall.promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  const handleOpenApp = () => {
    // Browsers don't expose a JS API for a site to force-focus its own
    // already-installed app from a regular tab — that's a security boundary
    // every browser enforces. Reloading the scoped start_url is the correct
    // behavior; Chrome/Edge show their own "open app" affordance for
    // installed PWAs automatically once this state is detected.
    window.location.href = "/";
  };

  // ── Already installed ────────────────────────────────────────────────────
  if (installed) {
    return (
      <button
        onClick={handleOpenApp}
        className="fixed top-4 end-4z z-[60] flex items-center gap-1.5 rounded-full
                   bg-white border border-gray-200 px-3.5 py-2 text-xs font-bold
                   text-neutral-dark shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Check className="w-3.5 h-3.5 text-success" />
        {la("مشاهده در اپ", "Open in App")}
      </button>
    );
  }

  const isIOS = pwaInstall.isIOS();
  // Real one-click install is available now, OR it's iOS (tapping opens the
  // only guide Apple allows). Otherwise we still show the button — Chrome
  // may fire the install event a few seconds after load — it just prompts
  // once the browser is ready instead of doing nothing.
  const label = installing
    ? la("در حال نصب…", "Installing…")
    : la("نصب اپلیکیشن", "Install app");

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={installing}
        className="fixed top-4 end-4 z-[60] flex items-center gap-1.5 rounded-full
                   bg-gradient-to-br from-blood to-blood-dark px-3.5 py-2 text-xs font-bold
                   text-white shadow-[0_6px_18px_rgba(192,57,43,0.4)] transition-transform
                   hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
        aria-label={label}
      >
        {installing ? (
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        {label}
      </button>

      {showIosGuide && (
        <IosGuideSheet la={la} onClose={() => setShowIosGuide(false)} />
      )}
    </>
  );
}

// ─── iOS manual guide — Apple gives Safari zero programmatic install API,
//    so Share → Add to Home Screen is the only path that exists on iOS. ───
function IosGuideSheet({
  la,
  onClose,
}: {
  la: (fa: string, en: string, ps?: string) => string;
  onClose: () => void;
}) {
  const steps = [
    {
      icon: <Share className="w-5 h-5 text-blue-500" />,
      fa: "دکمه اشتراک‌گذاری را در پایین Safari بزنید",
      en: "Tap the Share button at the bottom of Safari",
    },
    {
      icon: <Smartphone className="w-5 h-5 text-blue-500" />,
      fa: "«افزودن به صفحه اصلی» را انتخاب کنید",
      en: 'Select "Add to Home Screen"',
    },
    {
      icon: <span className="text-lg">✅</span>,
      fa: "روی «افزودن» بزنید — تمام!",
      en: 'Tap "Add" — done!',
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-[28px] px-6 pt-3 pb-6 pb-safe shadow-2xl animate-slide-up">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-neutral-dark">
              {la("نصب بر روی iPhone", "Add to Home Screen")}
            </h2>
            <p className="text-xs text-neutral-medium mt-0.5">
              {la(
                "iOS اجازه نصب مستقیم را نمی‌دهد — این تنها راه اپل است",
                "iOS doesn't allow direct install — this is Apple's only supported path",
              )}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blood to-blood-dark flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-white text-xl">🩸</span>
          </div>
        </div>
        <div className="space-y-3 mb-5">
          {steps.map(({ icon, fa, en }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-neutral-light rounded-xl px-3.5 py-3"
            >
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 text-xs font-bold text-blood shadow-sm">
                {i + 1}
              </div>
              <div className="flex items-center gap-2 flex-1">
                {icon}
                <p className="text-sm text-neutral-dark">{la(fa, en)}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-neutral-light text-sm font-semibold text-neutral-medium"
        >
          {la("بستن", "Close")}
        </button>
      </div>
    </div>
  );
}
