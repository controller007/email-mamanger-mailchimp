// app/api/webhooks/mailchimp-marketing/route.ts
//
// Mailchimp Marketing sends list webhooks as application/x-www-form-urlencoded
// POST bodies (data[...] keys). Registered per-audience in
// mailchimp-marketing-client.ts::addListWebhook.
// https://mailchimp.com/developer/marketing/api/list-webhooks/
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";

const COUNT_FIELD: Record<string, string> = {
  opened: "openedCount",
  clicked: "clickedCount",
  bounced: "bouncedCount",
  unsubscribed: "unsubscribedCount",
  complained: "complainedCount",
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);

    const type = params.get("type"); // subscribe | unsubscribe | campaign | cleaned
    const campaignId = params.get("data[id]") || params.get("data[campaign_id]");

    if (!campaignId) return NextResponse.json({ ok: true });

    const emailHistory = await prisma.emailHistory.findFirst({
      where: { mailchimpCampaignId: campaignId },
      select: { id: true, userId: true },
    });
    if (!emailHistory) return NextResponse.json({ ok: true });

    const recipientEmail = params.get("data[email]") || "";

    let status: string | null = null;
    if (type === "unsubscribe") status = "unsubscribed";
    else if (type === "cleaned") {
      const reason = params.get("data[reason]"); // hard-bounce | abuse | ...
      status = reason === "abuse" ? "complained" : "bounced";
    }

    if (!status || !recipientEmail) return NextResponse.json({ ok: true });

    if (status === "unsubscribed" || status === "bounced" || status === "complained") {
      await prisma.contact.updateMany({
        where: { email: recipientEmail },
        data:
          status === "bounced"
            ? { isBounced: true, isSubscribed: false }
            : { isComplained: status === "complained", isSubscribed: false },
      });
      await prisma.emailSuppression.upsert({
        where: { email: recipientEmail },
        create: { email: recipientEmail, reason: status, userId: emailHistory.userId },
        update: { reason: status },
      });
    }

    const existingEvent = await prisma.emailRecipientEvent.findFirst({
      where: { emailHistoryId: emailHistory.id, recipientEmail, status },
    });

    if (!existingEvent) {
      await prisma.emailRecipientEvent.create({
        data: { emailHistoryId: emailHistory.id, recipientEmail, status },
      });

      const countField = COUNT_FIELD[status];
      if (countField) {
        await prisma.emailHistory.update({
          where: { id: emailHistory.id },
          data: { [countField]: { increment: 1 } },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Mailchimp Marketing webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

// Mailchimp sends a validation GET request when a webhook is first registered
export async function GET() {
  return NextResponse.json({ ok: true });
}
