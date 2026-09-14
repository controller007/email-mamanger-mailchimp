// app/api/contact-lists/[id]/readiness/route.ts
//
// Lightweight, stateless readiness check for a contact list's Mailchimp
// Marketing audience — polled client-side (TanStack Query, see
// use-contact-list-readiness.ts) from the send-email and contact-lists
// pages so the UI knows an audience is actually sendable *before* the user
// hits send, instead of the backend blocking the request to find out.
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { isCampaignSendReady } from "@/app/_lib/email/mailchimp-marketing-client";

export type ContactListReadiness =
  | "ready" // confirmed sendable, or never sent via marketing yet (nothing to block on)
  | "not_ready"; // audience/recipient index still syncing on Mailchimp's side

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    const list = await prisma.contactList.findFirst({
      where: { id: params.id, createdBy: user.id },
      select: { mailchimpAudienceId: true },
    });
    if (!list) {
      return NextResponse.json({ error: "Contact list not found" }, { status: 404 });
    }

    // Never synced to Mailchimp Marketing (transactional-only so far, or
    // never sent at all) — nothing to be "not ready", so it's selectable.
    if (!list.mailchimpAudienceId) {
      return NextResponse.json({ status: "ready" satisfies ContactListReadiness });
    }

    // Readiness is really a property of a campaign's send-checklist, not
    // the audience directly — the most recent marketing campaign against
    // this list is the best live proxy for "is the audience's recipient
    // index caught up".
    const lastCampaign = await prisma.emailHistory.findFirst({
      where: { contactListId: params.id, sendMethod: "marketing", mailchimpCampaignId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { mailchimpCampaignId: true },
    });
    if (!lastCampaign?.mailchimpCampaignId) {
      return NextResponse.json({ status: "ready" satisfies ContactListReadiness });
    }

    try {
      const ready = await isCampaignSendReady(lastCampaign.mailchimpCampaignId);
      return NextResponse.json({
        status: (ready ? "ready" : "not_ready") satisfies ContactListReadiness,
      });
    } catch {
      // Campaign since deleted, or Mailchimp hiccup — don't block the user
      // indefinitely over a lookup failure.
      return NextResponse.json({ status: "ready" satisfies ContactListReadiness });
    }
  } catch (error) {
    console.error("[contact-lists/readiness] error:", error);
    return NextResponse.json({ error: "Failed to check readiness" }, { status: 500 });
  }
}
