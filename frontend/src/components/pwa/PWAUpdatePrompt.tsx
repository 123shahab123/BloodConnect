import React, { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useAppStore } from "../../store";
import { makeLangPicker } from "../../i18n/lang";

export default function PWAUpdatePrompt() {
  const { language } = useAppStore();
  const la = makeLangPicker(language);
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (!r) return;
      setInterval(async () => {
        try {
          await r.update();
        } catch (err) {
          console.warn("Service worker update failed:", err);
        }
      }, 60_000);
    },
    onRegisterError(err) {
      console.warn("Failed to register service worker:", err);
    },
  });

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-[80px] left-4 right-4 z-50 animate-slide-up">
      <div className="bg-neutral-dark text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
        <RefreshCw className="w-5 h-5 flex-shrink-0 text-green-400" />
        <p className="flex-1 text-sm font-medium">
          {la("نسخه جدید موجود است", "New version available")}
        </p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="bg-white text-neutral-dark text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
        >
          {la("به‌روزرسانی", "Update")}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
