// app/api/email-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

// ─── Constants ────────────────────────────────────────────────────────────────

const SYNC_COOLDOWN_MS = 60_000;
const RESEND_CHUNK_SIZE = 8;
const RESEND_CHUNK_PAUSE_MS = 150;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const EVENT_PRIORITY: Record<string, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  bounced: 2,
  failed: 2,
  complained: 2,
  unsubscribed: 2,
};

function eventPriority(event: string): number {
  return EVENT_PRIORITY[event] ?? 0;
}

type EventRow = {
  emailHistoryId: string;
  recipientEmail: string;
  status: string;
  resendMessageId: string | null;
};

type Counts = {
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  failedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
};

/**
 * Derives aggregate counts from EmailRecipientEvent rows.
 *
 * Takes the best-known state per recipient (e.g. if someone has both a
 * "delivered" and an "opened" row, they count as "opened" only — no
 * double-counting). "clicked" implies opened + delivered, "opened" implies
 * delivered.
 */
function aggregateFromEvents(
  events: Pick<EventRow, "recipientEmail" | "status">[],
): Counts {
  const bestState = new Map<string, string>();
  for (const event of events) {
    const current = bestState.get(event.recipientEmail);
    if (!current || eventPriority(event.status) > eventPriority(current)) {
      bestState.set(event.recipientEmail, event.status);
    }
  }

  let deliveredCount = 0,
    openedCount = 0,
    clickedCount = 0;
  let bouncedCount = 0,
    failedCount = 0,
    complainedCount = 0,
    unsubscribedCount = 0;

  // ── FIX: Replaced for...of loop with .forEach to prevent build compilation errors ──
  bestState.forEach((state) => {
    switch (state) {
      case "clicked":
        deliveredCount++;
        openedCount++;
        clickedCount++;
        break;
      case "opened":
        deliveredCount++;
        openedCount++;
        break;
      case "delivered":
        deliveredCount++;
        break;
      case "bounced":
        bouncedCount++;
        break;
      case "failed":
        failedCount++;
        break;
      case "complained":
        complainedCount++;
        break;
      case "unsubscribed":
        unsubscribedCount++;
        break;
    }
  });

  return {
    deliveredCount,
    openedCount,
    clickedCount,
    bouncedCount,
    failedCount,
    complainedCount,
    unsubscribedCount,
  };
}

function countsMatch(a: Counts, b: Counts): boolean {
  return (
    a.deliveredCount === b.deliveredCount &&
    a.openedCount === b.openedCount &&
    a.clickedCount === b.clickedCount &&
    a.bouncedCount === b.bouncedCount &&
    a.failedCount === b.failedCount &&
    a.complainedCount === b.complainedCount &&
    a.unsubscribedCount === b.unsubscribedCount
  );
}

// ─── Shared sync logic ────────────────────────────────────────────────────────

async function syncHistories(
  historyIds: string[],
  userId: string,
  forceCooldownBypass = false,
) {
  const cooldownCutoff = new Date(Date.now() - SYNC_COOLDOWN_MS);

  const histories = await prisma.emailHistory.findMany({
    where: {
      id: { in: historyIds },
      userId,
      ...(forceCooldownBypass
        ? {}
        : {
            OR: [{ syncedAt: null }, { syncedAt: { lt: cooldownCutoff } }],
          }),
    },
    select: {
      id: true,
      batchIds: true,
      sentCount: true,
      deliveredCount: true,
      openedCount: true,
      clickedCount: true,
      bouncedCount: true,
      failedCount: true,
      complainedCount: true,
      unsubscribedCount: true,
      status: true,
    },
  });

  if (histories.length === 0) return { synced: 0 };

  // Load all recipient events for these histories in one DB round-trip
  const allEvents = await prisma.emailRecipientEvent.findMany({
    where: { emailHistoryId: { in: histories.map((h) => h.id) } },
    select: {
      emailHistoryId: true,
      recipientEmail: true,
      status: true,
      resendMessageId: true,
    },
  });

  // Group by historyId
  const eventsByHistory = new Map<string, EventRow[]>();
  for (const event of allEvents) {
    const arr = eventsByHistory.get(event.emailHistoryId) ?? [];
    arr.push(event);
    eventsByHistory.set(event.emailHistoryId, arr);
  }

  let syncedCount = 0;

  for (const history of histories) {
    const existingEvents = eventsByHistory.get(history.id) ?? [];

    // ── PHASE 1: Aggregate from EmailRecipientEvent (our own DB) ─────────────
    const phase1Counts = aggregateFromEvents(existingEvents);

    // How many batchIds have no event row yet? (webhook gap)
    const coveredMessageIds = new Set(
      existingEvents.map((e) => e.resendMessageId).filter(Boolean) as string[],
    );
    const uncoveredBatchIds = (history.batchIds ?? []).filter(
      (id) => !coveredMessageIds.has(id),
    );

    // Total accounted for by Phase 1
    const phase1Total =
      phase1Counts.deliveredCount +
      phase1Counts.bouncedCount +
      phase1Counts.failedCount +
      phase1Counts.complainedCount +
      phase1Counts.unsubscribedCount;

    // If Phase 1 already accounts for everyone, skip Phase 2 entirely
    const allAccountedFor =
      history.sentCount > 0 && phase1Total >= history.sentCount;

    console.log(
      `[sync] ${history.id}: ${existingEvents.length} events, ` +
        `${uncoveredBatchIds.length}/${history.batchIds.length} uncovered batchIds, ` +
        `phase1Total=${phase1Total}/${history.sentCount} ` +
        `allAccountedFor=${allAccountedFor}`,
    );

    let finalCounts = phase1Counts;

    if (
      uncoveredBatchIds.length > 0 &&
      !allAccountedFor &&
      history.batchIds.length > 0
    ) {
      console.log(
        `[sync] ${history.id}: gap-filling ${uncoveredBatchIds.length} IDs via Resend API`,
      );

      const newEvents: {
        recipientEmail: string;
        status: string;
        resendMessageId: string;
      }[] = [];

      for (let i = 0; i < uncoveredBatchIds.length; i += RESEND_CHUNK_SIZE) {
        const chunk = uncoveredBatchIds.slice(i, i + RESEND_CHUNK_SIZE);

        const results = await Promise.all(
          chunk.map(async (messageId) => {
            try {
              const { data, error } = await resend.emails.get(messageId);
              if (error || !data) return null;
              return {
                messageId,
                lastEvent: (data.last_event as string | undefined) ?? null,
                to: Array.isArray(data.to) ? data.to[0] : data.to || "",
              };
            } catch {
              return null;
            }
          }),
        );

        for (const result of results) {
          if (!result?.lastEvent || !result.to) continue;
          if (eventPriority(result.lastEvent) < 2) continue;

          newEvents.push({
            recipientEmail: result.to,
            status: result.lastEvent,
            resendMessageId: result.messageId,
          });
        }

        if (i + RESEND_CHUNK_SIZE < uncoveredBatchIds.length) {
          await sleep(RESEND_CHUNK_PAUSE_MS);
        }
      }

      if (newEvents.length > 0) {
        // Deduplicate before inserting
        const toInsert = newEvents.filter(
          (e) =>
            !existingEvents.some(
              (ex) =>
                ex.resendMessageId === e.resendMessageId &&
                ex.status === e.status,
            ),
        );

        if (toInsert.length > 0) {
          await prisma.emailRecipientEvent.createMany({
            data: toInsert.map((e) => ({
              emailHistoryId: history.id,
              recipientEmail: e.recipientEmail,
              status: e.status,
              resendMessageId: e.resendMessageId,
            })),
          });
          console.log(
            `[sync] ${history.id}: wrote ${toInsert.length} new events from Resend gap-fill`,
          );
        }

        finalCounts = aggregateFromEvents([
          ...existingEvents,
          ...toInsert.map((e) => ({ ...e, emailHistoryId: history.id })),
        ]);
      }
    }

    // ── Write back to EmailHistory ────────────────────────────────────────────
    const updatedCounts: Counts = {
      deliveredCount: Math.max(
        history.deliveredCount,
        finalCounts.deliveredCount,
      ),
      openedCount: Math.max(history.openedCount, finalCounts.openedCount),
      clickedCount: Math.max(history.clickedCount, finalCounts.clickedCount),
      bouncedCount: Math.max(history.bouncedCount, finalCounts.bouncedCount),
      failedCount: Math.max(history.failedCount, finalCounts.failedCount),
      complainedCount: Math.max(
        history.complainedCount,
        finalCounts.complainedCount,
      ),
      unsubscribedCount: Math.max(
        history.unsubscribedCount,
        finalCounts.unsubscribedCount,
      ),
    };

    const changed = !countsMatch(
      {
        deliveredCount: history.deliveredCount,
        openedCount: history.openedCount,
        clickedCount: history.clickedCount,
        bouncedCount: history.bouncedCount,
        failedCount: history.failedCount,
        complainedCount: history.complainedCount,
        unsubscribedCount: history.unsubscribedCount,
      },
      updatedCounts,
    );

    await prisma.emailHistory.update({
      where: { id: history.id },
      data: {
        ...(changed ? updatedCounts : {}),
        syncedAt: new Date(),
        ...(updatedCounts.deliveredCount > 0 && history.status === "sending"
          ? { status: "sent" }
          : {}),
      },
    });

    if (changed) {
      console.log(`[sync] ${history.id}: wrote updated counts`, updatedCounts);
    }

    syncedCount++;
  }

  return { synced: syncedCount };
}

// ─── PUT /api/email-history — background polling ──────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { historyIds } = body;
    if (!Array.isArray(historyIds) || historyIds.length === 0) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    const result = await syncHistories(historyIds, user.id, false);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[sync] PUT error:", error);
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}

// ─── GET /api/email-history — forced trigger sync ─────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const result = await syncHistories([id], user.id, true);

    const updated = await prisma.emailHistory.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        deliveredCount: true,
        openedCount: true,
        clickedCount: true,
        bouncedCount: true,
        failedCount: true,
        complainedCount: true,
        unsubscribedCount: true,
        status: true,
        syncedAt: true,
      },
    });

    return NextResponse.json({ success: true, ...result, record: updated });
  } catch (error) {
    console.error("[sync] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
