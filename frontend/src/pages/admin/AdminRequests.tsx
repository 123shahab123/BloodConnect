import React, { useState } from "react";
import {
  Zap,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../services/api";
import clsx from "clsx";

export default function AdminRequests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [urgency, setUrgency] = useState("");
  const [page, setPage] = useState(1);
  const [escalateTarget, setEscalateTarget] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  const params = {
    status: status || undefined,
    bloodType: bloodType || undefined,
    urgency: urgency || undefined,
    page,
    limit: 25,
  };
  const { data, isLoading } = useQuery({
    queryKey: ["admin-requests", params],
    queryFn: () => adminApi.getRequests(params).then((r) => r.data.data),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  });

  console.log("=== REQUESTS API RESPONSE ===");
  console.log(data);
  console.log("=== REQUESTS ARRAY ===");
  console.log(data?.requests);

  const escalateM = useMutation({
    mutationFn: ({ id, wave }: { id: number; wave: number }) =>
      adminApi.escalateReq(id, wave),
    onSuccess: (res) => {
      toast.success(
        `Escalated to Wave ${escalateTarget?.targetWave} — ${res.data.data?.donorsNotified || 0} donors notified`,
      );
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      setEscalateTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Error"),
  });

  const cancelM = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.cancelReq(id, reason),
    onSuccess: () => {
      toast.success("Request cancelled");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      setCancelTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Error"),
  });

  // const requests = data?.requests || [];
  // const pagination = data?.pagination || { pages: 1 };
  const requests = data?.data || [];

  const pagination = {
    total: data?.total || 0,
    pages: data?.last_page || 1,
  };

  const urgencyColor = (u: string) =>
    ({
      critical: "bg-red-100 text-red-700",
      urgent: "bg-orange-100 text-orange-700",
      planned: "bg-blue-100 text-blue-700",
    })[u] || "bg-gray-100 text-gray-500";
  const statusColor = (s: string) =>
    ({
      pending: "bg-yellow-100 text-yellow-700",
      notified: "bg-blue-100 text-blue-700",
      donor_found: "bg-green-100 text-green-700",
      fulfilled: "bg-green-200 text-green-800",
      cancelled: "bg-gray-100 text-gray-500",
      expired: "bg-red-100 text-red-400",
    })[s] || "bg-gray-100 text-gray-500";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-neutral-dark">
          Blood Requests
        </h1>
        {/* <p className="text-sm text-neutral-medium">
          {data?.pagination?.total?.toLocaleString() || 0} total
        </p> */}
        <p className="text-sm text-neutral-medium">
          {data?.total?.toLocaleString() || 0} total
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="border-2 border-gray-100 focus:border-blood rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
        >
          <option value="">All Statuses</option>
          {[
            "pending",
            "notified",
            "donor_found",
            "fulfilled",
            "cancelled",
            "expired",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={bloodType}
          onChange={(e) => {
            setBloodType(e.target.value);
            setPage(1);
          }}
          className="border-2 border-gray-100 focus:border-blood rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
        >
          <option value="">All Blood Types</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
            <option key={bt} value={bt}>
              {bt}
            </option>
          ))}
        </select>
        <select
          value={urgency}
          onChange={(e) => {
            setUrgency(e.target.value);
            setPage(1);
          }}
          className="border-2 border-gray-100 focus:border-blood rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
        >
          <option value="">All Urgencies</option>
          <option value="critical">🚨 Critical</option>
          <option value="urgent">⚠️ Urgent</option>
          <option value="planned">📅 Planned</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  "ID",
                  "Blood",
                  "Urgency",
                  "Province",
                  "Units",
                  "Donors",
                  "Wave",
                  "Status",
                  "Expires",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-start text-xs font-bold text-neutral-medium uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 10 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={10}>
                      <div className="h-4 bg-gray-100 rounded animate-pulse m-4" />
                    </td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-neutral-medium"
                  >
                    No requests found
                  </td>
                </tr>
              ) : (
                requests.map((r: any) => {
                  const isActive = [
                    "pending",
                    "notified",
                    "donor_found",
                  ].includes(r.status);
                  const expiresAt = new Date(r.expires_at);
                  const expiringSoon =
                    isActive &&
                    expiresAt.getTime() - Date.now() < 30 * 60 * 1000;
                  return (
                    <tr
                      key={r.id}
                      className={clsx(
                        "hover:bg-gray-50 transition-colors",
                        expiringSoon && "bg-red-50/50",
                      )}
                    >
                      <td className="px-4 py-3 text-xs font-mono text-neutral-medium">
                        #{r.id}
                      </td>
                      <td className="px-4 py-3 font-black text-blood">
                        {r.blood_type_needed}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                            urgencyColor(r.urgency),
                          )}
                        >
                          {r.urgency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-medium whitespace-nowrap">
                        {r.province_name}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold">
                        {r.units_needed}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={clsx(
                            "font-bold text-sm",
                            r.donors_accepted > 0
                              ? "text-green-600"
                              : "text-neutral-medium",
                          )}
                        >
                          {r.donors_accepted}/{r.units_needed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((w) => (
                            <div
                              key={w}
                              className={clsx(
                                "w-2 h-2 rounded-full",
                                w <= r.current_wave
                                  ? "bg-blood"
                                  : "bg-gray-200",
                              )}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                            statusColor(r.status),
                          )}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span
                          className={
                            expiringSoon
                              ? "text-red-600 font-bold"
                              : "text-neutral-medium"
                          }
                        >
                          {expiresAt.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isActive && r.current_wave < 5 && (
                            <button
                              onClick={() =>
                                setEscalateTarget({
                                  ...r,
                                  targetWave: r.current_wave + 1,
                                })
                              }
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors"
                            >
                              <Zap className="w-3 h-3" /> Wave{" "}
                              {r.current_wave + 1}
                            </button>
                          )}
                          {isActive && (
                            <button
                              onClick={() => setCancelTarget(r)}
                              className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-neutral-medium">
              Page {page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.pages, p + 1))
                }
                disabled={page === pagination.pages}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Escalate modal */}
      {escalateTarget && (
        <Modal
          title={`Escalate Request #${escalateTarget.id}`}
          onClose={() => setEscalateTarget(null)}
        >
          <p className="text-sm text-neutral-medium mb-4">
            Escalate from Wave <strong>{escalateTarget.current_wave}</strong> to
            Wave <strong>{escalateTarget.targetWave}</strong>? This will
            immediately notify donors in a wider geographic area.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                escalateM.mutate({
                  id: escalateTarget.id,
                  wave: escalateTarget.targetWave,
                })
              }
              disabled={escalateM.isPending}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {escalateM.isPending
                ? "Escalating..."
                : `Escalate to Wave ${escalateTarget.targetWave}`}
            </button>
            <button
              onClick={() => setEscalateTarget(null)}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-neutral-dark font-bold text-sm"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <Modal
          title={`Cancel Request #${cancelTarget.id}`}
          onClose={() => setCancelTarget(null)}
        >
          <div className="flex items-start gap-3 bg-orange-50 rounded-xl p-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-700">
              This will stop the donor search immediately.
            </p>
          </div>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Reason for cancellation..."
            className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-2.5 text-sm outline-none resize-none mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() =>
                cancelM.mutate({ id: cancelTarget.id, reason: cancelReason })
              }
              disabled={cancelM.isPending}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50"
            >
              {cancelM.isPending ? "..." : "Cancel Request"}
            </button>
            <button
              onClick={() => setCancelTarget(null)}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-neutral-dark font-bold text-sm"
            >
              Go Back
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-black text-neutral-dark text-lg mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
