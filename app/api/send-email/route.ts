import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import { emailComposeSchema } from "@/app/_lib/validations/email";
import prisma from "@/app/_lib/db/prisma";
import {
  sendTransactionalCampaign,
  sendMarketingCampaign,
  loadContactsForList,
} from "@/app/_lib/email/send-campaign";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Server misconfiguration: NEXT_PUBLIC_APP_URL not set." },
        { status: 500 },
      );
    }
    const safeAppUrl = appUrl || "http://localhost:3000";

    const body = await request.json();
    const validationResult = emailComposeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 },
      );
    }

    const {
      subject,
      body: emailBody,
      contactListIds,
      senderId,
      preheader,
      sendMethod,
    } = validationResult.data;

    // Validate sender
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: session.user.id },
      include: { domain: true },
    });
    if (!sender || sender.domain.status !== "verified") {
      return NextResponse.json(
        { error: "Sender not found or domain not verified" },
        { status: 400 },
      );
    }

    // Marketing and Transactional verify independently per domain — a
    // domain being "verified" overall doesn't mean it's cleared for both.
    const requiredStatus =
      sendMethod === "marketing"
        ? sender.domain.marketingStatus
        : sender.domain.transactionalStatus;
    if (requiredStatus !== "verified") {
      return NextResponse.json(
        {
          error: `${sender.domain.domain} isn't verified for ${sendMethod} sends yet.`,
        },
        { status: 400 },
      );
    }

    // Validate all lists belong to this user
    const contactLists = await prisma.contactList.findMany({
      where: { id: { in: contactListIds }, createdBy: session.user.id },
    });
    if (contactLists.length !== contactListIds.length) {
      return NextResponse.json(
        { error: "One or more contact lists not found" },
        { status: 404 },
      );
    }

    // A list isn't "ready to send" just because it has rows — subscription
    // status, bounces, complaints, and suppressions can all bring the
    // actually-sendable count to zero even for a list that looks populated.
    // Reject up front rather than silently marking a 0-recipient send
    // "sent" (which send-campaign.ts's own contacts.length === 0 branch
    // does, as a defensive fallback for paths that don't go through here,
    // like a retry).
    const notReadyLists: string[] = [];
    for (const list of contactLists) {
      const contacts = await loadContactsForList(list.id, session.user.id);
      if (contacts.length === 0) notReadyLists.push(list.name);
    }
    if (notReadyLists.length > 0) {
      return NextResponse.json(
        {
          error: `No sendable contacts in: ${notReadyLists.join(", ")}. Every contact is unsubscribed, bounced, complained, or suppressed.`,
        },
        { status: 400 },
      );
    }

    // ── Create one EmailHistory row per list, then send to each in turn ────────
    const sendFn = sendMethod === "marketing" ? sendMarketingCampaign : sendTransactionalCampaign;

    const results: Array<{ contactListId: string; emailHistoryId: string; sent: number; failed: number }> = [];

    for (const list of contactLists) {
      const emailHistory = await prisma.emailHistory.create({
        data: {
          subject,
          body: emailBody,
          preheader: preheader || null,
          contactListId: list.id,
          userId: session.user.id,
          senderId: sender.id,
          senderEmail: sender.email,
          senderName: sender.name,
          sendMethod,
          status: "queued",
          sentCount: 0,
        },
      });

      try {
        const { sent, failed } = await sendFn({
          contactListId: list.id,
          emailHistoryId: emailHistory.id,
          userId: session.user.id,
          subject,
          emailBody,
          preheader: preheader || "",
          senderName: sender.name,
          senderEmail: sender.email,
          appUrl: safeAppUrl,
        });
        results.push({ contactListId: list.id, emailHistoryId: emailHistory.id, sent, failed });
      } catch (err) {
        console.error(`Failed to send to list ${list.id}:`, err);
        await prisma.emailHistory.update({
          where: { id: emailHistory.id },
          data: { status: "failed" },
        });
        results.push({ contactListId: list.id, emailHistoryId: emailHistory.id, sent: 0, failed: 0 });
      }
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    return NextResponse.json({
      success: true,
      emailHistoryIds: results.map((r) => r.emailHistoryId),
      queued: contactLists.length,
      sent: totalSent,
      failed: totalFailed,
      message: `Sent to ${totalSent} recipient${totalSent !== 1 ? "s" : ""} across ${contactLists.length} list${contactLists.length !== 1 ? "s" : ""}.`,
    });
  } catch (error) {
    console.error("Error sending campaign:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Failed to send campaign: ${error.message}`
            : "Internal server error",
      },
      { status: 500 },
    );
  }
}
