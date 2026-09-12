// app/api/send-test-email/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import { resend, generateEmailTemplate } from "@/app/_lib/email/resend-client";
import prisma from "@/app/_lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { testEmail, subject, emailBody, senderId, preheader } = body;

    if (!testEmail || !subject || !emailBody || !senderId) {
      return NextResponse.json(
        { error: "testEmail, subject, emailBody, and senderId are required" },
        { status: 400 },
      );
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(testEmail)) {
      return NextResponse.json(
        { error: "Invalid test email address" },
        { status: 400 },
      );
    }

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

    const html = generateEmailTemplate({
      body: emailBody,
      subject,
      senderName: sender.name,
      preheader,
      variables: {
        first_name: "Test",
        last_name: "User",
        full_name: "Test User",
        email: testEmail,
        company: "Test Company",
      },
    });

    const { error } = await resend.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html,
    });

    if (error) {
      console.error("Test email error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send test email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
    });
  } catch (error) {
    console.error("Send test email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
