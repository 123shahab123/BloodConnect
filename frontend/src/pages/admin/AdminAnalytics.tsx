import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { adminApi } from "../../services/api";
import { Trophy } from "lucide-react";

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

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: () => adminApi.getAnalytics(period).then((r) => r.data.data),
  });

  if (isLoading)
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-48 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    );

  const d = data!;
  const analytics = {
    userGrowth: d.user_growth ?? [],
    requestsByType: d.requests_by_type ?? [],
    requestsByProvince: d.requests_by_province ?? [],
    topDonors: d.top_donors ?? [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-neutral-dark">Analytics</h1>
          <p className="text-sm text-neutral-medium">
            Performance insights for BloodConnect
          </p>
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${period === p ? "bg-blood text-white" : "text-neutral-medium hover:bg-gray-50"}`}
            >
              {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* User Growth */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-neutral-dark mb-4">User Registrations</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={analytics.userGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#2980B9"
              strokeWidth={2.5}
              dot={false}
              name="New Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Requests by blood type */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-dark mb-4">
            Requests by Blood Type
          </h3>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={analytics.requestsByType.reduce((acc: any[], r: any) => {
                const ex = acc.find(
                  (a) => a.blood_type === r.blood_type_needed,
                );
                if (ex) {
                  ex.total += r.count;
                  ex.fulfilled += r.fulfilled;
                } else
                  acc.push({
                    blood_type: r.blood_type_needed,
                    total: r.count,
                    fulfilled: r.fulfilled,
                  });
                return acc;
              }, [])}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="blood_type"
                tick={{ fontSize: 12, fontWeight: 700 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" name="Total" radius={[6, 6, 0, 0]}>
                {analytics.requestsByType.map((_: any, i: number) => (
                  <Cell key={i} fill={Object.values(BLOOD_COLORS)[i % 8]} />
                ))}
              </Bar>
              <Bar
                dataKey="fulfilled"
                name="Fulfilled"
                fill="#27AE60"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Requests by province */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-neutral-dark mb-4">Top Provinces</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={analytics.requestsByProvince.slice(0, 8)}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="name_en"
                type="category"
                tick={{ fontSize: 11 }}
                width={80}
              />
              <Tooltip />
              <Bar
                dataKey="total"
                name="Total"
                fill="#C0392B"
                radius={[0, 6, 6, 0]}
              />
              <Bar
                dataKey="fulfilled"
                name="Fulfilled"
                fill="#27AE60"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top donors */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-neutral-dark mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Top Donors
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  "Rank",
                  "Name",
                  "Blood Type",
                  "Province",
                  "Donations",
                  "Reliability",
                  "Last Donation",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-start text-xs font-bold text-neutral-medium uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {analytics.topDonors.map((donor: any, i: number) => (
                <tr
                  key={donor.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-3">
                    <span className="text-lg">
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `#${i + 1}`}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-neutral-dark">
                    {donor.full_name || `Donor #${donor.id}`}
                  </td>
                  <td className="px-3 py-3 font-black text-blood">
                    {donor.blood_type}
                  </td>
                  <td className="px-3 py-3 text-xs text-neutral-medium">
                    {donor.province}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-black text-blood text-lg">
                      {donor.donation_count}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${(donor.reliability_score || 0) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-neutral-medium">
                        {((donor.reliability_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-neutral-medium whitespace-nowrap">
                    {donor.last_donation_at
                      ? new Date(donor.last_donation_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
