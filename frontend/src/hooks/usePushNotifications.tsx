import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { deleteToken, getToken, onMessage } from "firebase/messaging";
import {
  firebaseConfig,
  getMessagingInstance,
  isFirebaseConfigured,
  vapidKey,
} from "../lib/firebase";
import { userApi } from "../services/api";
import { useAppStore } from "../store";
import { makeLangPicker } from "../i18n/lang";

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

/**
 * Registers /firebase-messaging-sw.js, passing the Firebase web config as
 * query params (these are public, non-secret identifiers — see firebase.ts).
 * Re-uses an existing registration if one is already active at that scope.
 */
async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration> {
  const qs = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
  const scope = "/firebase-messaging/";
  const existing = await navigator.serviceWorker.getRegistration(scope);
  if (existing) return existing;

  return navigator.serviceWorker.register(
    `/firebase-messaging/firebase-messaging-sw.js?${qs.toString()}`,
    { scope },
  );
}

export function usePushNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, pushEnabled, setPushEnabled } = useAppStore();
  const la = makeLangPicker(language);

  const [permission, setPermission] = useState<PushPermissionState>(() => {
    if (!isFirebaseConfigured || typeof window === "undefined")
      return "unsupported";
    if (!("Notification" in window) || !("serviceWorker" in navigator))
      return "unsupported";
    return Notification.permission as PushPermissionState;
  });
  const [isBusy, setIsBusy] = useState(false);
  const foregroundUnsubRef = useRef<(() => void) | null>(null);

  const isSupported = permission !== "unsupported";
  // "Enabled" reflects the user's intent (persisted) AND that the browser
  // permission actually still backs it up — if the user revoked permission
  // via browser site settings, we shouldn't keep showing the toggle as on.
  const isEnabled = pushEnabled && permission === "granted";

  /** Pulls the current FCM token and saves it to the backend. */
  const syncToken = useCallback(async (): Promise<boolean> => {
    const messaging = await getMessagingInstance();
    if (!messaging) return false;

    try {
      const registration = await registerMessagingServiceWorker();
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) return false;
      await userApi.updateFcmToken(token);
      return true;
    } catch (err) {
      console.error("Push notification token sync failed:", err);
      return false;
    }
  }, []);

  /** Explicit user action — request permission, then sync the token. */
  const enable = useCallback(async () => {
    if (!isSupported) {
      toast.error(
        la(
          "این مرورگر از اعلان‌ها پشتیبانی نمی‌کند",
          "This browser does not support push notifications",
        ),
      );
      return;
    }

    if (permission === "denied") {
      toast.error(
        la(
          "اعلان‌ها مسدود شده‌اند. لطفاً از تنظیمات مرورگر برای این سایت اجازه دهید.",
          "Notifications are blocked. Please allow them for this site in your browser settings.",
        ),
        { duration: 5000 },
      );
      return;
    }

    setIsBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== "granted") {
        toast(
          la("اجازه اعلان داده نشد", "Notification permission was not granted"),
          { icon: "🔕" },
        );
        return;
      }

      const ok = await syncToken();
      if (ok) {
        setPushEnabled(true);
        toast.success(
          la("اعلان‌ها فعال شد 🔔", "Push notifications enabled 🔔"),
        );
      } else {
        toast.error(
          la(
            "فعال‌سازی اعلان‌ها ناموفق بود",
            "Could not enable push notifications",
          ),
        );
      }
    } finally {
      setIsBusy(false);
    }
  }, [isSupported, permission, syncToken, setPushEnabled, la]);

  /** Explicit user action — stop receiving pushes on this device. */
  const disable = useCallback(async () => {
    setIsBusy(true);
    try {
      const messaging = await getMessagingInstance();
      if (messaging) {
        try {
          await deleteToken(messaging);
        } catch {
          /* token may already be gone */
        }
      }
      await userApi.updateFcmToken(null);
      setPushEnabled(false);
      toast(la("اعلان‌ها غیرفعال شد", "Push notifications disabled"), {
        icon: "🔕",
      });
    } finally {
      setIsBusy(false);
    }
  }, [la, setPushEnabled]);

  /** Single entry point for the UI toggle. */
  const toggle = useCallback(() => {
    if (isEnabled) return disable();
    return enable();
  }, [isEnabled, enable, disable]);

  // On mount, reconcile persisted intent with reality:
  // - if previously enabled and permission still granted → silently
  //   re-sync the token (tokens can rotate/expire between sessions)
  // - if previously enabled but permission is no longer granted (revoked
  //   via browser settings) → clear the stale local flag
  useEffect(() => {
    if (pushEnabled && permission === "granted") {
      syncToken();
    } else if (pushEnabled && permission !== "granted") {
      setPushEnabled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  // Foreground message handling — show a toast and refresh relevant data,
  // since the browser won't show a system notification for a tab that's
  // currently open and focused (that's expected/standard FCM behavior).
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;

    getMessagingInstance().then((messaging) => {
      if (!messaging || cancelled) return;

      const unsub = onMessage(messaging, (payload) => {
        const title = payload.data?.title || "BloodConnect";
        const body = payload.data?.body || "";
        const type = payload.data?.type;
        // notification_id = DonorNotification.id  → /donate/:notifId
        // request_id      = BloodRequest.id        → /requests/:id
        const notifId = payload.data?.notification_id;
        const requestId = payload.data?.request_id;

        const getTargetPath = () => {
          if (type === "new_blood_request" && notifId)
            return `/donate/${notifId}`;
          if (
            (type === "donor_accepted" || type === "donor_found") &&
            requestId
          )
            return `/requests/${requestId}`;
          return null;
        };

        const systemNotificationPath = getTargetPath();

        toast(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                const path = systemNotificationPath;
                if (path) navigate(path);
              }}
              className="cursor-pointer"
            >
              <div className="font-bold text-sm">{title}</div>
              {body && (
                <div className="text-xs text-neutral-medium mt-0.5">{body}</div>
              )}
              {systemNotificationPath && (
                <div className="text-xs text-blood mt-1 font-semibold">
                  Tap to view →
                </div>
              )}
            </div>
          ),
          { icon: "🩸", duration: 6000 },
        );

        if (Notification.permission === "granted") {
          try {
            const notification = new Notification(title, {
              body,
              icon: "/icons/icon-192.png",
              data: { url: systemNotificationPath },
              tag: type || "bloodconnect-notification",
            });

            notification.onclick = (event) => {
              event.preventDefault();
              notification.close();
              if (systemNotificationPath) {
                navigate(systemNotificationPath);
              }
            };
          } catch (err) {
            console.warn(
              "Could not show system notification for foreground push:",
              err,
            );
          }
        }

        if (type === "new_blood_request") {
          queryClient.invalidateQueries({
            queryKey: ["incoming-notifications"],
          });
        } else if (type === "donor_accepted" || type === "donor_found") {
          queryClient.invalidateQueries({ queryKey: ["my-requests-home"] });
        }
        queryClient.invalidateQueries({ queryKey: ["in-app-notifs"] });
      });

      foregroundUnsubRef.current = unsub;
    });

    return () => {
      cancelled = true;
      foregroundUnsubRef.current?.();
      foregroundUnsubRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isSupported,
    isConfigured: isFirebaseConfigured,
    permission,
    isEnabled,
    isBusy,
    enable,
    disable,
    toggle,
  };
}
