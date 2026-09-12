
import { inngest } from "./client";
import {
  resend,
  generateEmailTemplate,
  replaceVariables,
} from "@/app/_lib/email/resend-client";
import prisma from "@/app/_lib/db/prisma";

const MIN_SEND_GAP_MS = 600;

const MAX_SEND_RETRIES = 3;

const RETRY_DELAYS_MS = [1000, 3000, 8000];

async function sendWithRetry(
  payload: Parameters<typeof resend.emails.send>[0],
) {
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
      const { data, error } = await resend.emails.send(payload);

      // Resend 429 rate limit comes back as an error object, not a throw
      if (error) {
        const msg = (error as any)?.message ?? "";
        const is429 =
          msg.toLowerCase().includes("rate") ||
          msg.toLowerCase().includes("429") ||
          (error as any)?.statusCode === 429;

        if (is429 && attempt < MAX_SEND_RETRIES) {
          lastError = error;
          continue; // retry
        }
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err: unknown) {
      lastError = err;
      const isNetworkErr =
        err instanceof Error &&
        (err.message.includes("fetch") ||
          err.message.includes("network") ||
          err.message.includes("ECONNRESET"));

      if (isNetworkErr && attempt < MAX_SEND_RETRIES) continue;
      throw err;
    }
  }

  return { data: null, error: lastError };
}

// ── Main function ─────────────────────────────────────────────────────────────

export const sendCampaignFunction = inngest.createFunction(
  {
    id: "send-campaign",
    name: "Send Campaign (Sequential Lists)",
    retries: 3,
    triggers: [{ event: "campaign/send" }],
    // One campaign at a time per user — prevents accidental parallel blasts
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
  },
  async ({ event, step }) => {
    const {
      campaignJobId,
      userId,
      contactListIds, // string[] — processed ONE BY ONE in order
      emailHistoryIds, // string[] — parallel index with contactListIds
      senderName,
      senderEmail,
      subject,
      emailBody,
      preheader,
      intervalSeconds,
      appUrl,
    } = event.data;

    // Effective gap: user's interval OR the minimum safe gap, whichever is larger
    const effectiveGapMs = Math.max(
      (intervalSeconds ?? 0) * 1000,
      MIN_SEND_GAP_MS,
    );

    console.log(
      `[send-campaign] Starting campaign job ${campaignJobId}. ` +
        `Lists: ${contactListIds.length}, interval: ${intervalSeconds}s, ` +
        `effective gap: ${effectiveGapMs}ms`,
    );

    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        "[send-campaign] RESEND_API_KEY is not set in environment variables.",
      );
    }

    // ── Update overall campaign job to running ────────────────────────────────
    await step.run("mark-campaign-running", async () => {
      await prisma.campaignJob.update({
        where: { id: campaignJobId },
        data: { status: "running" },
      });
    });

    let grandTotalSent = 0;
    let grandTotalFailed = 0;

    // ── Process each list SEQUENTIALLY ───────────────────────────────────────
    for (let listIndex = 0; listIndex < contactListIds.length; listIndex++) {
      const contactListId = contactListIds[listIndex];
      const emailHistoryId = emailHistoryIds[listIndex];

      console.log(
        `[send-campaign] Processing list ${listIndex + 1}/${contactListIds.length}: ${contactListId}`,
      );

      // Mark this list's history as sending
      await step.run(`mark-sending-${listIndex}`, async () => {
        await prisma.emailHistory.update({
          where: { id: emailHistoryId },
          data: { status: "sending" },
        });
      });

      // Load contacts for this list
      const contacts = await step.run(
        `load-contacts-${listIndex}`,
        async () => {
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
            select: {
              email: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          });

          console.log(
            `[send-campaign] List ${listIndex + 1}: ${dbContacts.length} DB contacts`,
          );

          if (dbContacts.length > 0) {
            const filtered = dbContacts.filter(
              (c) => !suppressedSet.has(c.email),
            );
            console.log(
              `[send-campaign] List ${listIndex + 1}: ${filtered.length} after suppression`,
            );
            return filtered;
          }

          // Fallback to ContactList.emails[]
          const list = await prisma.contactList.findUnique({
            where: { id: contactListId },
            select: { emails: true },
          });
          const fallback = (list?.emails ?? [])
            .filter((e) => !suppressedSet.has(e))
            .map((e) => ({
              email: e,
              firstName: null as string | null,
              lastName: null as string | null,
              company: null as string | null,
            }));
          console.log(
            `[send-campaign] List ${listIndex + 1}: ${fallback.length} fallback contacts`,
          );
          return fallback;
        },
      );

      if (contacts.length === 0) {
        console.log(
          `[send-campaign] List ${listIndex + 1}: no contacts, skipping`,
        );
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
          data: {
            totalContacts: { increment: contacts.length },
          },
        });
      });

      const fromAddress = `${senderName} <${senderEmail}>`;
      let listSent = 0;
      let listFailed = 0;
      const listMessageIds: string[] = [];

      // ── Send each contact in this list ──────────────────────────────────────
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

            console.log(
              `[send-campaign] List ${listIndex + 1} [${i + 1}/${contacts.length}] → ${contact.email}`,
            );

            const { data, error } = await sendWithRetry({
              from: fromAddress,
              to: contact.email,
              subject: personalizedSubject,
              html,
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
              tags: [
                { name: "email_history_id", value: emailHistoryId },
                { name: "contact_list_id", value: contactListId },
              ],
            });

            if (error || !data?.id) {
              console.error(
                `[send-campaign] FAILED for ${contact.email}:`,
                error,
              );
              await prisma.emailRecipientEvent.create({
                data: {
                  emailHistoryId,
                  recipientEmail: contact.email,
                  status: "failed",
                },
              });
              return {
                success: false,
                messageId: null as string | null,
              };
            }

            console.log(
              `[send-campaign] SUCCESS ${contact.email} → ${data.id}`,
            );

            try {
              await prisma.emailRecipientEvent.create({
                data: {
                  emailHistoryId,
                  recipientEmail: contact.email,
                  status: "sent",
                  resendMessageId: data.id,
                },
              });
            } catch (dbErr: any) {
              // P2002 = duplicate key, safe to ignore
              if (dbErr?.code !== "P2002") {
                console.error(
                  `[send-campaign] DB write error for ${contact.email}:`,
                  dbErr,
                );
              }
            }

            return {
              success: true,
              messageId: data.id as string | null,
            };
          },
        );

        if (result.success) {
          listSent++;
          if (result.messageId) listMessageIds.push(result.messageId);
        } else {
          listFailed++;
        }

        // Gap between emails — skip after the last contact of the last list
        const isLastContactOfLastList =
          i === contacts.length - 1 && listIndex === contactListIds.length - 1;

        if (!isLastContactOfLastList) {
          // Use Inngest step.sleep for intervals >= 2s so it's durable.
          // For sub-2s gaps use a plain setTimeout (not worth checkpointing).
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

      // Finalise this list's EmailHistory
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
        console.log(
          `[send-campaign] List ${listIndex + 1} done. sent=${listSent}, failed=${listFailed}`,
        );
      });

      grandTotalSent += listSent;
      grandTotalFailed += listFailed;
    }

    // ── Finalise the overall CampaignJob ──────────────────────────────────────
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
      console.log(
        `[send-campaign] Campaign ${campaignJobId} complete. ` +
          `totalSent=${grandTotalSent}, totalFailed=${grandTotalFailed}`,
      );
    });

    return { sent: grandTotalSent, failed: grandTotalFailed };
  },
);
