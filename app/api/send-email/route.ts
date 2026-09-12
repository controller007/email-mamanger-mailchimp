import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import { emailComposeSchema } from "@/app/_lib/validations/email";
import prisma from "@/app/_lib/db/prisma";
import { inngest } from "@/app/_lib/inngest/client";

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

    // Load user's interval setting
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { sendIntervalSeconds: true },
    });
    const intervalSeconds = user?.sendIntervalSeconds ?? 0;

    // ── Step 1: Create EmailHistory rows first (need real IDs for CampaignJob) ─
    const emailHistoryIds: string[] = [];
    for (const listId of contactListIds) {
      const list = contactLists.find((l) => l.id === listId)!;
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
      emailHistoryIds.push(emailHistory.id);
    }

    // ── Step 2: Create CampaignJob using the real first EmailHistory ID ────────
    const campaignJob = await prisma.campaignJob.create({
      data: {
        userId: session.user.id,
        emailHistoryId: emailHistoryIds[0], // real ObjectId now
        status: "queued",
        intervalSeconds,
        totalContacts: 0,
      },
    });

    // ── Step 3: Fire ONE Inngest event — all lists processed sequentially ──────
    await inngest.send({
      name:
        sendMethod === "marketing"
          ? ("campaign/send-marketing" as const)
          : ("campaign/send" as const),
      data: {
        campaignJobId: campaignJob.id,
        userId: session.user.id,
        contactListIds,
        emailHistoryIds,
        senderId: sender.id,
        subject,
        emailBody,
        preheader: preheader || "",
        senderName: sender.name,
        senderEmail: sender.email,
        intervalSeconds,
        appUrl: safeAppUrl,
      },
    });

    return NextResponse.json({
      success: true,
      campaignJobId: campaignJob.id,
      emailHistoryIds,
      queued: contactListIds.length,
      message: `Campaign queued for ${contactListIds.length} list${contactListIds.length !== 1 ? "s" : ""}. Processing lists one at a time in the background.`,
    });
  } catch (error) {
    console.error("Error queuing campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
