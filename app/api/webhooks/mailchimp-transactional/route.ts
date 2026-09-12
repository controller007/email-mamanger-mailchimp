// app/api/webhooks/mailchimp-transactional/route.ts
//
// Mandrill posts a single form field `mandrill_events` containing a JSON
// array of event objects. Reference:
// https://mailchimp.com/developer/transactional/api/webhooks/
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/app/_lib/db/prisma";

// Mandrill event "event" values -> our internal EmailRecipientEvent.status vocabulary
const EVENT_MAP: Record<string, string> = {
  send: "sent",
  deferral: "sent",
  hard_bounce: "bounced",
  soft_bounce: "bounced",
  open: "opened",
  click: "clicked",
  spam: "complained",
  unsub: "unsubscribed",
  reject: "failed",
};

const COUNT_FIELD: Record<string, string> = {
  bounced: "bouncedCount",
  opened: "openedCount",
  clicked: "clickedCount",
  complained: "complainedCount",
  unsubscribed: "unsubscribedCount",
};

function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MAILCHIMP_WEBHOOK_SECRET;
  if (!secret) return true; // best-effort: no secret configured, skip verification

  const signature = req.headers.get("x-mandrill-signature");
  if (!signature) return false;

  // Mandrill signs: webhook_url + sorted(POST param keys + values concatenated)
  // Since this route only ever receives `mandrill_events`, and Next.js gives
  // us the raw urlencoded body, we reconstruct the signed string from it.
  const url = `${req.nextUrl.origin}${req.nextUrl.pathname}`;
  const params = new URLSearchParams(rawBody);
  let signedData = url;
  params.forEach((value, key) => {
    signedData += key + value;
  });

  const expected = createHmac("sha1", secret).update(signedData).digest("base64");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    if (!verifySignature(req, rawBody)) {
      console.warn("Mailchimp Transactional webhook: signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const params = new URLSearchParams(rawBody);
    const eventsJson = params.get("mandrill_events");
    if (!eventsJson) return NextResponse.json({ ok: true });

    const events = JSON.parse(eventsJson) as any[];

    for (const evt of events) {
      const status = EVENT_MAP[evt.event];
      if (!status) continue;

      const msg = evt.msg || {};
      const metadata = msg.metadata || {};
      const tags: string[] = msg.tags || [];

      let historyId: string | undefined = metadata.email_history_id;
      if (!historyId) {
        const tag = tags.find((t) => t.startsWith("email_history_id_"));
        if (tag) historyId = tag.replace("email_history_id_", "");
      }
      if (!historyId) {
        console.log(`Mailchimp Transactional webhook: no history id for event ${evt.event}`);
        continue;
      }

      const emailHistory = await prisma.emailHistory.findUnique({
        where: { id: historyId },
        select: { id: true, userId: true },
      });
      if (!emailHistory) continue;

      const recipientEmail: string = msg.email || "";
      const clickedUrl: string | undefined = evt.url || undefined;

      if (recipientEmail) {
        if (status === "bounced") {
          await prisma.contact.updateMany({
            where: { email: recipientEmail },
            data: { isBounced: true, isSubscribed: false },
          });
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "bounced", userId: emailHistory.userId },
            update: { reason: "bounced" },
          });
        } else if (status === "complained") {
          await prisma.contact.updateMany({
            where: { email: recipientEmail },
            data: { isComplained: true, isSubscribed: false },
          });
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "complained", userId: emailHistory.userId },
            update: { reason: "complained" },
          });
        } else if (status === "unsubscribed") {
          await prisma.contact.updateMany({
            where: { email: recipientEmail },
            data: { isSubscribed: false },
          });
          await prisma.emailSuppression.upsert({
            where: { email: recipientEmail },
            create: { email: recipientEmail, reason: "unsubscribed", userId: emailHistory.userId },
            update: { reason: "unsubscribed" },
          });
        }
      }

      const existingEvent =
        status !== "clicked"
          ? await prisma.emailRecipientEvent.findFirst({
              where: { emailHistoryId: historyId, recipientEmail, status },
            })
          : null;

      if (!existingEvent) {
        await prisma.emailRecipientEvent.create({
          data: {
            emailHistoryId: historyId,
            recipientEmail,
            status,
            clickedUrl: clickedUrl || null,
            providerMessageId: msg._id || null,
          },
        });

        const countField = COUNT_FIELD[status];
        if (countField) {
          await prisma.emailHistory.update({
            where: { id: historyId },
            data: { [countField]: { increment: 1 } },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Mailchimp Transactional webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

// Mandrill sends a validation GET/HEAD request when a webhook is first registered
export async function GET() {
  return NextResponse.json({ ok: true });
}
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
