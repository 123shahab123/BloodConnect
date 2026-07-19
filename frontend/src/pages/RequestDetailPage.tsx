import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Star,
  MapPin,
  Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestApi } from "../services/api";
import { useAuthStore, useAppStore } from "../store";
import {
  BloodTypeBadge,
  UrgencyBadge,
  StatusBadge,
  Button,
  LoadingSpinner,
  BottomSheet,
  CountdownTimer,
  ScreenHeader,
} from "../components/ui";
import type { BloodRequest, Acceptance } from "../types";
import { makeLangPicker } from "../i18n/lang";
import clsx from "clsx";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { language } = useAppStore();
  const qc = useQueryClient();
  const [sheet, setSheet] = useState<"fulfill" | "cancel" | null>(null);

  const la = makeLangPicker(language);

  const { data: reqData, isLoading } = useQuery({
    queryKey: ["request-detail", id],
    queryFn: () =>
      requestApi
        .getById(Number(id))
        .then((r) => r.data.data.request as BloodRequest),
    refetchInterval: 15_000,
  });

  const { data: acceptData } = useQuery({
    queryKey: ["request-acceptances", id],
    queryFn: () =>
      requestApi
        .getAcceptances(Number(id))
        .then((r) => r.data.data.acceptances as Acceptance[]),
    enabled: !!reqData && reqData.donors_accepted > 0,
    refetchInterval: 15_000,
  });

  const fulfillMutation = useMutation({
    mutationFn: () => requestApi.fulfill(Number(id)),
    onSuccess: () => {
      toast.success(
        la("🎉 درخواست تکمیل شد. ممنون!", "🎉 Request fulfilled. Thank you!"),
      );
      qc.invalidateQueries({ queryKey: ["request-detail", id] });
      qc.invalidateQueries({ queryKey: ["my-requests-home"] });
      setSheet(null);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || la("خطایی رخ داد", "Error")),
  });

  const cancelMutation = useMutation({
    mutationFn: () => requestApi.cancel(Number(id)),
    onSuccess: () => {
      toast.success(la("درخواست لغو شد.", "Request cancelled."));
      qc.invalidateQueries({ queryKey: ["request-detail", id] });
      setSheet(null);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || la("خطایی رخ داد", "Error")),
  });

  if (isLoading)
    return (
      <div className="screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (!reqData)
    return (
      <div className="screen items-center justify-center px-6 text-center">
        <div className="text-4xl mb-4">😕</div>
        <p className="text-neutral-medium text-sm">
          {la("درخواست یافت نشد.", "Request not found.")}
        </p>
        <button
          onClick={() => navigate("/requests")}
          className="mt-4 text-blood font-semibold text-sm"
        >
          {la("بازگشت", "Go Back")}
        </button>
      </div>
    );

  const request = reqData;
  const acceptances = acceptData || [];
  const isActive = ["pending", "notified", "donor_found"].includes(
    request.status,
  );
  const canFulfill = isActive && request.donors_accepted > 0;
  const canCancel = isActive;

  return (
    <div className="screen">
      <ScreenHeader
        title={la("جزئیات درخواست", "Request Details")}
        onBack={() => navigate("/requests")}
        gradient
      />

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{
          paddingBottom:
            canFulfill || canCancel
              ? "calc(100px + var(--safe-bottom,0px))"
              : "24px",
        }}
      >
        {/* Hero card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <BloodTypeBadge type={request.blood_type_needed} size="lg" />
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                <UrgencyBadge urgency={request.urgency} lang={language} />
                <StatusBadge status={request.status} lang={language} />
              </div>
              <p className="text-sm text-neutral-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {request.district_name || request.province_name}
              </p>
              <p className="text-xs text-neutral-medium mt-1">
                {request.units_needed} {la("واحد مورد نیاز", "unit(s) needed")}
              </p>
            </div>
          </div>

          {/* Donor progress bar */}
          {isActive && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-neutral-medium mb-1.5">
                <span>{la("اهداکننده یافت شد", "Donors found")}</span>
                <span className="font-bold text-blood">
                  {request.donors_accepted}/{request.units_needed}
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blood rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (request.donors_accepted / request.units_needed) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Wave progress (active requests) */}
        {isActive && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                <span className="text-sm font-bold text-blue-800">
                  {la(
                    `موج ${request.current_wave} فعال`,
                    `Wave ${request.current_wave} Active`,
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-blue-600 font-medium">
                  {la("در جستجو...", "Searching...")}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((w) => (
                <div
                  key={w}
                  className={clsx(
                    "flex-1 h-2 rounded-full transition-all",
                    w < request.current_wave
                      ? "bg-blue-500"
                      : w === request.current_wave
                        ? "bg-blue-400 animate-pulse"
                        : "bg-blue-100",
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-blue-400 mt-1.5">
              <span>{la("ناحیه", "District")}</span>
              <span>{la("سراسری", "Nationwide")}</span>
            </div>
          </div>
        )}

        {/* Expires countdown */}
        {isActive && (
          <div className="bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100 flex items-center justify-between">
            <span className="text-sm text-orange-700 font-medium">
              {la("منقضی می‌شود در", "Expires in")}
            </span>
            <CountdownTimer endsAt={request.expires_at} />
          </div>
        )}

        {/* Accepted donors */}
        {acceptances.length > 0 && (
          <div>
            <h3 className="font-bold text-neutral-dark mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blood" />
              {la(
                `اهداکنندگان (${acceptances.length})`,
                `Donors (${acceptances.length})`,
              )}
            </h3>
            <div className="space-y-3">
              {acceptances.map((a) => (
                <DonorCard key={a.id} acceptance={a} />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {request.notes && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-neutral-medium font-semibold uppercase tracking-wide mb-1">
              {la("یادداشت", "Notes")}
            </p>
            <p className="text-sm text-neutral-dark leading-relaxed">
              {request.notes}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(canFulfill || canCancel) && (
        <div
          className="fixed inset-x-0 px-4 pt-3 bg-white border-t border-gray-100 z-50 space-y-2"
          style={{
            bottom: "calc(60px + var(--safe-bottom, 0px))",
            paddingBottom: "calc(12px + var(--safe-bottom, 0px))",
          }}
        >
          {canFulfill && (
            <Button
              fullWidth
              onClick={() => setSheet("fulfill")}
              icon={<CheckCircle className="w-5 h-5" />}
            >
              {la("به عنوان تکمیل شده علامت‌گذاری کنید", "Mark as Fulfilled")}
            </Button>
          )}
          {canCancel && (
            <Button
              fullWidth
              variant="secondary"
              onClick={() => setSheet("cancel")}
              icon={<XCircle className="w-5 h-5" />}
            >
              {la("لغو درخواست", "Cancel Request")}
            </Button>
          )}
        </div>
      )}

      {/* Fulfill confirm sheet */}
      <BottomSheet
        isOpen={sheet === "fulfill"}
        onClose={() => setSheet(null)}
        title={la("تکمیل درخواست؟", "Mark as Fulfilled?")}
      >
        <p className="text-sm text-neutral-medium mb-5 leading-relaxed">
          {la(
            "این تأیید می‌کند که خون با موفقیت اهدا شده. آمار اهداکنندگان بروزرسانی خواهد شد.",
            "This confirms blood was successfully donated. Donor stats will be updated.",
          )}
        </p>
        <div className="space-y-2">
          <Button
            fullWidth
            loading={fulfillMutation.isPending}
            onClick={() => fulfillMutation.mutate()}
          >
            {la("بله، تکمیل شد", "Yes, Fulfilled")}
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setSheet(null)}>
            {la("لغو", "Cancel")}
          </Button>
        </div>
      </BottomSheet>

      {/* Cancel confirm sheet */}
      <BottomSheet
        isOpen={sheet === "cancel"}
        onClose={() => setSheet(null)}
        title={la("لغو درخواست؟", "Cancel Request?")}
      >
        <div className="flex items-start gap-3 bg-orange-50 rounded-2xl p-3 mb-5">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">
            {la(
              "جستجو برای اهداکننده متوقف می‌شود. این عمل قابل بازگشت نیست.",
              "Donor search will stop. This cannot be undone.",
            )}
          </p>
        </div>
        <div className="space-y-2">
          <Button
            fullWidth
            variant="danger"
            loading={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
          >
            {la("بله، لغو شود", "Yes, Cancel")}
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setSheet(null)}>
            {la("بازگشت", "Go Back")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function DonorCard({ acceptance }: { acceptance: Acceptance }) {
  const { language } = useAppStore();
  const [showPhone, setShowPhone] = useState(false);
  const la = makeLangPicker(language);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-blood flex items-center justify-center text-white font-black flex-shrink-0">
          {acceptance.blood_type}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-neutral-dark truncate">
              {acceptance.full_name || la("اهداکننده", "Donor")}
            </span>
            {acceptance.is_verified && (
              <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-neutral-medium">
              {acceptance.district_name}
            </span>
            <span className="text-xs text-neutral-medium">·</span>
            <span className="text-xs text-neutral-medium">
              {acceptance.donation_count} {la("اهدا", "donations")}
            </span>
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={clsx(
                  "w-3 h-3",
                  s <= Math.round(acceptance.reliability_score * 5)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-200 fill-gray-200",
                )}
              />
            ))}
            <span className="text-xs text-neutral-medium ms-1">
              ({Math.round(acceptance.reliability_score * 100)}%)
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowPhone((v) => !v)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blood/10 text-blood text-sm font-semibold active:bg-blood/20 transition-colors"
      >
        <Phone className="w-4 h-4" />
        {showPhone
          ? acceptance.phone
          : la("نمایش شماره تلفن", "Show Phone Number")}
      </button>
    </div>
  );
}
