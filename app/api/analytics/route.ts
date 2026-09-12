
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";

const CAMPAIGN_COUNT_MODE: "per_history" | "per_subject_day" = "per_history";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = Math.min(parseInt(searchParams.get("range") || "30"), 365);

    const since = new Date();
    since.setDate(since.getDate() - range);

    const userId = session.user.id;

    // ── All EmailHistory rows for this user in range ─────────────────────────
    // Include queued/sending so in-progress Inngest jobs show immediately.
    const histories = await prisma.emailHistory.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        // Include all statuses — queued rows show 0 sent, which is correct
      },
      include: {
        contactList: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── Aggregate totals across all histories ────────────────────────────────
    const totals = histories.reduce(
      (acc, h) => ({
        sent: acc.sent + (h.sentCount || 0),
        delivered: acc.delivered + (h.deliveredCount || 0),
        opened: acc.opened + (h.openedCount || 0),
        clicked: acc.clicked + (h.clickedCount || 0),
        failed: acc.failed + (h.failedCount || 0),
        bounced: acc.bounced + (h.bouncedCount || 0),
        complained: acc.complained + (h.complainedCount || 0),
        unsubscribed: acc.unsubscribed + (h.unsubscribedCount || 0),
      }),
      {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
      },
    );

    // ── Campaign count ────────────────────────────────────────────────────────
    // per_history: count each EmailHistory row (one per list per send).
    // per_subject_day: group by subject+day so 3-list send = 1 campaign.
    let campaignCount: number;
    if (CAMPAIGN_COUNT_MODE === "per_subject_day") {
      const groups = new Set(
        histories.map(
          (h) => `${h.subject}::${h.createdAt.toISOString().slice(0, 10)}`,
        ),
      );
      campaignCount = groups.size;
    } else {
      campaignCount = histories.length;
    }

    // ── Rates ─────────────────────────────────────────────────────────────────
    const rates = {
      deliveryRate:
        totals.sent > 0
          ? Math.round((totals.delivered / totals.sent) * 100)
          : 0,
      openRate:
        totals.delivered > 0
          ? Math.round((totals.opened / totals.delivered) * 100)
          : 0,
      clickRate:
        totals.delivered > 0
          ? Math.round((totals.clicked / totals.delivered) * 100)
          : 0,
      clickToDelivery:
        totals.delivered > 0
          ? Math.round((totals.clicked / totals.delivered) * 100)
          : 0,
    };

    // ── Daily series ─────────────────────────────────────────────────────────
    // Build a map of date → aggregated counts
    const dailyMap = new Map<
      string,
      {
        date: string;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        complained: number;
        campaigns: number;
      }
    >();

    // Pre-fill every day in range with zeros
    for (let i = range; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, {
        date: key,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        complained: 0,
        campaigns: 0,
      });
    }

    histories.forEach((h) => {
      const key = h.createdAt.toISOString().slice(0, 10);
      const day = dailyMap.get(key);
      if (!day) return;
      day.sent += h.sentCount || 0;
      day.delivered += h.deliveredCount || 0;
      day.opened += h.openedCount || 0;
      day.clicked += h.clickedCount || 0;
      day.failed += h.failedCount || 0;
      day.complained += h.complainedCount || 0;
      day.campaigns += 1;
    });

    const dailySeries = Array.from(dailyMap.values());

    // ── Top campaigns ─────────────────────────────────────────────────────────
    // Sort by sentCount desc, take top 10.
    // contactList may be null if list was deleted — handle gracefully.
    const topCampaigns = [...histories]
      .sort((a, b) => (b.sentCount || 0) - (a.sentCount || 0))
      .slice(0, 10)
      .map((h) => ({
        id: h.id,
        subject: h.subject,
        sentCount: h.sentCount || 0,
        openedCount: h.openedCount || 0,
        clickedCount: h.clickedCount || 0,
        createdAt: h.createdAt.toISOString(),
        status: h.status,
        // contactList may be null if deleted — UI should handle null gracefully
        contactList: {
          name: h.contactList?.name ?? "Deleted List",
        },
      }));

    // ── Contact lists summary ─────────────────────────────────────────────────
    // For each contact list, count its contacts and campaigns.
    // This is unaffected by multi-list — each list has its own history rows.
    const contactListsRaw = await prisma.contactList.findMany({
      where: { createdBy: userId },
      include: {
        _count: { select: { contacts: true, emailHistory: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const contactLists = contactListsRaw.map((cl) => ({
      id: cl.id,
      name: cl.name,
      contactCount: cl._count.contacts,
      campaignCount: cl._count.emailHistory,
    }));

    // ── Suppression count ─────────────────────────────────────────────────────
    const suppressionCount = await prisma.emailSuppression.count({
      where: { userId },
    });

    return NextResponse.json({
      totals: { ...totals, campaigns: campaignCount },
      rates,
      dailySeries,
      topCampaigns,
      contactLists,
      suppressionCount,
      range,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
