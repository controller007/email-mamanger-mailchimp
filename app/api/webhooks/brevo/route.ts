// app/api/webhooks/brevo/route.ts - BREVO WEBHOOK HANDLER
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";
import type { BrevoWebhookEvent } from "@/types/brevo";
import { log } from "console";

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.has("authorization")) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    // 2. Check Bearer format
    const authHeader = req.headers.get("authorization") || "";
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return NextResponse.json(
        { error: "Invalid Authorization format" },
        { status: 400 }
      );
    }

    const token = parts[1];

    if (token !== process.env.BREVO_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Invalid webhook token" },
        { status: 403 }
      );
    }

    const event: BrevoWebhookEvent = await req.json();
    console.log("Brevo Webhook Event:", event);
    const { event: eventType, email, tag, campaign_id } = event;

    console.log("Brevo webhook received:", eventType, {
      email,
      tag,
      campaign_id,
    });

    // Extract emailHistoryId from tag (format: "history-{id}")
    let emailHistoryId: string | undefined;

    if (tag) {
      try {
        const parsedTags = JSON.parse(tag); 

        if (Array.isArray(parsedTags)) {
          const historyTag = parsedTags.find((t) => t.startsWith("history-"));
          emailHistoryId = historyTag?.replace("history-", "");
        }
      } catch (err) {
        console.error("Invalid tag format:", tag);
      }
    }

    // If campaign, find by campaignId
    // if (!emailHistoryId && campaign_id) {
    //   const emailHistory = await prisma.emailHistory.findFirst({
    //     where: { campaignId: campaign_id },
    //   });
    //   emailHistoryId = emailHistory?.id;
    // }

    if (!emailHistoryId) {
      console.warn("Brevo webhook: No emailHistoryId found");
      return NextResponse.json({ ok: true });
    }

    const emailHistory = await prisma.emailHistory.findUnique({
      where: { id: emailHistoryId },
    });

    if (!emailHistory) {
      console.warn(
        `Brevo webhook: EmailHistory not found for ${emailHistoryId}`
      );
      return NextResponse.json({ ok: true });
    }

    let updateData: Record<string, any> = {};
    let recipientStatus = "";

    switch (eventType) {
      case "delivered":
      case "request":
        updateData = { deliveredCount: { increment: 1 } };
        recipientStatus = "delivered";
        break;

      case "opened":
      case "open":
      case "unique_opened":
        updateData = { openedCount: { increment: 1 } };
        recipientStatus = "opened";
        break;

      case "clicked":
      case "click":
      case "unique_clicked":
        updateData = { clickedCount: { increment: 1 } };
        recipientStatus = "clicked";
        break;

      case "hard_bounce":
        updateData = {
          bouncedCount: { increment: 1 },
          failedCount: { increment: 1 },
        };
        recipientStatus = "hard_bounce";
        break;

      case "soft_bounce":
        updateData = { bouncedCount: { increment: 1 } };
        recipientStatus = "soft_bounce";
        break;

      case "blocked":
      case "error":
      case "invalid_email":
        updateData = { failedCount: { increment: 1 } };
        recipientStatus = "failed";
        break;

      case "unsubscribed":
        recipientStatus = "unsubscribed";
        break;

      case "complaint":
      case "spam":
        updateData = { failedCount: { increment: 1 } };
        recipientStatus = "spam";
        break;

      default:
        console.log("Unhandled Brevo event type:", eventType);
        return NextResponse.json({ ok: true });
    }

    if (!email) {
      console.warn("Brevo webhook: No email found in event");
      return NextResponse.json({ ok: true });
    }

    // Check for duplicate event
    const existingEvent = await prisma.emailRecipientEvent.findFirst({
      where: {
        emailHistoryId: emailHistory.id,
        recipientEmail: email,
        status: recipientStatus,
      },
    });

    if (!existingEvent && recipientStatus) {
      await prisma.emailRecipientEvent.create({
        data: {
          emailHistoryId: emailHistory.id,
          recipientEmail: email,
          status: recipientStatus,
        },
      });

      if (Object.keys(updateData).length > 0) {
        await prisma.emailHistory.update({
          where: { id: emailHistory.id },
          data: updateData,
        });
      }

      console.log(
        `Brevo webhook logged (historyId=${emailHistoryId}, email=${email}) → ${recipientStatus}`
      );
    } else {
      console.log(
        `Brevo webhook duplicate ignored (historyId=${emailHistoryId}, email=${email}, status=${recipientStatus})`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Brevo webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
