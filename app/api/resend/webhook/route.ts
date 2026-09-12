// app/api/resend/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";

function resendStatusToDbStatus(resendStatus: string): "verified" | "pending" {
  return resendStatus === "verified" ||
    resendStatus === "partially_verified" ||
    resendStatus === "partially_failed"
    ? "verified"
    : "pending";
}

function getTrackingInfoFromRecords(records: any[]): {
  trackingStatus: "verified" | "pending" | "failed" | null;
  trackingSubdomainName: string | null;
} {
  if (!Array.isArray(records))
    return { trackingStatus: null, trackingSubdomainName: null };

  const trackingRecord = records.find((r: any) => r.record === "Tracking");
  if (!trackingRecord)
    return { trackingStatus: null, trackingSubdomainName: null };

  const raw = trackingRecord.status; // "verified" | "not_started" | "pending" | "failed"
  let trackingStatus: "verified" | "pending" | "failed";

  if (raw === "verified") {
    trackingStatus = "verified";
  } else if (raw === "failed") {
    trackingStatus = "failed";
  } else {
    // "not_started" | "pending" | anything else → still pending from our POV
    trackingStatus = "pending";
  }

  // trackingRecord.name is the subdomain prefix e.g. "track" (not the full domain)
  const trackingSubdomainName = trackingRecord.name || "track";

  return { trackingStatus, trackingSubdomainName };
}

export async function POST(req: NextRequest) {
  try {
    // ── Signature verification ─────────────────────────────────────────────
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature =
        req.headers.get("svix-signature") ||
        req.headers.get("resend-signature");
      if (!signature) {
        console.warn("Webhook: Missing signature header");
      }
    }

    const event = await req.json();
    const { type, data } = event;

    // ── Domain events ──────────────────────────────────────────────────────
    if (type === "domain.updated" || type === "domain.verified") {
      const resendDomainId = data?.id;
      const resendStatus: string = data?.status ?? "";
      const records: any[] = data?.records ?? [];

      if (!resendDomainId) return NextResponse.json({ ok: true });

      const domain = await prisma.domain.findFirst({
        where: { resendId: resendDomainId },
      });
      if (!domain) return NextResponse.json({ ok: true });

      const newDbStatus = resendStatusToDbStatus(resendStatus);
      const dbUpdate: Record<string, any> = {};

      // ── Domain status ────────────────────────────────────────────────────
      // Only update status if:
      //   (a) domain is becoming verified for the first time, OR
      //   (b) domain is genuinely going back to pending (resendStatus is
      //       "pending" or "failed" — i.e. NOT any of the partially-* variants)
      // This prevents partially_verified/partially_failed from ever
      // downgrading a domain that was already verified.
      const domainIsCurrentlyVerified = domain.status === "verified";
      const newStatusIsVerified = newDbStatus === "verified";

      if (!domainIsCurrentlyVerified && newStatusIsVerified) {
        // First time going verified
        dbUpdate.status = "verified";
      } else if (domainIsCurrentlyVerified && !newStatusIsVerified) {
        // Only downgrade if Resend explicitly says failed/pending
        // (not partially_* — those keep the domain sendable)
        if (resendStatus === "failed" || resendStatus === "pending") {
          dbUpdate.status = "pending";
        }
        // partially_verified / partially_failed → do NOT touch status
      } else if (!domainIsCurrentlyVerified && !newStatusIsVerified) {
        // Still pending — keep as pending, nothing to do
      }
      // domainIsCurrentlyVerified && newStatusIsVerified → no change needed

      // ── Tracking status ──────────────────────────────────────────────────
      // Only process tracking if domain is verified (or becoming verified now)
      const willBeVerified =
        dbUpdate.status === "verified" || domainIsCurrentlyVerified;

      if (willBeVerified && records.length > 0) {
        const { trackingStatus, trackingSubdomainName } =
          getTrackingInfoFromRecords(records);

        if (trackingStatus !== null) {
          // We have a Tracking record in this payload — sync it
          dbUpdate.trackingStatus = trackingStatus;

          // If subdomain isn't persisted yet, save it from the record name
          if (!domain.trackingSubdomain && trackingSubdomainName) {
            dbUpdate.trackingSubdomain = trackingSubdomainName;
          }

          console.log(
            `Webhook: ${domain.domain} tracking → ${trackingStatus} (record status: ${records.find((r) => r.record === "Tracking")?.status}, Resend domain status: ${resendStatus})`,
          );
        } else {
          // No Tracking record in this payload — domain just became verified
          // without a tracking subdomain. trackingStatus stays null/unchanged.
          console.log(
            `Webhook: ${domain.domain} verified (no tracking record in payload yet)`,
          );
        }
      }

      if (Object.keys(dbUpdate).length > 0) {
        await prisma.domain.update({
          where: { id: domain.id },
          data: dbUpdate,
        });
        console.log(
          `Webhook domain.updated: ${domain.domain} → DB update:`,
          JSON.stringify(dbUpdate),
        );
      } else {
        console.log(
          `Webhook domain.updated: ${domain.domain} → no DB changes needed (resendStatus=${resendStatus})`,
        );
      }

      return NextResponse.json({ ok: true });
    }

    // ── Email events ───────────────────────────────────────────────────────
    const tags = data?.tags || {};
    const tagHistoryId =
      typeof tags === "object" && !Array.isArray(tags)
        ? tags["email_history_id"]
        : undefined;

    const legacyBroadcastId = data?.broadcast_id;
    const recipientEmail: string = Array.isArray(data?.to)
      ? data.to[0]
      : data?.to || "";

    let emailHistory: { id: string; userId: string } | null = null;

    if (tagHistoryId) {
      emailHistory = await prisma.emailHistory.findUnique({
        where: { id: tagHistoryId },
        select: { id: true, userId: true },
      });
    }

    if (!emailHistory && legacyBroadcastId) {
      console.log(
        `Webhook: Legacy broadcastId ${legacyBroadcastId} — no history found`,
      );
    }

    if (!emailHistory) {
      console.log(
        `Webhook: No EmailHistory for event ${type}, tags=${JSON.stringify(tags)}`,
      );
      return NextResponse.json({ ok: true });
    }

    const historyId = emailHistory.id;
    const userId = emailHistory.userId;

    let updateData: Record<string, any> = {};
    let recipientStatus = "";
    let clickedUrl: string | undefined;

    switch (type) {
      case "email.sent":
        recipientStatus = "sent";
        updateData = {};
        break;

      case "email.delivered":
        updateData = { deliveredCount: { increment: 1 } };
        recipientStatus = "delivered";
        break;

      case "email.opened":
        updateData = { openedCount: { increment: 1 } };
        recipientStatus = "opened";
        break;

      case "email.clicked":
        clickedUrl = data?.click?.link || data?.link || undefined;
        updateData = { clickedCount: { increment: 1 } };
        recipientStatus = "clicked";
        break;

      case "email.bounced":
      case "email.failed":
        updateData = { bouncedCount: { increment: 1 } };
        recipientStatus = type === "email.bounced" ? "bounced" : "failed";
        if (recipientEmail) {
          await prisma.contact.updateMany({
            where: { email: recipientEmail, contactListId: undefined },
            data: { isBounced: true, isSubscribed: false },
          });
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "bounced", userId },
            update: { reason: "bounced" },
          });
        }
        break;

      case "email.complained":
        updateData = { complainedCount: { increment: 1 } };
        recipientStatus = "complained";
        if (recipientEmail) {
          await prisma.contact.updateMany({
            where: { email: recipientEmail },
            data: { isComplained: true, isSubscribed: false },
          });
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "complained", userId },
            update: { reason: "complained" },
          });
        }
        break;

      case "email.unsubscribed":
      case "contact.unsubscribed":
        updateData = { unsubscribedCount: { increment: 1 } };
        recipientStatus = "unsubscribed";
        if (recipientEmail) {
          await prisma.contact.updateMany({
            where: { email: recipientEmail },
            data: { isSubscribed: false },
          });
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "unsubscribed", userId },
            update: { reason: "unsubscribed" },
          });
        }
        break;

      default:
        console.log("Unhandled webhook event type:", type);
        return NextResponse.json({ ok: true });
    }

    // Deduplicate recipient events (except clicks — each click is unique)
    if (recipientStatus && recipientEmail) {
      const existingEvent =
        type !== "email.clicked"
          ? await prisma.emailRecipientEvent.findFirst({
              where: {
                emailHistoryId: historyId,
                recipientEmail,
                status: recipientStatus,
              },
            })
          : null;

      if (!existingEvent) {
        await prisma.emailRecipientEvent.create({
          data: {
            emailHistoryId: historyId,
            recipientEmail,
            status: recipientStatus,
            clickedUrl: clickedUrl || null,
            resendMessageId: data?.email_id || data?.id || null,
          },
        });

        if (Object.keys(updateData).length > 0) {
          await prisma.emailHistory.update({
            where: { id: historyId },
            data: updateData,
          });
        }

        console.log(
          `Webhook: ${type} → historyId=${historyId}, email=${recipientEmail}`,
        );
      } else {
        console.log(`Webhook: duplicate ${type} ignored for ${recipientEmail}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
