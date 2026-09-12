// app/_lib/email/mailchimp-transactional-client.ts
//
// Thin wrapper around the Mailchimp Transactional (Mandrill) HTTP API.
// Base URL + auth pattern: https://mailchimp.com/developer/transactional/api/
// Every call is a POST with a JSON body containing `key: <API key>`.

const MANDRILL_API_KEY = process.env.MAILCHIMP_TRANSACTIONAL_API_KEY!;
const MANDRILL_BASE_URL = "https://mandrillapp.com/api/1.0";

async function mandrillFetch<T = any>(
  endpoint: string,
  params: Record<string, any> = {},
): Promise<T> {
  const response = await fetch(`${MANDRILL_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: MANDRILL_API_KEY, ...params }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Mailchimp Transactional API error: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface MandrillRecipient {
  email: string;
  name?: string;
  type?: "to" | "cc" | "bcc";
}

export interface SendMessageParams {
  from: { email: string; name?: string };
  to: MandrillRecipient[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface MandrillSendResult {
  email: string;
  status: "sent" | "queued" | "scheduled" | "rejected" | "invalid";
  _id: string;
  reject_reason?: string;
}

// ── Messages ─────────────────────────────────────────────────────────────────

export async function sendMessage(
  params: SendMessageParams,
): Promise<MandrillSendResult[]> {
  return mandrillFetch<MandrillSendResult[]>("/messages/send.json", {
    message: {
      from_email: params.from.email,
      from_name: params.from.name,
      to: params.to,
      subject: params.subject,
      html: params.html,
      headers: params.headers,
      tags: params.tags,
      metadata: params.metadata,
      track_opens: params.trackOpens ?? true,
      track_clicks: params.trackClicks ?? true,
    },
  });
}

export interface MandrillMessageInfo {
  id: string;
  state: string; // sent | queued | scheduled | rejected | invalid | bounced
  email: string;
  opens?: { ts: number }[];
  clicks?: { ts: number }[];
}

/**
 * Collapses a Mandrill messages/info.json response into the same
 * "last event" vocabulary used by EmailRecipientEvent.status
 * (delivered | opened | clicked | bounced | failed).
 */
export function lastEventFromMessageInfo(info: MandrillMessageInfo): string | null {
  if (info.state === "rejected" || info.state === "invalid") return "failed";
  if (info.state === "bounced") return "bounced";
  if ((info.clicks?.length ?? 0) > 0) return "clicked";
  if ((info.opens?.length ?? 0) > 0) return "opened";
  if (info.state === "sent") return "delivered";
  return null;
}

export async function getMessageInfo(
  id: string,
): Promise<MandrillMessageInfo | null> {
  try {
    return await mandrillFetch<MandrillMessageInfo>("/messages/info.json", {
      id,
    });
  } catch {
    return null;
  }
}

// ── Sending domains (Transactional) ──────────────────────────────────────────
//
// Marketing and Transactional track domain verification independently —
// verifying a domain for Marketing sends (mailchimp-marketing-client.ts's
// /verified-domains) does not verify it for Mandrill/Transactional sends,
// and vice versa. This uses Mandrill's TXT-record ownership check
// (verify_txt_key appended to a `mandrill_verify.<domain>` TXT record)
// rather than the email-link method, since it needs no inbox on the domain
// and fits the DNS-record pattern the rest of the app already uses.

export interface MandrillDomainCheck {
  domain: string;
  created_at?: string;
  last_tested_at?: string | null;
  verify_txt_key?: string;
  spf: { valid: boolean; valid_after?: string | null; error?: string | null };
  dkim: { valid: boolean; valid_after?: string | null; error?: string | null };
  verified_at: string | null;
  valid_signing: boolean;
}

export async function addDomain(domain: string): Promise<MandrillDomainCheck> {
  return mandrillFetch<MandrillDomainCheck>("/senders/add-domain.json", {
    domain,
  });
}

export async function checkDomain(
  domain: string,
): Promise<MandrillDomainCheck> {
  return mandrillFetch<MandrillDomainCheck>("/senders/check-domain.json", {
    domain,
  });
}

export async function deleteDomain(domain: string): Promise<void> {
  await mandrillFetch("/senders/delete-domain.json", { domain });
}

/** True once the domain's SPF + DKIM (which includes the TXT ownership
 * record once added) both validate. */
export function isMandrillDomainVerified(check: MandrillDomainCheck): boolean {
  return !!check.spf?.valid && !!check.dkim?.valid;
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

export async function listWebhooks(): Promise<any[]> {
  return mandrillFetch<any[]>("/webhooks/list.json");
}

export async function addWebhook(url: string, events: string[]): Promise<any> {
  return mandrillFetch("/webhooks/add.json", { url, events });
}

export const mailchimpTransactional = {
  sendMessage,
  getMessageInfo,
  addDomain,
  checkDomain,
  deleteDomain,
  isMandrillDomainVerified,
  listWebhooks,
  addWebhook,
};
