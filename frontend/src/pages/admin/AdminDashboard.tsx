import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Droplets,
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { adminApi } from "../../services/api";

function kpiAdminToken() {
  return localStorage.getItem("bc_admin_token") || "";
}

const KPI: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: number;
}> = ({ icon, label, value, sub, color, trend }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div
        className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}
      >
        {icon}
      </div>
      {trend !== undefined && (
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="text-3xl font-black text-neutral-dark">{value}</div>
    <div className="text-sm font-semibold text-neutral-dark mt-1">{label}</div>
    {sub && <div className="text-xs text-neutral-medium mt-0.5">{sub}</div>}
  </div>
);

const BLOOD_COLORS: Record<string, string> = {
  "O+": "#C0392B",
  "O-": "#E74C3C",
  "A+": "#E67E22",
  "A-": "#F39C12",
  "B+": "#8E44AD",
  "B-": "#9B59B6",
  "AB+": "#2980B9",
  "AB-": "#3498DB",
};

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard().then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  // const { data, isLoading } = useQuery({
  //   queryKey: ["admin-dashboard"],
  //   queryFn: async () => {
  //     const r = await adminApi.getDashboard();

  //     console.log("=== DASHBOARD RESPONSE ===");
  //     console.log(r.data);
  //     console.log("=== DASHBOARD DATA ===");
  //     console.log(r.data.data);

  //     return r.data.data;
  //   },
  //   refetchInterval: 30000,
  // });

  // const { data, isLoading } = useQuery({
  //   queryKey: ["admin-dashboard"],
  //   queryFn: () => adminApi.getDashboard().then((r) => r.data.data),
  //   refetchInterval: 30000,
  // });

  // const data = data ?? {
  //   analytics: {
  //     by_blood_type: [],
  //     by_province: [],
  //     daily_requests: [],
  //   },
  // };

  if (isLoading)
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );

  // const d = data!
  if (!data) {
    return <div className="p-6">Failed to load dashboard data</div>;
  }

  const d = data;
  console.log("Dashboard Data:", d);
  console.log("Users:", d.users);
  console.log("Donors:", d.donors);
  console.log("Requests:", d.requests);
  console.log("Analytics:", d.analytics);

  const byStatus = d.requests.byStatus || {};
  const statusData = [
    { name: "Pending", value: byStatus.pending || 0, color: "#F39C12" },
    { name: "Notified", value: byStatus.notified || 0, color: "#3498DB" },
    { name: "Found", value: byStatus.donor_found || 0, color: "#27AE60" },
    { name: "Fulfilled", value: byStatus.fulfilled || 0, color: "#2ECC71" },
    { name: "Cancelled", value: byStatus.cancelled || 0, color: "#95A5A6" },
    { name: "Expired", value: byStatus.expired || 0, color: "#E74C3C" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-neutral-dark">Dashboard</h1>
          <p className="text-sm text-neutral-medium">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />{" "}
          Live
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          icon={<Users className="w-6 h-6 text-blue-600" />}
          label="Total Users"
          // value={d.users.total.toLocaleString()}
          value={(d.users?.total ?? 0).toLocaleString()}
          // sub={`+${d.users.newToday} today`}
          sub={`+${d.users?.newToday ?? 0} today`}
          color="bg-blue-100"
          // trend={d.users.newToday > 0 ? 12 : 0}
          trend={(d.users?.newToday ?? 0) > 0 ? 12 : 0}
        />
        <KPI
          icon={<Droplets className="w-6 h-6 text-red-600" />}
          label="Active Donors"
          // value={d.donors.activeNow.toLocaleString()}
          value={(d.donors?.activeNow ?? 0).toLocaleString()}
          // sub={`of ${d.users.donors} registered`}
          sub={`of ${d.users?.donors ?? 0} registered`}
          color="bg-red-100"
        />
        <KPI
          icon={<FileText className="w-6 h-6 text-orange-600" />}
          label="Requests Today"
          value={d.requests.today}
          sub={`${d.requests.thisWeek} this week`}
          color="bg-orange-100"
        />
        <KPI
          icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
          label="Fulfillment Rate"
          value={`${d.requests.fulfillmentRate}%`}
          sub={`avg ${d.requests.avgMinutesToFirstDonor}m to first donor`}
          color="bg-green-100"
          trend={5}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily requests line chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-dark mb-4">
            Requests (Last 14 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.analytics.dailyRequests}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(v) => `Date: ${v}`} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#C0392B"
                strokeWidth={2.5}
                dot={false}
                name="Requests"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Request status pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-dark mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
              >
                {statusData.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {statusData.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-neutral-medium">{s.name}</span>
                </div>
                <span className="font-bold text-neutral-dark">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blood type + province charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Blood type demand */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-dark mb-4">
            Blood Type Demand (30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            {/* <BarChart data={d.analytics.byBloodType} layout="vertical"> */}
            <BarChart data={d.analytics?.by_blood_type ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="blood_type_needed"
                type="category"
                tick={{ fontSize: 12, fontWeight: 700 }}
                width={32}
              />
              <Tooltip />
              <Bar dataKey="count" name="Requests" radius={[0, 6, 6, 0]}>
                {/* {d.analytics.byBloodType.map((bt: any, i: number) => (
                  <Cell
                    key={i}
                    fill={BLOOD_COLORS[bt.blood_type_needed] || "#C0392B"}
                  />
                ))} */}
                {(d.analytics?.by_blood_type ?? []).map(
                  (bt: any, i: number) => (
                    <Cell
                      key={i}
                      fill={BLOOD_COLORS[bt.blood_type_needed] || "#C0392B"}
                    />
                  ),
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top provinces */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-dark mb-4">
            Top Provinces (30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            {/* <BarChart data={d.analytics.byProvince.slice(0, 8)}> */}
            <BarChart data={(d.analytics?.by_province ?? []).slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name_en" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#C0392B"
                radius={[6, 6, 0, 0]}
                name="Requests"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active alerts */}
      {(byStatus.critical || 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm">
              {byStatus.pending || 0} active critical/urgent requests need
              attention
            </p>
            <p className="text-xs text-red-500">
              Consider manual escalation if donors not responding
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
