// app/_lib/email/actions.ts
// Server actions for email-related data fetching

"use server";

import { getSession } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";

export async function getLastEmailSubject(): Promise<string | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const last = await prisma.emailHistory.findFirst({
    where: {
      userId: session.user.id,
      subject: {
        not: "",
      },
    },
    orderBy: { createdAt: "desc" },
    select: { subject: true },
  });

  return last?.subject ?? null;
}
