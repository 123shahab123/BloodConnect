import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Clock,
  Droplets,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifApi } from "../services/api";
import { useAppStore } from "../store";
import {
  BloodTypeBadge,
  UrgencyBadge,
  CountdownTimer,
  Button,
  LoadingSpinner,
  ScreenHeader,
} from "../components/ui";
import clsx from "clsx";
import type { BloodType, Urgency } from "../types";

interface NotifData {
  notification: {
    id: number;
    wave: number;
    response: string;
    response_window_ends_at: string;
    score: number;
  };
  request: {
    id: number;
    blood_type_needed: BloodType;
    urgency: Urgency;
    notes?: string | null;
    units_needed: number;
    donors_accepted: number;
    status: string;
    province_id: number;
    district_id: number;
    province_name: { en: string; fa: string; ps: string };
    district_name: { en: string; fa: string; ps: string };
    distance_km?: number | null;
  };
}

export default function NotifDetailPage() {
  const { notifId } = useParams<{ notifId: string }>();
  const navigate = useNavigate();
  const { language } = useAppStore();
  const qc = useQueryClient();
  const [confirmed, setConfirmed] = useState<"accepted" | "declined" | null>(
    null,
  );

  const la = (fa: string, en: string, ps?: string) =>
    language === "en" ? en : language === "ps" && ps ? ps : fa;

  const { data, isLoading } = useQuery({
    queryKey: ["notif-detail", notifId],
    queryFn: () =>
      notifApi
        .getNotifRequest(Number(notifId))
        .then((r) => r.data.data as NotifData),
    enabled: !!notifId,
    staleTime: 0,
  });

  const respondMutation = useMutation({
    mutationFn: (response: "accepted" | "declined") =>
      notifApi.respond(Number(notifId), response).then((r) => r.data),
    onSuccess: (_, response) => {
      setConfirmed(response);
      qc.invalidateQueries({ queryKey: ["incoming-notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-detail", notifId] });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        la("خطایی رخ داد", "Something went wrong");
      toast.error(msg);
    },
  });

  if (isLoading)
    return (
      <div className="screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (!data)
    return (
      <div className="screen items-center justify-center px-6">
        <div className="text-5xl mb-4">😕</div>
        <p className="text-neutral-medium text-center text-sm">
          {la(
            "اعلان یافت نشد یا منقضی شده است.",
            "Notification not found or expired.",
          )}
        </p>
        <button
          onClick={() => navigate("/donate")}
          className="mt-5 text-blood font-semibold text-sm"
        >
          {la("بازگشت", "Go Back")}
        </button>
      </div>
    );

  const { notification, request } = data;
  const isExpired = new Date(notification.response_window_ends_at) < new Date();
  const alreadyResponded = notification.response !== "pending";

  const districtLabel =
    language === "fa"
      ? request.district_name.fa
      : language === "ps"
        ? request.district_name.ps
        : request.district_name.en;

  const provinceLabel =
    language === "fa"
      ? request.province_name.fa
      : language === "ps"
        ? request.province_name.ps
        : request.province_name.en;

  // ── Success: accepted ──────────────────────────────────────────────────────
  if (confirmed === "accepted") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-neutral-light">
        <div className="text-center animate-scale-in">
          <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-14 h-14 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-neutral-dark mb-3">
            {la("ممنون! 🤝", "Thank You! 🤝")}
          </h2>
          <p className="text-neutral-medium text-sm mb-6 leading-relaxed">
            {la(
              "پذیرش شما ثبت شد. درخواست‌کننده اطلاع‌رسانی شد و به زودی با شما تماس خواهد گرفت.",
              "Your acceptance was recorded. The requester has been notified and will contact you shortly.",
            )}
          </p>

          <div className="bg-white rounded-2xl p-5 text-start mb-6 shadow-sm w-full">
            <p className="text-xs font-bold text-neutral-medium uppercase tracking-wide mb-3">
              {la("یادآوری‌های مهم", "Important Reminders")}
            </p>
            <ul className="space-y-2">
              {(language === "en"
                ? [
                    "💧 Drink 2-3 glasses of water before donating",
                    "🍽️ Eat a light meal 2 hours before",
                    "😴 Get enough sleep the night before",
                    "🪪 Bring a valid ID if possible",
                  ]
                : [
                    "💧 قبل از اهدا ۲-۳ لیوان آب بنوشید",
                    "🍽️ ۲ ساعت قبل از اهدا یک وعده سبک بخورید",
                    "😴 شب قبل به اندازه کافی بخوابید",
                    "🪪 اگر ممکن است کارت شناسایی همراه داشته باشید",
                  ]
              ).map((item) => (
                <li
                  key={item}
                  className="text-xs text-neutral-dark flex items-start gap-2"
                >
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={() => navigate("/home")} fullWidth>
            {la("بازگشت به خانه", "Back to Home")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Success: declined ──────────────────────────────────────────────────────
  if (confirmed === "declined") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-neutral-light">
        <div className="text-center">
          <div className="text-6xl mb-5">👍</div>
          <h2 className="text-xl font-bold text-neutral-dark mb-2">
            {la("پاسخ ثبت شد", "Response Recorded")}
          </h2>
          <p className="text-neutral-medium text-sm mb-6">
            {la(
              "اشکالی ندارد. سایر اهداکنندگان را مطلع می‌کنیم. ممنون که پاسخ دادید.",
              "No problem. We will notify other donors. Thank you for responding.",
            )}
          </p>
          <Button
            onClick={() => navigate("/donate")}
            fullWidth
            variant="secondary"
          >
            {la("بازگشت", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Main detail view ───────────────────────────────────────────────────────
  return (
    <div className="screen">
      <ScreenHeader
        title={la("درخواست اهدای خون", "Blood Donation Request")}
        onBack={() => navigate("/donate")}
        gradient
      />

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{
          paddingBottom: alreadyResponded || isExpired ? "24px" : "100px",
        }}
      >
        {/* Warning banner if expired or already responded */}
        {(isExpired || alreadyResponded) && (
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700 font-medium">
              {isExpired
                ? la(
                    "پنجره پاسخ منقضی شده است.",
                    "Response window has expired.",
                  )
                : la(
                    `قبلاً پاسخ داده‌اید: ${notification.response}`,
                    `Already responded: ${notification.response}`,
                  )}
            </p>
          </div>
        )}

        {/* Blood type hero card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
          <BloodTypeBadge
            type={request.blood_type_needed}
            size="xl"
            className="mx-auto mb-4"
          />
          <div className="flex justify-center mb-3">
            <UrgencyBadge urgency={request.urgency} lang={language} />
          </div>
          <p className="text-neutral-medium text-sm">
            {request.units_needed}{" "}
            {la("واحد خون مورد نیاز", "unit(s) of blood needed")}
          </p>
          {request.donors_accepted > 0 && (
            <p className="text-green-600 text-xs mt-1 font-semibold">
              ✓ {request.donors_accepted}{" "}
              {la("اهداکننده قبلاً قبول کرده", "donor(s) already accepted")}
            </p>
          )}
        </div>

        {/* Request details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <DetailRow
            icon={<MapPin className="w-4 h-4 text-blood" />}
            label={la("موقعیت", "Location")}
            value={
              <span>
                {districtLabel}, {provinceLabel}
                {request.distance_km != null && (
                  <span className="text-blood ms-2 font-bold">
                    · {Math.round(request.distance_km)} km
                  </span>
                )}
              </span>
            }
          />
          <div className="border-t border-gray-50" />
          <DetailRow
            icon={<Clock className="w-4 h-4 text-blood" />}
            label={la("مهلت پاسخ", "Response Window")}
            value={
              isExpired ? (
                <span className="text-red-500 text-xs">
                  {la("منقضی شد", "Expired")}
                </span>
              ) : (
                <CountdownTimer endsAt={notification.response_window_ends_at} />
              )
            }
          />
          <div className="border-t border-gray-50" />
          <DetailRow
            icon={<Droplets className="w-4 h-4 text-blood" />}
            label={la("موج اطلاع‌رسانی", "Matching Wave")}
            value={`${la("موج", "Wave")} ${notification.wave}`}
          />
          <div className="border-t border-gray-50" />
          <DetailRow
            icon={<span className="text-sm">📊</span>}
            label={la("امتیاز تطابق", "Match Score")}
            value={
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blood rounded-full"
                    style={{
                      width: `${Math.round(notification.score * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-neutral-medium">
                  {Math.round(notification.score * 100)}%
                </span>
              </div>
            }
          />
          {request.notes && (
            <>
              <div className="border-t border-gray-50" />
              <div>
                <p className="text-xs text-neutral-medium font-semibold mb-1">
                  {la("یادداشت", "Notes")}
                </p>
                <p className="text-sm text-neutral-dark leading-relaxed">
                  {request.notes}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Privacy info */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-xs text-blue-700 font-bold mb-1">
            🔒 {la("حریم خصوصی", "Privacy Note")}
          </p>
          <p className="text-xs text-blue-600 leading-relaxed">
            {la(
              "شماره تلفن شما فقط پس از قبول درخواست به درخواست‌کننده نشان داده می‌شود.",
              "Your phone number is only shared with the requester after you accept.",
            )}
          </p>
        </div>
      </div>

      {/* Action buttons — only when pending and not expired */}
      {!isExpired && !alreadyResponded && (
        <div
          className="fixed inset-x-0 px-4 pt-3 pb-4 bg-white border-t border-gray-100 z-50"
          style={{
            bottom: "calc(60px + var(--safe-bottom, 0px))",
            paddingBottom: "calc(16px + var(--safe-bottom, 0px))",
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => respondMutation.mutate("declined")}
              loading={respondMutation.isPending}
              icon={<XCircle className="w-5 h-5" />}
            >
              {la("نمی‌توانم", "Can't Help")}
            </Button>
            <Button
              onClick={() => respondMutation.mutate("accepted")}
              loading={respondMutation.isPending}
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              {la("می‌توانم کمک کنم", "I Can Help")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-neutral-medium font-medium flex-shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-neutral-dark text-end">
        {value}
      </div>
    </div>
  );
}
