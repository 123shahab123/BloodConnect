// ─── PWA install state — captured at module load, not component mount ───────
// Chrome/Edge can fire `beforeinstallprompt` before React even renders.
// If we only listened inside a component's useEffect, an early event could
// be missed and the button would never appear. This module attaches its
// listener the moment it's imported (from main.tsx, first thing) and keeps
// the event around so any component can grab it later, no matter when it
// mounts.

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const INSTALLED_KEY = "bc_pwa_installed";

type Listener = () => void;

let deferredEvent: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<Listener>();

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as any).standalone === true)
  );
}

function notify() {
  listeners.forEach((fn) => fn());
}

function setInstalled(value: boolean) {
  installed = value;
  if (value) {
    deferredEvent = null;
    localStorage.setItem(INSTALLED_KEY, "1");
  } else {
    localStorage.removeItem(INSTALLED_KEY);
  }
  notify();
}

// Initial synchronous guess, used only until the real check below resolves.
// A previous "installed" flag can be stale (e.g. the user uninstalled the
// app since their last visit — uninstalling doesn't clear localStorage),
// so this is a starting assumption, not the final answer.
if (isInStandaloneMode() || localStorage.getItem(INSTALLED_KEY) === "1") {
  installed = true;
}

window.addEventListener("beforeinstallprompt", (e: Event) => {
  e.preventDefault();
  deferredEvent = e as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener("appinstalled", () => setInstalled(true));

// Authoritative real-time check (Chrome/Edge). Unlike the localStorage flag,
// this reflects whether the app is ACTUALLY installed right now — so it can
// both confirm an install and correct a stale flag after an uninstall.
// Currently running in standalone mode is left alone: that's already 100%
// certain truth and doesn't need re-checking.
if (!isInStandaloneMode() && "getInstalledRelatedApps" in navigator) {
  (navigator as any)
    .getInstalledRelatedApps()
    .then((apps: unknown[]) => {
      setInstalled(Boolean(apps && apps.length > 0));
    })
    .catch(() => {
      // Unsupported/failed check — leave the best-effort localStorage guess
      // as-is rather than assuming either state.
    });
}

export const pwaInstall = {
  isIOS,
  isInStandaloneMode,
  get isInstalled() {
    return installed;
  },
  get canPromptInstall() {
    return deferredEvent !== null;
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /** Trigger the browser's own native install dialog. Resolves true if installed. */
  async promptInstall(): Promise<boolean> {
    if (!deferredEvent) return false;
    const evt = deferredEvent;
    deferredEvent = null;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      return true;
    }
    notify();
    return false;
  },
};
