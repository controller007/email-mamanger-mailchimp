"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Mail,
  Eye,
  MousePointer,
  AlertTriangle,
  UserMinus,
  Send,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { format } from "date-fns";
import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { ValueType } from "recharts/types/component/DefaultTooltipContent";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  totals: {
    campaigns: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    clickToDelivery: number;
  };
  dailySeries: {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    complained: number;
    campaigns: number;
  }[];
  topCampaigns: {
    id: string;
    subject: string;
    sentCount: number;
    openedCount: number;
    clickedCount: number;
    createdAt: string;
    contactList: { name: string };
  }[];
  contactLists: {
    id: string;
    name: string;
    contactCount: number;
    campaignCount: number;
  }[];
  suppressionCount: number;
  range: number;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: string;
  trend?: { value: number; label: string };
}) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "text-blue-500" },
    green: {
      bg: "bg-green-50",
      text: "text-green-600",
      icon: "text-green-500",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      icon: "text-purple-500",
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-600",
      icon: "text-orange-500",
    },
    red: { bg: "bg-red-50", text: "text-red-600", icon: "text-red-500" },
    gray: { bg: "bg-gray-50", text: "text-gray-700", icon: "text-gray-400" },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}
        >
          <Icon className={`h-5 w-5 ${c.icon}`} />
        </div>
        {trend && (
          <span
            className={`text-xs font-medium flex items-center gap-0.5 ${
              trend.value >= 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {trend.value >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${c.text} mb-0.5`}>{value}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-semibold text-gray-800">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────────────────
 export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const fetchAnalytics = async (r = range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${r}`);
      const json = await res.json();
      setData(json);
    } catch {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const {
    totals,
    rates,
    dailySeries,
    topCampaigns,
    contactLists,
    suppressionCount,
  } = data;

  // Pie data for engagement breakdown
  const pieData = [
    { name: "Opened", value: totals.opened, color: "#22c55e" },
    { name: "Clicked", value: totals.clicked, color: "#8b5cf6" },
    {
      name: "Unopened",
      value: Math.max(0, totals.delivered - totals.opened),
      color: "#e5e7eb",
    },
  ].filter((d) => d.value > 0);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return format(d, range === "7" ? "EEE" : "MMM d");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Campaign performance for the last {range} days
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36 text-sm">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(range)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="Campaigns"
          value={totals.campaigns}
          icon={Send}
          color="gray"
        />
        <KPICard
          label="Emails Sent"
          value={totals.sent.toLocaleString()}
          icon={Mail}
          color="blue"
        />
        <KPICard
          label="Delivery Rate"
          value={`${rates.deliveryRate}%`}
          subtitle={`${totals.delivered.toLocaleString()} delivered`}
          icon={CheckCircle}
          color="green"
        />
        <KPICard
          label="Open Rate"
          value={`${rates.openRate}%`}
          subtitle={`${totals.opened.toLocaleString()} opens`}
          icon={Eye}
          color="purple"
        />
        <KPICard
          label="Click Rate"
          value={`${rates.clickRate}%`}
          subtitle={`${totals.clicked.toLocaleString()} clicks`}
          icon={MousePointer}
          color="orange"
        />
        <KPICard
          label="Suppressed"
          value={suppressionCount}
          subtitle="bounced + spam"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Main chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Email Performance
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Daily breakdown of key metrics
            </p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setChartType("area")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${chartType === "area" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${chartType === "bar" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            >
              Bar
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          {chartType === "area" ? (
            <AreaChart
              data={dailySeries}
              margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
            >
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gClicked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="sent"
                name="Sent"
                stroke="#3b82f6"
                fill="url(#gSent)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="opened"
                name="Opened"
                stroke="#22c55e"
                fill="url(#gOpened)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="clicked"
                name="Clicked"
                stroke="#8b5cf6"
                fill="url(#gClicked)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={dailySeries}
              margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar
                dataKey="sent"
                name="Sent"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="opened"
                name="Opened"
                fill="#22c55e"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="clicked"
                name="Clicked"
                fill="#8b5cf6"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Bottom row: Top campaigns + Pie + Contact lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top campaigns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Top Campaigns
          </h2>
          {topCampaigns.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              No campaigns in this period
            </div>
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((c, i) => {
                const openRate =
                  c.sentCount > 0
                    ? Math.round((c.openedCount / c.sentCount) * 100)
                    : 0;
                const clickRate =
                  c.openedCount > 0
                    ? Math.round((c.clickedCount / c.openedCount) * 100)
                    : 0;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.subject}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.contactList.name} · {c.sentCount.toLocaleString()}{" "}
                        sent · {format(new Date(c.createdAt), "MMM d")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <div className="text-center">
                        <p className="font-bold text-green-600">{openRate}%</p>
                        <p className="text-gray-400">Open</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-purple-600">
                          {clickRate}%
                        </p>
                        <p className="text-gray-400">Click</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Engagement pie + suppression */}
        <div className="space-y-4">
          {/* Pie */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Engagement Breakdown
            </h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: ValueType | undefined) => [
                      value?.toLocaleString(),
                      "",
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-sm text-gray-400">
                No engagement data yet
              </div>
            )}
          </div>

          {/* Health summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Sender Health
            </h2>
            <div className="space-y-2 text-xs">
              {[
                {
                  label: "Delivery Rate",
                  value: `${rates.deliveryRate}%`,
                  good: rates.deliveryRate > 95,
                },
                {
                  label: "Open Rate",
                  value: `${rates.openRate}%`,
                  good: rates.openRate > 20,
                },
                {
                  label: "Click Rate",
                  value: `${rates.clickRate}%`,
                  good: rates.clickRate > 2,
                },
                {
                  label: "Complaint Rate",
                  value:
                    totals.sent > 0
                      ? `${((totals.complained / totals.sent) * 100).toFixed(3)}%`
                      : "—",
                  good:
                    totals.sent === 0 ||
                    totals.complained / totals.sent < 0.001,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-gray-500">{item.label}</span>
                  <span
                    className={`font-semibold ${item.good ? "text-green-600" : "text-amber-600"}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contact list activity */}
      {contactLists.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Contact Lists
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {contactLists.map((list) => (
              <div
                key={list.id}
                className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
              >
                <p className="font-medium text-sm text-gray-900 truncate mb-1">
                  {list.name}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{list.contactCount.toLocaleString()} contacts</span>
                  <span>{list.campaignCount} campaigns</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Add missing import
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
