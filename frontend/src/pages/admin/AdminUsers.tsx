import React, { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../services/api";
import clsx from "clsx";

type SuspendForm = { days: number; reason: string };

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [status, setStatus] = useState("");
  const [isDonor, setIsDonor] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [suspendForm, setSuspendForm] = useState<SuspendForm>({
    days: 3,
    reason: "",
  });
  const [action, setAction] = useState<"suspend" | "ban" | "verify" | null>(
    null,
  );

  const params = {
    search: search || undefined,
    bloodType: bloodType || undefined,
    status: status || undefined,
    isDonor: isDonor || undefined,
    page,
    limit: 25,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => adminApi.getUsers(params).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  });

  console.log("=== USERS API RESPONSE ===");
  console.log(data);
  console.log("=== USERS ARRAY ===");
  console.log(data?.users);

  const suspendM = useMutation({
    mutationFn: ({
      id,
      days,
      reason,
    }: {
      id: number;
      days: number;
      reason: string;
    }) => adminApi.suspendUser(id, days, reason),
    onSuccess: () => {
      toast.success("User suspended");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setAction(null);
      setSelectedUser(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Error"),
  });

  const unsuspendM = useMutation({
    mutationFn: (id: number) => adminApi.unsuspendUser(id),
    onSuccess: () => {
      toast.success("User unsuspended");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const banM = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.banUser(id, reason),
    onSuccess: () => {
      toast.success("User banned");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setAction(null);
      setSelectedUser(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Error"),
  });

  const verifyM = useMutation({
    mutationFn: ({ id, verified }: { id: number; verified: boolean }) =>
      adminApi.verifyDonor(id, verified),
    onSuccess: () => {
      toast.success("Donor verification updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  // const users = data?.users || [];
  // const pagination = data?.pagination || { total: 0, pages: 1 };
  const users = data?.data || [];

  const pagination = {
    total: data?.total || 0,
    pages: data?.last_page || 1,
  };

  const statusColor = (s: string) =>
    ({
      active: "bg-green-100 text-green-700",
      suspended: "bg-orange-100 text-orange-700",
      banned: "bg-red-100 text-red-700",
      deactivated: "bg-gray-100 text-gray-500",
    })[s] || "bg-gray-100 text-gray-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-neutral-dark">Users</h1>
          <p className="text-sm text-neutral-medium">
            {pagination.total.toLocaleString()} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by ID or phone..."
              className="w-full ps-9 pe-4 py-2.5 border-2 border-gray-100 focus:border-blood rounded-xl text-sm outline-none"
            />
          </div>
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
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border-2 border-gray-100 focus:border-blood rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
          >
            <option value="">All Statuses</option>
            {["active", "suspended", "banned", "deactivated"].map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={isDonor}
            onChange={(e) => {
              setIsDonor(e.target.value);
              setPage(1);
            }}
            className="border-2 border-gray-100 focus:border-blood rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
          >
            <option value="">All Users</option>
            <option value="true">Donors Only</option>
            <option value="false">Non-Donors</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  "ID",
                  "Name",
                  "Blood",
                  "Province",
                  "Donor",
                  "Donations",
                  "Status",
                  "Verified",
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
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-neutral-medium"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-neutral-medium font-mono">
                      #{u.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-dark text-sm">
                        {u.full_name || "—"}
                      </div>
                      <div className="text-xs text-neutral-medium">
                        {u.phone ? `•••${u.phone.slice(-4)}` : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-black text-blood">
                        {u.blood_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-medium whitespace-nowrap">
                      {u.province_name}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_donor ? (
                        <span className="text-green-600 text-xs font-bold">
                          ✓ Donor
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                      {u.is_donor && (
                        <div
                          className={clsx(
                            "text-xs font-medium mt-0.5",
                            u.is_available ? "text-green-600" : "text-gray-400",
                          )}
                        >
                          {u.is_available ? "Available" : "Unavailable"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-center text-neutral-dark">
                      {u.donation_count}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          statusColor(u.status),
                        )}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.is_verified ? (
                        <CheckCircle className="w-4 h-4 text-blue-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {u.status === "active" && (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setAction("suspend");
                            }}
                            className="px-2 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold hover:bg-orange-200 transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        {u.status === "suspended" && (
                          <button
                            onClick={() => unsuspendM.mutate(u.id)}
                            className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition-colors"
                          >
                            Lift
                          </button>
                        )}
                        {u.status !== "banned" && (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setAction("ban");
                            }}
                            className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors"
                          >
                            Ban
                          </button>
                        )}
                        {u.is_donor && (
                          <button
                            onClick={() =>
                              verifyM.mutate({
                                id: u.id,
                                verified: !u.is_verified,
                              })
                            }
                            className={clsx(
                              "px-2 py-1 rounded-lg text-xs font-semibold transition-colors",
                              u.is_verified
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200",
                            )}
                          >
                            {u.is_verified ? "Unverify" : "Verify"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-neutral-medium">
              Page {page} of {pagination.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.pages, p + 1))
                }
                disabled={page === pagination.pages}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend modal */}
      {action === "suspend" && selectedUser && (
        <Modal
          title={`Suspend ${selectedUser.full_name || `User #${selectedUser.id}`}`}
          onClose={() => {
            setAction(null);
            setSelectedUser(null);
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">
                Duration (days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={suspendForm.days}
                onChange={(e) =>
                  setSuspendForm((f) => ({ ...f, days: +e.target.value }))
                }
                className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">
                Reason
              </label>
              <textarea
                value={suspendForm.reason}
                onChange={(e) =>
                  setSuspendForm((f) => ({ ...f, reason: e.target.value }))
                }
                rows={3}
                placeholder="Reason for suspension..."
                className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  suspendM.mutate({
                    id: selectedUser.id,
                    days: suspendForm.days,
                    reason: suspendForm.reason,
                  })
                }
                disabled={!suspendForm.reason || suspendM.isPending}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm disabled:opacity-50"
              >
                {suspendM.isPending ? "Suspending..." : "Suspend"}
              </button>
              <button
                onClick={() => {
                  setAction(null);
                  setSelectedUser(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-neutral-dark font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ban modal */}
      {action === "ban" && selectedUser && (
        <Modal
          title={`Permanently Ban ${selectedUser.full_name || `User #${selectedUser.id}`}`}
          onClose={() => {
            setAction(null);
            setSelectedUser(null);
          }}
        >
          <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              This action is permanent. The user will not be able to access
              BloodConnect.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-medium block mb-1.5">
                Reason for ban
              </label>
              <textarea
                value={suspendForm.reason}
                onChange={(e) =>
                  setSuspendForm((f) => ({ ...f, reason: e.target.value }))
                }
                rows={3}
                placeholder="Detailed reason..."
                className="w-full border-2 border-gray-100 focus:border-blood rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  banM.mutate({
                    id: selectedUser.id,
                    reason: suspendForm.reason,
                  })
                }
                disabled={!suspendForm.reason || banM.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50"
              >
                {banM.isPending ? "Banning..." : "Permanently Ban"}
              </button>
              <button
                onClick={() => {
                  setAction(null);
                  setSelectedUser(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-neutral-dark font-bold text-sm"
              >
                Cancel
              </button>
            </div>
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
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
        <h3 className="font-black text-neutral-dark text-lg mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
