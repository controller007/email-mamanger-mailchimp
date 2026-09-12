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
    const message = (data && (data.detail || data.title)) || `Mailchimp Marketing API error: ${response.status}`;
    throw new Error(message);
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
export async function syncAudienceMembers(
  audienceId: string,
  contacts: Array<{ email: string; firstName?: string | null; lastName?: string | null }>,
): Promise<void> {
  if (contacts.length === 0) return;

  const operations = contacts.map((c) => ({
    method: "PUT",
    path: `/lists/${audienceId}/members/${md5Lower(c.email)}`,
    body: JSON.stringify({
      email_address: c.email,
      status_if_new: "subscribed",
      merge_fields: {
        FNAME: c.firstName || "",
        LNAME: c.lastName || "",
      },
    }),
  }));

  // Mailchimp batch endpoint caps at 500 ops/request
  const CHUNK = 500;
  for (let i = 0; i < operations.length; i += CHUNK) {
    await mcFetch(`/batches`, {
      method: "POST",
      body: JSON.stringify({ operations: operations.slice(i, i + CHUNK) }),
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

export async function setCampaignContent(
  campaignId: string,
  html: string,
): Promise<void> {
  await mcFetch(`/campaigns/${campaignId}/content`, {
    method: "PUT",
    body: JSON.stringify({ html }),
  });
}

export async function sendCampaign(campaignId: string): Promise<void> {
  await mcFetch(`/campaigns/${campaignId}/actions/send`, { method: "POST" });
}

export async function getCampaignReport(campaignId: string): Promise<any> {
  return mcFetch(`/reports/${campaignId}`);
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await mcFetch(`/campaigns/${campaignId}`, { method: "DELETE" });
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
  deleteCampaign,
  addListWebhook,
};
