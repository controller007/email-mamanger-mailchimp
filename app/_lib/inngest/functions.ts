import { inngest } from "./client";
import {
  sendMessage as mandrillSend,
  type MandrillSendResult,
} from "@/app/_lib/email/mailchimp-transactional-client";
import {
  createAudience,
  syncAudienceMembers,
  createCampaign,
  setCampaignContent,
  sendCampaign,
  addListWebhook,
} from "@/app/_lib/email/mailchimp-marketing-client";
import { generateEmailTemplate, replaceVariables } from "@/app/_lib/email/html-template";
import prisma from "@/app/_lib/db/prisma";

const MIN_SEND_GAP_MS = 600;
const MAX_SEND_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 3000, 8000];

async function sendWithRetry(
  payload: Parameters<typeof mandrillSend>[0],
): Promise<{ data: MandrillSendResult | null; error: Error | null }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_SEND_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 8000;
      console.log(
        `[send-campaign] Retry attempt ${attempt}/${MAX_SEND_RETRIES} after ${delay}ms`,
      );
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

async function loadContactsForList(contactListId: string, userId: string) {
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

// ── Transactional path: one Mandrill send per contact ───────────────────────

export const sendCampaignFunction = inngest.createFunction(
  {
    id: "send-campaign",
    name: "Send Campaign (Sequential Lists, Transactional)",
    retries: 3,
    triggers: [{ event: "campaign/send" }],
    concurrency: { limit: 1, key: "event.data.userId" },
  },
  async ({ event, step }) => {
    const {
      campaignJobId,
      userId,
      contactListIds,
      emailHistoryIds,
      senderName,
      senderEmail,
      subject,
      emailBody,
      preheader,
      intervalSeconds,
      appUrl,
    } = event.data;

    const effectiveGapMs = Math.max(
      (intervalSeconds ?? 0) * 1000,
      MIN_SEND_GAP_MS,
    );

    console.log(
      `[send-campaign] Starting campaign job ${campaignJobId}. ` +
        `Lists: ${contactListIds.length}, interval: ${intervalSeconds}s, ` +
        `effective gap: ${effectiveGapMs}ms`,
    );

    if (!process.env.MAILCHIMP_TRANSACTIONAL_API_KEY) {
      throw new Error(
        "[send-campaign] MAILCHIMP_TRANSACTIONAL_API_KEY is not set in environment variables.",
      );
    }

    await step.run("mark-campaign-running", async () => {
      await prisma.campaignJob.update({
        where: { id: campaignJobId },
        data: { status: "running" },
      });
    });

    let grandTotalSent = 0;
    let grandTotalFailed = 0;

    for (let listIndex = 0; listIndex < contactListIds.length; listIndex++) {
      const contactListId = contactListIds[listIndex];
      const emailHistoryId = emailHistoryIds[listIndex];

      console.log(
        `[send-campaign] Processing list ${listIndex + 1}/${contactListIds.length}: ${contactListId}`,
      );

      await step.run(`mark-sending-${listIndex}`, async () => {
        await prisma.emailHistory.update({
          where: { id: emailHistoryId },
          data: { status: "sending" },
        });
      });

      const contacts = await step.run(`load-contacts-${listIndex}`, () =>
        loadContactsForList(contactListId, userId),
      );

      if (contacts.length === 0) {
        await step.run(`mark-empty-${listIndex}`, async () => {
          await prisma.emailHistory.update({
            where: { id: emailHistoryId },
            data: { status: "sent", sentCount: 0 },
          });
        });
        continue;
      }

      await step.run(`set-total-${listIndex}`, async () => {
        await prisma.campaignJob.update({
          where: { id: campaignJobId },
          data: { totalContacts: { increment: contacts.length } },
        });
      });

      let listSent = 0;
      let listFailed = 0;
      const listMessageIds: string[] = [];

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];

        const result = await step.run(
          `send-l${listIndex}-c${i}-${contact.email.replace(/[^a-z0-9]/gi, "_")}`,
          async () => {
            const variables: Record<string, string> = {
              first_name: contact.firstName || "",
              last_name: contact.lastName || "",
              full_name: [contact.firstName, contact.lastName]
                .filter(Boolean)
                .join(" "),
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
              await prisma.emailRecipientEvent.create({
                data: { emailHistoryId, recipientEmail: contact.email, status: "failed" },
              });
              return { success: false, messageId: null as string | null };
            }

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

            return { success: true, messageId: data._id as string | null };
          },
        );

        if (result.success) {
          listSent++;
          if (result.messageId) listMessageIds.push(result.messageId);
        } else {
          listFailed++;
        }

        const isLastContactOfLastList =
          i === contacts.length - 1 && listIndex === contactListIds.length - 1;

        if (!isLastContactOfLastList) {
          if (effectiveGapMs >= 2000) {
            await step.sleep(
              `gap-l${listIndex}-c${i}`,
              `${Math.round(effectiveGapMs / 1000)}s`,
            );
          } else {
            await step.run(`gap-l${listIndex}-c${i}`, async () => {
              await new Promise((r) => setTimeout(r, effectiveGapMs));
            });
          }
        }
      }

      await step.run(`finalise-list-${listIndex}`, async () => {
        await prisma.emailHistory.update({
          where: { id: emailHistoryId },
          data: {
            status: listFailed === contacts.length ? "failed" : "sent",
            sentCount: listSent,
            failedCount: listFailed,
            batchIds: listMessageIds,
          },
        });
      });

      grandTotalSent += listSent;
      grandTotalFailed += listFailed;
    }

    await step.run("finalise-campaign", async () => {
      await prisma.campaignJob.update({
        where: { id: campaignJobId },
        data: {
          status: "done",
          sentCount: grandTotalSent,
          failedCount: grandTotalFailed,
          completedAt: new Date(),
        },
      });
    });

    return { sent: grandTotalSent, failed: grandTotalFailed };
  },
);

// ── Marketing path: sync audience + create/send one Mailchimp campaign per list

export const sendMarketingCampaignFunction = inngest.createFunction(
  {
    id: "send-marketing-campaign",
    name: "Send Campaign (Mailchimp Marketing)",
    retries: 3,
    triggers: [{ event: "campaign/send-marketing" }],
    concurrency: { limit: 1, key: "event.data.userId" },
  },
  async ({ event, step }) => {
    const {
      campaignJobId,
      userId,
      contactListIds,
      emailHistoryIds,
      senderName,
      senderEmail,
      subject,
      emailBody,
      preheader,
      appUrl,
    } = event.data;

    if (!process.env.MAILCHIMP_MARKETING_API_KEY) {
      throw new Error(
        "[send-marketing-campaign] MAILCHIMP_MARKETING_API_KEY is not set.",
      );
    }

    await step.run("mark-campaign-running", async () => {
      await prisma.campaignJob.update({
        where: { id: campaignJobId },
        data: { status: "running" },
      });
    });

    let grandTotalSent = 0;
    let grandTotalFailed = 0;

    for (let listIndex = 0; listIndex < contactListIds.length; listIndex++) {
      const contactListId = contactListIds[listIndex];
      const emailHistoryId = emailHistoryIds[listIndex];

      await step.run(`mark-sending-${listIndex}`, async () => {
        await prisma.emailHistory.update({
          where: { id: emailHistoryId },
          data: { status: "sending" },
        });
      });

      const contacts = await step.run(`load-contacts-${listIndex}`, () =>
        loadContactsForList(contactListId, userId),
      );

      if (contacts.length === 0) {
        await step.run(`mark-empty-${listIndex}`, async () => {
          await prisma.emailHistory.update({
            where: { id: emailHistoryId },
            data: { status: "sent", sentCount: 0 },
          });
        });
        continue;
      }

      // ── Ensure a Mailchimp audience exists for this list ─────────────────
      const audienceId = await step.run(`ensure-audience-${listIndex}`, async () => {
        const list = await prisma.contactList.findUnique({ where: { id: contactListId } });
        if (list?.mailchimpAudienceId) return list.mailchimpAudienceId;

        const audience = await createAudience({
          name: `${list?.name ?? "List"} (${contactListId})`,
          fromEmail: senderEmail,
          fromName: senderName,
          replyTo: senderEmail,
        });

        await prisma.contactList.update({
          where: { id: contactListId },
          data: { mailchimpAudienceId: audience.id },
        });

        try {
          await addListWebhook(
            audience.id,
            `${appUrl}/api/webhooks/mailchimp-marketing`,
          );
        } catch (e) {
          console.error("[send-marketing-campaign] Failed to register list webhook:", e);
        }

        return audience.id;
      });

      await step.run(`sync-members-${listIndex}`, () =>
        syncAudienceMembers(audienceId, contacts),
      );

      const html = generateEmailTemplate({
        body: emailBody,
        subject,
        senderName,
        preheader,
        unsubscribeUrl: undefined, // Mailchimp injects its own unsubscribe footer/merge tag
      });

      const campaignId = await step.run(`create-campaign-${listIndex}`, async () => {
        const campaign = await createCampaign({
          audienceId,
          subject,
          fromName: senderName,
          fromEmail: senderEmail,
          replyTo: senderEmail,
          title: `Campaign ${emailHistoryId}`,
        });
        await setCampaignContent(campaign.id, html);
        return campaign.id;
      });

      await step.run(`send-campaign-${listIndex}`, () => sendCampaign(campaignId));

      await step.run(`finalise-list-${listIndex}`, async () => {
        await prisma.emailHistory.update({
          where: { id: emailHistoryId },
          data: {
            status: "sent",
            sentCount: contacts.length,
            mailchimpCampaignId: campaignId,
          },
        });
      });

      grandTotalSent += contacts.length;
    }

    await step.run("finalise-campaign", async () => {
      await prisma.campaignJob.update({
        where: { id: campaignJobId },
        data: {
          status: "done",
          sentCount: grandTotalSent,
          failedCount: grandTotalFailed,
          completedAt: new Date(),
        },
      });
    });

    return { sent: grandTotalSent, failed: grandTotalFailed };
  },
);
