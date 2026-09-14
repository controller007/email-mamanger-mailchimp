// app/_lib/email/mailchimp-marketing-client.ts
//
// Thin wrapper around the Mailchimp Marketing API (audiences/lists + campaigns).
// https://mailchimp.com/developer/marketing/api/
//
// Auth: Basic <any-user>:<API key>, scoped to a datacenter derived from the
// key suffix (e.g. key "...-us21" -> server prefix "us21"). We read the
// prefix from MAILCHIMP_SERVER_PREFIX rather than parsing it, to keep this
// resilient if the key format changes.

const API_KEY = process.env.MAILCHIMP_MARKETING_API_KEY!;
const SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX!;
const BASE_URL = `https://${SERVER_PREFIX}.api.mailchimp.com/3.0`;

async function mcFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`anystring:${API_KEY}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) return {} as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Mailchimp's validation errors put the actually-useful info in
    // `errors: [{ field, message }]` — data.title alone is just the generic
    // "The resource submitted could not be validated." Surface both so a
    // failed call tells you which field is wrong instead of just that one is.
    const base = (data && (data.detail || data.title)) || `Mailchimp Marketing API error: ${response.status}`;
    const fieldErrors = Array.isArray(data?.errors)
      ? data.errors.map((e: any) => `${e.field ?? "?"}: ${e.message ?? JSON.stringify(e)}`).join("; ")
      : "";
    throw new Error(fieldErrors ? `${base} (${fieldErrors})` : base);
  }

  return data as T;
}

// ── Audiences (Lists) ────────────────────────────────────────────────────────
//
// A Mailchimp "campaign" send always targets an audience (+ optional segment),
// not an ad-hoc address list — so every ContactList that's ever sent via
// "marketing" mode gets a matching audience created lazily and its members
// synced before the campaign is created.

export interface CreateAudienceParams {
  name: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
}

export async function createAudience(
  params: CreateAudienceParams,
): Promise<{ id: string }> {
  return mcFetch("/lists", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      contact: {
        company: params.fromName,
        address1: "N/A",
        city: "N/A",
        state: "N/A",
        zip: "00000",
        country: "US",
      },
      permission_reminder: "You are receiving this because you opted in.",
      campaign_defaults: {
        from_name: params.fromName,
        from_email: params.fromEmail,
        subject: "",
        language: "en",
      },
      email_type_option: false,
    }),
  });
}

export async function deleteAudience(audienceId: string): Promise<void> {
  await mcFetch(`/lists/${audienceId}`, { method: "DELETE" });
}

/**
 * Replaces the audience's membership with exactly `emails` via the batch
 * operations endpoint (upsert each member, subscribed).
 */
/**
 * Adds/updates members one at a time via the direct member-upsert endpoint
 * rather than /batches. /batches is asynchronous — it queues the operations
 * and returns immediately, before Mailchimp has actually applied them —
 * so a campaign created right after a batch call can fail with "recipients
 * not ready" because the audience hasn't finished updating yet. The direct
 * PUT is synchronous: it only returns once that member is actually saved.
 */
export async function syncAudienceMembers(
  audienceId: string,
  contacts: Array<{ email: string; firstName?: string | null; lastName?: string | null }>,
): Promise<void> {
  for (const c of contacts) {
    await mcFetch(`/lists/${audienceId}/members/${md5Lower(c.email)}`, {
      method: "PUT",
      body: JSON.stringify({
        email_address: c.email,
        status_if_new: "subscribed",
        merge_fields: {
          FNAME: c.firstName || "",
          LNAME: c.lastName || "",
        },
      }),
    });
  }
}

// md5 is required by Mailchimp's member-by-hash endpoints (lowercased email hash)
import { createHash } from "crypto";
function md5Lower(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

// ── Campaigns ────────────────────────────────────────────────────────────────

export interface CreateCampaignParams {
  audienceId: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  title: string;
}

export async function createCampaign(
  params: CreateCampaignParams,
): Promise<{ id: string }> {
  return mcFetch("/campaigns", {
    method: "POST",
    body: JSON.stringify({
      type: "regular",
      recipients: { list_id: params.audienceId },
      settings: {
        subject_line: params.subject,
        title: params.title,
        from_name: params.fromName,
        reply_to: params.replyTo,
      },
    }),
  });
}

// Used by send-campaign.ts to check whether a previously-created campaign
// (from an earlier failed attempt) can be reused on retry, rather than
// creating — and orphaning — a new one every time.
export async function getCampaign(
  campaignId: string,
): Promise<{ id: string; status: string }> {
  return mcFetch(`/campaigns/${campaignId}`);
}

export async function setCampaignContent(
  campaignId: string,
  html: string,
): Promise<void> {
  await mcFetch(`/campaigns/${campaignId}/content`, {
    method: "PUT",
    body: JSON.stringify({ html }),
  });
}

// Confirmed by direct observation (2026-09-13): a campaign created against
// a brand-new audience reported "recipients not ready" on /actions/send, but
// querying its own /send-checklist a few minutes later — completely
// untouched in between — showed is_ready: true with the Audience item now
// "success". So the ~19s of backoff this used to do (3s/6s/10s, blindly
// retrying /actions/send and pattern-matching the error text) wasn't nearly
// long enough; the real lag on Mailchimp's side for a fresh audience's
// recipient/segment index appears to be on the order of minutes, not
// seconds. Polling the checklist (a cheap GET, and the authoritative
// readiness signal) is both more accurate and faster than guessing at fixed
// delays, since it returns the moment Mailchimp is actually ready instead of
// always waiting out the full backoff.
//
// Tradeoff: send-campaign.ts already runs this synchronously inside the
// request (see that file's header comment re: removing Inngest) — if
// wherever this is deployed has a serverless function timeout shorter than
// SEND_READY_POLL_INTERVAL_MS * SEND_READY_POLL_ATTEMPTS, lower this budget
// to fit, or move campaign sending off the request path entirely.
const SEND_READY_POLL_INTERVAL_MS = 8000;
const SEND_READY_POLL_ATTEMPTS = 10; // ~80s of polling budget

async function isSendReady(campaignId: string): Promise<boolean> {
  const checklist = await mcFetch<{ is_ready: boolean }>(
    `/campaigns/${campaignId}/send-checklist`,
  );
  return checklist.is_ready;
}

export async function sendCampaign(campaignId: string): Promise<void> {
  for (let attempt = 0; attempt <= SEND_READY_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, SEND_READY_POLL_INTERVAL_MS));
    }
    if (await isSendReady(campaignId)) {
      await mcFetch(`/campaigns/${campaignId}/actions/send`, { method: "POST" });
      return;
    }
  }
  // Ran out of polling budget — attempt anyway so a genuine (non-timing)
  // error surfaces with Mailchimp's real message instead of a generic
  // "gave up polling" one.
  await mcFetch(`/campaigns/${campaignId}/actions/send`, { method: "POST" });
}

// ── Verified (sending) domains ───────────────────────────────────────────────
//
// Domain authentication for Marketing campaigns/audiences has nothing to do
// with Mandrill's sending-domain SPF/DKIM check — it's a separate Marketing
// API resource. Adding a domain here triggers Mailchimp to email a
// verification code to an address on that domain; verifyVerifiedDomain
// completes it by submitting that code back.

// Matches Mailchimp's actual /verified-domains response shape — there is no
// `id` field; domains are keyed by name (get/verify/delete all take the
// domain string itself).
export interface VerifiedDomain {
  domain: string;
  verified: boolean;
  authenticated: boolean;
  verification_email: string;
  verification_sent: string;
  status:
    | "VERIFICATION_IN_PROGRESS"
    | "VERIFIED"
    | "EXPIRED"
    | "ERROR"
    | "AUTHENTICATION_IN_PROGRESS"
    | "AUTHENTICATION_ERROR"
    | "AUTHENTICATED";
  is_free_email_provider: boolean;
}

/**
 * Confirmed against a live call (2026-09-12): the field is
 * `verification_email`, not `email` — Mailchimp's error was
 * "The required properties (verification_email) are missing".
 */
export async function addVerifiedDomain(
  domain: string,
  email: string,
): Promise<VerifiedDomain> {
  return mcFetch("/verified-domains", {
    method: "POST",
    body: JSON.stringify({ domain, verification_email: email }),
  });
}

export async function getVerifiedDomain(
  domain: string,
): Promise<VerifiedDomain> {
  return mcFetch(`/verified-domains/${encodeURIComponent(domain)}`);
}

export async function listVerifiedDomains(): Promise<VerifiedDomain[]> {
  const res = await mcFetch<{ domains: VerifiedDomain[] }>("/verified-domains");
  return res.domains ?? [];
}

export async function verifyVerifiedDomain(
  domain: string,
  code: string,
): Promise<VerifiedDomain> {
  return mcFetch(`/verified-domains/${encodeURIComponent(domain)}/actions/verify`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function deleteVerifiedDomain(domain: string): Promise<void> {
  await mcFetch(`/verified-domains/${encodeURIComponent(domain)}`, {
    method: "DELETE",
  });
}

export interface CampaignReportSummary {
  emails_sent: number;
  opens: { opens_total: number; unique_opens: number };
  clicks: { clicks_total: number; unique_clicks: number };
  bounces: { hard_bounces: number; soft_bounces: number; syntax_errors: number };
  unsubscribed: number;
  abuse_reports: number;
}

export async function getCampaignReport(
  campaignId: string,
): Promise<CampaignReportSummary> {
  return mcFetch(`/reports/${campaignId}`);
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await mcFetch(`/campaigns/${campaignId}`, { method: "DELETE" });
}

// ── Email activity (opens/clicks/bounces per recipient) ─────────────────────
//
// Mailchimp Marketing does NOT push opens/clicks as webhooks — the list
// webhook only covers subscribe/unsubscribe/cleaned/campaign-send-status
// (see addListWebhook above). Real engagement data for a "marketing" mode
// send has to be pulled on demand from the Reports API, which is what this
// function does — called from the email-history sync route when the page
// is open, same polling pattern already used for Mandrill gap-filling.

export interface EmailActivityEvent {
  action: "open" | "click" | "bounce";
  timestamp: string;
  url?: string;
}

export interface EmailActivityRecord {
  email_address: string;
  activity: EmailActivityEvent[];
}

const EMAIL_ACTIVITY_PAGE_SIZE = 1000;

export async function getCampaignEmailActivity(
  campaignId: string,
): Promise<EmailActivityRecord[]> {
  const all: EmailActivityRecord[] = [];
  let offset = 0;

  while (true) {
    const page = await mcFetch<{
      emails: EmailActivityRecord[];
      total_items: number;
    }>(
      `/reports/${campaignId}/email-activity?count=${EMAIL_ACTIVITY_PAGE_SIZE}&offset=${offset}`,
    );

    all.push(...(page.emails ?? []));

    offset += EMAIL_ACTIVITY_PAGE_SIZE;
    if (!page.emails || page.emails.length < EMAIL_ACTIVITY_PAGE_SIZE) break;
    if (offset >= (page.total_items ?? 0)) break;
  }

  return all;
}

/**
 * Collapses one recipient's raw activity array into our internal
 * EmailRecipientEvent status vocabulary, taking the highest-priority
 * event (click > open > bounce).
 */
export function lastEventFromActivity(
  activity: EmailActivityEvent[],
): "clicked" | "opened" | "bounced" | null {
  if (activity.some((a) => a.action === "click")) return "clicked";
  if (activity.some((a) => a.action === "open")) return "opened";
  if (activity.some((a) => a.action === "bounce")) return "bounced";
  return null;
}

// ── Webhooks (per-audience) ──────────────────────────────────────────────────

export async function addListWebhook(
  audienceId: string,
  url: string,
): Promise<{ id: string }> {
  return mcFetch(`/lists/${audienceId}/webhooks`, {
    method: "POST",
    body: JSON.stringify({
      url,
      events: {
        subscribe: true,
        unsubscribe: true,
        campaign: true,
        cleaned: true,
      },
      sources: { user: true, admin: true, api: true },
    }),
  });
}

export const mailchimpMarketing = {
  createAudience,
  deleteAudience,
  syncAudienceMembers,
  createCampaign,
  setCampaignContent,
  sendCampaign,
  getCampaignReport,
  getCampaignEmailActivity,
  lastEventFromActivity,
  deleteCampaign,
  addListWebhook,
  addVerifiedDomain,
  getVerifiedDomain,
  listVerifiedDomains,
  verifyVerifiedDomain,
  deleteVerifiedDomain,
};
