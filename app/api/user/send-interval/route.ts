// app/api/user/send-interval/route.ts
// GET  → returns the current user's sendIntervalSeconds
// PATCH → updates it

import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { sendIntervalSeconds: true },
  });
  return NextResponse.json({ sendIntervalSeconds: user?.sendIntervalSeconds ?? 0 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const seconds = Number(body.sendIntervalSeconds);
  if (isNaN(seconds) || seconds < 0 || seconds > 300) {
    return NextResponse.json(
      { error: "sendIntervalSeconds must be 0–300" },
      { status: 400 },
    );
  }
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { sendIntervalSeconds: Math.floor(seconds) },
    select: { sendIntervalSeconds: true },
  });
  return NextResponse.json({ sendIntervalSeconds: updated.sendIntervalSeconds });
}
