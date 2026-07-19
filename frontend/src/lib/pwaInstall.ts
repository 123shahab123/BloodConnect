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

function markInstalled() {
  installed = true;
  deferredEvent = null;
  localStorage.setItem(INSTALLED_KEY, "1");
  notify();
}

// Initial synchronous check (covers "already installed" on this load)
if (isInStandaloneMode() || localStorage.getItem(INSTALLED_KEY) === "1") {
  installed = true;
}

window.addEventListener("beforeinstallprompt", (e: Event) => {
  e.preventDefault();
  deferredEvent = e as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener("appinstalled", () => markInstalled());

// Best-effort async check via getInstalledRelatedApps (Chrome/Edge only)
if (!installed && "getInstalledRelatedApps" in navigator) {
  (navigator as any)
    .getInstalledRelatedApps()
    .then((apps: unknown[]) => {
      if (apps && apps.length > 0) markInstalled();
    })
    .catch(() => {});
}

export const pwaInstall = {
  isIOS,
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
      markInstalled();
      return true;
    }
    notify();
    return false;
  },
};
