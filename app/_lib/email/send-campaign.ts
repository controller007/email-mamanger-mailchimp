// app/_lib/email/send-campaign.ts
//
// Synchronous campaign sending — runs directly inside the /api/send-email
// request instead of through a background job queue. Mailchimp's own APIs
// (Mandrill's messages/send, Marketing's create-campaign/send-campaign) are
// already just a handful of direct HTTP calls; there's no orchestration
// need that justified the Inngest layer this used to go through, and
// Inngest was never configured for production (needs its own Cloud
// account + keys), so every send failed with "fetch failed" trying to
// reach a local dev orchestrator that doesn't exist there.
//
// Tradeoff: the per-recipient send-interval staggering feature is gone —
// sends now go out back-to-back (with a small fixed gap to stay under
// Mandrill's rate limits), and a very large campaign could hit a
// serverless function's execution time limit. Fine for the list sizes
// this app expects; revisit with a real queue if that changes.

import {
  sendMessage as mandrillSend,
  type MandrillSendResult,
} from "@/app/_lib/email/mailchimp-transactional-client";
import {
  createAudience,
  syncAudienceMembers,
  createCampaign,
  getCampaign,
  setCampaignContent,
  sendCampaign,
  addListWebhook,
} from "@/app/_lib/email/mailchimp-marketing-client";
import {
  generateEmailTemplate,
  replaceVariables,
  replaceVariablesWithMergeTags,
} from "@/app/_lib/email/html-template";
import prisma from "@/app/_lib/db/prisma";

const SEND_GAP_MS = 600;
const MAX_SEND_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 3000, 8000];

async function sendWithRetry(
  payload: Parameters<typeof mandrillSend>[0],
): Promise<{ data: MandrillSendResult | null; error: Error | null }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_SEND_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 8000;
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const [result] = await mandrillSend(payload);

      if (result.status === "rejected" || result.status === "invalid") {
        return {
          data: null,
          error: new Error(result.reject_reason || result.status),
        };
      }

      return { data: result, error: null };
    } catch (err: unknown) {
      lastError = err;
      const isRetryable =
        err instanceof Error &&
        (err.message.toLowerCase().includes("rate") ||
          err.message.toLowerCase().includes("429") ||
          err.message.toLowerCase().includes("network") ||
          err.message.toLowerCase().includes("econnreset"));

      if (isRetryable && attempt < MAX_SEND_RETRIES) continue;
      throw err;
    }
  }

  return { data: null, error: lastError as Error };
}

export async function loadContactsForList(contactListId: string, userId: string) {
  const suppressions = await prisma.emailSuppression.findMany({
    where: { userId },
    select: { email: true },
  });
  const suppressedSet = new Set(suppressions.map((s) => s.email));

  const dbContacts = await prisma.contact.findMany({
    where: {
      contactListId,
      isSubscribed: true,
      isBounced: false,
      isComplained: false,
    },
    select: { email: true, firstName: true, lastName: true, company: true },
  });

  if (dbContacts.length > 0) {
    return dbContacts.filter((c) => !suppressedSet.has(c.email));
  }

  const list = await prisma.contactList.findUnique({
    where: { id: contactListId },
    select: { emails: true },
  });
  return (list?.emails ?? [])
    .filter((e) => !suppressedSet.has(e))
    .map((e) => ({
      email: e,
      firstName: null as string | null,
      lastName: null as string | null,
      company: null as string | null,
    }));
}

export interface SendCampaignParams {
  contactListId: string;
  emailHistoryId: string;
  userId: string;
  subject: string;
  emailBody: string;
  preheader: string;
  senderName: string;
  senderEmail: string;
  appUrl: string;
}

export interface SendCampaignResult {
  sent: number;
  failed: number;
}

// ── Transactional path: one Mandrill send per contact ───────────────────────

export async function sendTransactionalCampaign(
  params: SendCampaignParams,
): Promise<SendCampaignResult> {
  const {
    contactListId,
    emailHistoryId,
    userId,
    subject,
    emailBody,
    preheader,
    senderName,
    senderEmail,
    appUrl,
  } = params;

  await prisma.emailHistory.update({
    where: { id: emailHistoryId },
    data: { status: "sending" },
  });

  const contacts = await loadContactsForList(contactListId, userId);

  if (contacts.length === 0) {
    await prisma.emailHistory.update({
      where: { id: emailHistoryId },
      data: { status: "sent", sentCount: 0 },
    });
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const messageIds: string[] = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    const variables: Record<string, string> = {
      first_name: contact.firstName || "",
      last_name: contact.lastName || "",
      full_name: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      email: contact.email,
      company: contact.company || "",
    };

    const personalizedBody = replaceVariables(emailBody, variables);
    const personalizedSubject = replaceVariables(subject, variables);
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(
      contact.email,
    )}&historyId=${emailHistoryId}`;

    const html = generateEmailTemplate({
      body: personalizedBody,
      subject: personalizedSubject,
      senderName,
      preheader: replaceVariables(preheader || "", variables),
      unsubscribeUrl,
      variables,
    });

    try {
      const { data, error } = await sendWithRetry({
        from: { email: senderEmail, name: senderName },
        to: [{ email: contact.email }],
        subject: personalizedSubject,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: ["email_history_id_" + emailHistoryId],
        metadata: { email_history_id: emailHistoryId, contact_list_id: contactListId },
      });

      if (error || !data?._id) {
        console.error(`[send-campaign] FAILED for ${contact.email}:`, error);
        failed++;
        await prisma.emailRecipientEvent.create({
          data: { emailHistoryId, recipientEmail: contact.email, status: "failed" },
        });
      } else {
        sent++;
        messageIds.push(data._id);
        try {
          await prisma.emailRecipientEvent.create({
            data: {
              emailHistoryId,
              recipientEmail: contact.email,
              status: "sent",
              providerMessageId: data._id,
            },
          });
        } catch (dbErr: any) {
          if (dbErr?.code !== "P2002") {
            console.error(`[send-campaign] DB write error for ${contact.email}:`, dbErr);
          }
        }
      }
    } catch (err) {
      console.error(`[send-campaign] Unretryable failure for ${contact.email}:`, err);
      failed++;
    }

    if (i < contacts.length - 1) {
      await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    }
  }

  await prisma.emailHistory.update({
    where: { id: emailHistoryId },
    data: {
      status: failed === contacts.length ? "failed" : "sent",
      sentCount: sent,
      failedCount: failed,
      batchIds: messageIds,
    },
  });

  return { sent, failed };
}

// A retry re-runs sendMarketingCampaign() against the same EmailHistory
// record — without this, createCampaign() would fire again unconditionally
// every time, leaving the previous attempt's campaign as a permanently
// untracked orphan on Mailchimp the moment its id gets overwritten in our
// DB. Reuse the campaign from the last attempt (still saved on the
// EmailHistory row) as long as it's still a draft there; only create fresh
// if there's no prior campaign, or the saved one turns out to be gone or
// already sent (checked via a live GET, not assumed).
async function getOrCreateCampaign(params: {
  emailHistoryId: string;
  audienceId: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
}): Promise<string> {
  const { emailHistoryId, audienceId, subject, fromName, fromEmail, replyTo } = params;

  const existing = await prisma.emailHistory.findUnique({
    where: { id: emailHistoryId },
    select: { mailchimpCampaignId: true },
  });

  if (existing?.mailchimpCampaignId) {
    try {
      const campaign = await getCampaign(existing.mailchimpCampaignId);
      if (campaign.status === "save") {
        return campaign.id;
      }
    } catch {
      // Deleted on Mailchimp's side, or some other lookup failure — fall
      // through and create a new one below.
    }
  }

  const campaign = await createCampaign({
    audienceId,
    subject,
    fromName,
    fromEmail,
    replyTo,
    title: `Campaign ${emailHistoryId}`,
  });

  // Persist immediately — setCampaignContent/sendCampaign can still fail
  // (e.g. Mailchimp's "recipients not ready"), and if that throws before
  // this is saved, the campaign is left as an orphaned draft with nothing
  // (including this same reuse check, next retry) able to find it again.
  await prisma.emailHistory.update({
    where: { id: emailHistoryId },
    data: { mailchimpCampaignId: campaign.id },
  });

  return campaign.id;
}

// ── Marketing path: sync audience + create/send one Mailchimp campaign ──────

export async function sendMarketingCampaign(
  params: SendCampaignParams,
): Promise<SendCampaignResult> {
  const {
    contactListId,
    emailHistoryId,
    userId,
    subject,
    emailBody,
    preheader,
    senderName,
    senderEmail,
    appUrl,
  } = params;

  await prisma.emailHistory.update({
    where: { id: emailHistoryId },
    data: { status: "sending" },
  });

  const contacts = await loadContactsForList(contactListId, userId);

  if (contacts.length === 0) {
    await prisma.emailHistory.update({
      where: { id: emailHistoryId },
      data: { status: "sent", sentCount: 0 },
    });
    return { sent: 0, failed: 0 };
  }

  const list = await prisma.contactList.findUnique({ where: { id: contactListId } });
  let audienceId = list?.mailchimpAudienceId ?? null;

  if (!audienceId) {
    const audience = await createAudience({
      name: `${list?.name ?? "List"} (${contactListId})`,
      fromEmail: senderEmail,
      fromName: senderName,
      replyTo: senderEmail,
    });
    audienceId = audience.id;

    await prisma.contactList.update({
      where: { id: contactListId },
      data: { mailchimpAudienceId: audienceId },
    });

    try {
      await addListWebhook(audienceId, `${appUrl}/api/webhooks/mailchimp-marketing`);
    } catch (e) {
      console.error("[send-marketing-campaign] Failed to register list webhook:", e);
    }
  }

  await syncAudienceMembers(audienceId, contacts);

  // {first_name}-style tokens can't be resolved to one value here — this is
  // a single piece of content going to the whole audience, not a per-contact
  // loop — so they're converted to Mailchimp merge tags instead, which
  // Mailchimp resolves per-recipient at send time.
  const mergeSubject = replaceVariablesWithMergeTags(subject);

  const html = generateEmailTemplate({
    body: replaceVariablesWithMergeTags(emailBody),
    subject: mergeSubject,
    senderName,
    preheader: replaceVariablesWithMergeTags(preheader || ""),
    unsubscribeUrl: undefined, // Mailchimp injects its own unsubscribe footer/merge tag
  });

  const campaignId = await getOrCreateCampaign({
    emailHistoryId,
    audienceId,
    subject: mergeSubject,
    fromName: senderName,
    fromEmail: senderEmail,
    replyTo: senderEmail,
  });

  await setCampaignContent(campaignId, html);
  await sendCampaign(campaignId);

  await prisma.emailHistory.update({
    where: { id: emailHistoryId },
    data: {
      status: "sent",
      sentCount: contacts.length,
    },
  });

  return { sent: contacts.length, failed: 0 };
}
