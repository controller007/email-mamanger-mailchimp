// app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";

// GET — redirect to the public unsubscribe confirmation page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const historyId = searchParams.get("historyId");

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const redirectUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(email)}${historyId ? `&historyId=${historyId}` : ""}`;

  return NextResponse.redirect(redirectUrl);
}

// POST — RFC 8058 one-click unsubscribe (called by email clients)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const email =
      params.get("email") ||
      new URL(request.url).searchParams.get("email") ||
      "";

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const decodedEmail = decodeURIComponent(email).toLowerCase().trim();

    // Unsubscribe the contact across all lists
    await prisma.contact.updateMany({
      where: { email: decodedEmail },
      data: { isSubscribed: false },
    });

    // Find the userId from an EmailHistory or Contact to associate suppression
    const contact = await prisma.contact.findFirst({
      where: { email: decodedEmail },
      include: { contactList: { select: { createdBy: true } } },
    });

    const userId = contact?.contactList?.createdBy;

    if (userId) {
      await prisma.emailSuppression.upsert({
        where: { email: decodedEmail },
        create: { email: decodedEmail, reason: "unsubscribed", userId },
        update: { reason: "unsubscribed" },
      });
    }

    console.log(`One-click unsubscribe: ${decodedEmail}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}
