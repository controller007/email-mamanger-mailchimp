import { requireAuth } from "@/app/_lib/auth/session";
import DashboardLayout from "@/app/_components/dashboard-layout";
import { EmailHistoryList } from "@/app/_components/email-history-list";
import { EmailHistoryFilters } from "@/app/_components/email-history-filters";
import { HistorySyncClient } from "./sync";
import prisma from "@/app/_lib/db/prisma";
import { Button } from "@/app/_components/ui/button";
import Link from "next/link";
import { Send, History } from "lucide-react";

const PAGE_SIZE = 10;

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
  };
}

export default async function EmailHistoryPage({ searchParams }: PageProps) {
  const user = await requireAuth();

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const search = searchParams.search || "";
  const status = searchParams.status || "";
  const skip = (page - 1) * PAGE_SIZE;

  const where: any = {
    userId: user.id,
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: "insensitive" } },
            {
              contactList: { name: { contains: search, mode: "insensitive" } },
            },
          ],
        }
      : {}),
    ...(status && status !== "all" ? { status } : {}),
  };

  const [emailHistory, total] = await Promise.all([
    prisma.emailHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        contactList: {
          select: {
            name: true,
            domain: { select: { domain: true } },
            _count: { select: { emailHistory: true } },
          },
        },
      },
    }),
    prisma.emailHistory.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const visibleHistoryIds = emailHistory
    .filter(
      (h) =>
        h.batchIds.length > 0 &&
        (h.status === "sent" || h.status === "sending" || !h.syncedAt),
    )
    .map((h) => h.id);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email History</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total.toLocaleString()} campaign{total !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/send-email">
            <Send className="mr-1.5 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <EmailHistoryFilters />

      {/* ── List ──────────────────────────────────────────────────────── */}
      <EmailHistoryList
        emailHistory={emailHistory as any}
        currentPage={page}
        totalPages={totalPages}
        total={total}
      />

      {/* Background sync — polls every 30s for visible records */}
      <HistorySyncClient historyIds={visibleHistoryIds} />
    </div>
  );
}
