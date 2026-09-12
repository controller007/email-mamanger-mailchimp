import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import prisma from "@/app/_lib/db/prisma";
import Link from "next/link";
import {
  Mail,
  Send,
  CheckCircle,
  Eye,
  AlertCircle,
  Users,
  ArrowRight,
  TrendingUp,
  MousePointerClick,
  Globe,
  BarChart3,
  Plus,
} from "lucide-react";

async function getDashboardStats(userId: string) {
  const [emailStats, contactListsCount, verifiedDomainsCount, recentEmails] =
    await Promise.all([
      prisma.emailHistory.aggregate({
        where: { userId },
        _sum: {
          sentCount: true,
          deliveredCount: true,
          openedCount: true,
          failedCount: true,
          clickedCount: true,
        },
        _count: { id: true },
      }),
      prisma.contactList.count({ where: { createdBy: userId } }),
      prisma.domain.count({ where: { userId, status: "verified" } }),
      prisma.emailHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { contactList: { select: { name: true } } },
      }),
    ]);

  return {
    totalCampaigns: emailStats._count.id || 0,
    sentCount: emailStats._sum.sentCount || 0,
    deliveredCount: emailStats._sum.deliveredCount || 0,
    openedCount: emailStats._sum.openedCount || 0,
    failedCount: emailStats._sum.failedCount || 0,
    clickedCount: emailStats._sum.clickedCount || 0,
    contactListsCount,
    verifiedDomainsCount,
    recentEmails,
    openRate:
      (emailStats._sum.deliveredCount || 0) > 0
        ? Math.round(
            ((emailStats._sum.openedCount || 0) /
              (emailStats._sum.deliveredCount || 1)) *
              100,
          )
        : 0,
  };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  iconBg,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white ${gradient}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold leading-none">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <p className="text-xs opacity-70 mt-1.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {/* Decorative ring */}
      <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full border-8 border-white/5" />
    </div>
  );
}

function getStatusBadge(status?: string | null) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 border text-[10px]">
          Sent
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 border text-[10px]">
          Failed
        </Badge>
      );
    case "sending":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border text-[10px]">
          Sending
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200 border text-[10px]">
          {status || "sent"}
        </Badge>
      );
  }
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const stats = await getDashboardStats(user.id);
  const firstName =
    (user as any).firstName || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good to see you, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Here's an overview of your email campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/contact-lists">
              <Users className="mr-1.5 h-4 w-4" />
              Manage Lists
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/send-email">
              <Send className="mr-1.5 h-4 w-4" />
              Send Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Top Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Campaigns"
          value={stats.totalCampaigns}
          sub={`${stats.contactListsCount} contact list${stats.contactListsCount !== 1 ? "s" : ""}`}
          icon={Mail}
          gradient="bg-gradient-to-br from-blue-600 to-blue-800"
          iconBg="bg-blue-500/30"
        />
        <StatCard
          label="Emails Sent"
          value={stats.sentCount}
          sub="across all campaigns"
          icon={Send}
          gradient="bg-gradient-to-br from-indigo-600 to-indigo-800"
          iconBg="bg-indigo-500/30"
        />
        <StatCard
          label="Delivered"
          value={stats.deliveredCount}
          sub={
            stats.sentCount > 0
              ? `${Math.round((stats.deliveredCount / stats.sentCount) * 100)}% delivery rate`
              : "—"
          }
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
          iconBg="bg-emerald-500/30"
        />
        <StatCard
          label="Open Rate"
          value={`${stats.openRate}%`}
          sub={`${stats.openedCount.toLocaleString()} opens total`}
          icon={Eye}
          gradient="bg-gradient-to-br from-purple-600 to-purple-800"
          iconBg="bg-purple-500/30"
        />
      </div>

      {/* ── Secondary Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Clicks",
            value: stats.clickedCount.toLocaleString(),
            icon: MousePointerClick,
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100",
          },
          {
            label: "Failed Deliveries",
            value: stats.failedCount.toLocaleString(),
            icon: AlertCircle,
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100",
          },
          {
            label: "Verified Domains",
            value: stats.verifiedDomainsCount,
            icon: Globe,
            color: "text-teal-600",
            bg: "bg-teal-50",
            border: "border-teal-100",
          },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className={`${bg} ${border} border rounded-2xl p-5 flex items-center gap-4`}
          >
            <div className={`p-3 ${bg} rounded-xl border ${border}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Campaigns ────────────────────────────────────────────── */}
      <Card className="rounded-2xl shadow-sm border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-base">Recent Campaigns</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Link href="/email-history">
              View all <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentEmails.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {stats.recentEmails.map((email) => {
                const deliveryRate =
                  email.sentCount > 0
                    ? Math.round((email.deliveredCount / email.sentCount) * 100)
                    : 0;
                const openRate =
                  email.deliveredCount > 0
                    ? Math.round(
                        (email.clickedCount / email.deliveredCount) * 100,
                      )
                    : 0;

                return (
                  <div
                    key={email.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Icon */}
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {email.contactList.name} ·{" "}
                        {new Date(email.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {email.sentCount.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Sent
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-emerald-600">
                          {deliveryRate}%
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Delivered
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-purple-600">
                          {openRate}%
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Clicked
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {getStatusBadge(email.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                No campaigns yet
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Send your first email campaign to see analytics here.
              </p>
              <div className="flex gap-2 mt-5">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/contact-lists">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create List
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/send-email">
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Send Email
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            href: "/domains",
            icon: Globe,
            label: "Manage Domains",
            desc: "Add & verify sending domains",
            color: "text-teal-600",
            bg: "bg-teal-50",
          },
          {
            href: "/contact-lists",
            icon: Users,
            label: "Contact Lists",
            desc: "Manage your subscriber lists",
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            href: "/analytics",
            icon: TrendingUp,
            label: "Analytics",
            desc: "Deep-dive campaign insights",
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map(({ href, icon: Icon, label, desc, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all"
          >
            <div className={`p-3 ${bg} rounded-xl`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}
