"use server"

import prisma from "@/app/_lib/db/prisma"
import { requireAuth } from "@/app/_lib/auth/session"
import { revalidatePath } from "next/cache"
import { deleteCampaign } from "@/app/_lib/email/mailchimp-marketing-client"
import {
  sendMarketingCampaign,
  sendTransactionalCampaign,
  loadContactsForList,
} from "@/app/_lib/email/send-campaign"

// Best-effort: a campaign that was already sent (or already removed on
// Mailchimp's side) can't be deleted there — that shouldn't block removing
// the local record, so failures are only logged.
async function deleteMailchimpCampaigns(
  histories: { mailchimpCampaignId: string | null; sendMethod: string }[],
) {
  const campaignIds = histories
    .filter((h) => h.sendMethod === "marketing" && h.mailchimpCampaignId)
    .map((h) => h.mailchimpCampaignId as string)

  const results = await Promise.allSettled(
    campaignIds.map((id) => deleteCampaign(id)),
  )
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(
        `[email-history] Failed to delete Mailchimp campaign ${campaignIds[i]}:`,
        r.reason,
      )
    }
  })
}

export async function retryEmailHistory(id: string) {
  const user = await requireAuth()

  const existing = await prisma.emailHistory.findUnique({
    where: { id, userId: user.id },
  })
  if (!existing) throw new Error("Campaign not found")
  if (existing.status !== "failed") {
    throw new Error("Only failed campaigns can be retried")
  }

  // Same "is this list actually ready to send to" check as /api/send-email —
  // a contact could've been unsubscribed/bounced/suppressed since the
  // original failed attempt, and retrying against zero sendable contacts
  // would just silently mark this "sent" again with nothing actually sent.
  const contacts = await loadContactsForList(existing.contactListId, user.id)
  if (contacts.length === 0) {
    throw new Error(
      "No sendable contacts left on this list — every contact is unsubscribed, bounced, complained, or suppressed.",
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const sendFn =
    existing.sendMethod === "marketing" ? sendMarketingCampaign : sendTransactionalCampaign

  try {
    await sendFn({
      contactListId: existing.contactListId,
      emailHistoryId: existing.id,
      userId: user.id,
      subject: existing.subject,
      emailBody: existing.body,
      preheader: existing.preheader || "",
      senderName: existing.senderName || "",
      senderEmail: existing.senderEmail || "",
      appUrl,
    })
  } catch (error) {
    // Same pattern as the original /api/send-email route: a thrown error
    // means the send function's own "sending" update never reached "sent",
    // so it has to be reset here or the record is stuck at "sending" forever.
    await prisma.emailHistory.update({
      where: { id: existing.id },
      data: { status: "failed" },
    })
    revalidatePath("/")
    throw error instanceof Error ? error : new Error("Retry failed")
  }

  revalidatePath("/")
}

export async function deleteEmailHistory(id: string) {
  const user = await requireAuth()

  const existing = await prisma.emailHistory.findUnique({
    where: { id, userId: user.id },
    select: { mailchimpCampaignId: true, sendMethod: true },
  })
  if (existing) {
    await deleteMailchimpCampaigns([existing])
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailRecipientEvent.deleteMany({
      where: { emailHistoryId: id },
    })
    await tx.emailHistory.delete({
      where: { id, userId: user.id },
    })
  })

  revalidatePath("/")
}

export async function deleteManyEmailHistories(ids: string[]) {
  const user = await requireAuth()

  const existing = await prisma.emailHistory.findMany({
    where: { id: { in: ids }, userId: user.id },
    select: { mailchimpCampaignId: true, sendMethod: true },
  })
  await deleteMailchimpCampaigns(existing)

  await prisma.$transaction(async (tx) => {
    await tx.emailRecipientEvent.deleteMany({
      where: { emailHistoryId: { in: ids } },
    })
    await tx.emailHistory.deleteMany({
      where: { id: { in: ids }, userId: user.id },
    })
  })

  revalidatePath("/")
}

export async function clearAllEmailHistories() {
  const user = await requireAuth()

  const existing = await prisma.emailHistory.findMany({
    where: { userId: user.id },
    select: { mailchimpCampaignId: true, sendMethod: true },
  })
  await deleteMailchimpCampaigns(existing)

  await prisma.$transaction(async (tx) => {
    await tx.emailRecipientEvent.deleteMany({
      where: {
        emailHistory: { userId: user.id },
      },
    })
    await tx.emailHistory.deleteMany({
      where: { userId: user.id },
    })
  })

  revalidatePath("/")
}
