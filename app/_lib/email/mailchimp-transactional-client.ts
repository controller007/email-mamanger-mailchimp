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

// ── Sending domains ──────────────────────────────────────────────────────────
// Mandrill verifies sending domains via SPF/DKIM DNS records (checked on demand)
// rather than a fixed one-time DNS record set like Resend. `checkDomain` returns
// the current SPF/DKIM record values + validity so we can render them the same
// way the app already renders Resend's DNS record table.

export interface MandrillDomainCheck {
  domain: string;
  created_at?: string;
  last_tested_at?: string | null;
  spf: { valid: boolean; valid_after?: string | null; error?: string | null };
  dkim: { valid: boolean; valid_after?: string | null; error?: string | null };
  verified_at: string | null;
  valid_signing: boolean;
}

// Mandrill's real method names are flat (not nested REST paths) —
// /senders/add-domain, /senders/check-domain, /senders/verify-domain,
// /senders/domains, /senders/delete-domain. Using the nested
// /senders/domains/add.json style (an earlier version of this file) fails
// with a Mandrill "Unknown method" error since that path doesn't exist.
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

/**
 * Sends a verification email to `<mailbox>@<domain>` (e.g. mailbox="admin")
 * to confirm ownership of the domain. This is a separate step from
 * checkDomain's SPF/DKIM check — Mandrill requires it before a domain can
 * be used to sign outgoing DKIM as fully "verified".
 */
export async function verifyDomainOwnership(
  domain: string,
  mailbox: string,
): Promise<{ status: string; domain: string; email: string }> {
  return mandrillFetch("/senders/verify-domain.json", { domain, mailbox });
}

export async function listDomains(): Promise<MandrillDomainCheck[]> {
  return mandrillFetch<MandrillDomainCheck[]>("/senders/domains.json");
}

export async function deleteDomain(domain: string): Promise<void> {
  await mandrillFetch("/senders/delete-domain.json", { domain });
}

export const MANDRILL_DASHBOARD_SENDING_DOMAINS_URL =
  "https://mandrillapp.com/settings/sending-domains";

/**
 * Builds the SPF/DKIM TXT records a user must add at their DNS provider,
 * in the same {type, name, value} shape the existing DnsRecordsDisplay
 * component expects (previously fed by Resend's `records` array).
 *
 * SPF is a fixed, documented value — safe to show verbatim. DKIM is NOT:
 * Mandrill generates a unique per-domain public key that its API never
 * returns (add-domain/check-domain only report validity, not the key
 * itself) — it's only visible in the Mandrill dashboard. Marking this row
 * `dashboardOnly` so the UI links out instead of rendering a fake,
 * copy-pasteable value that would never actually validate.
 */
export function buildDnsRecords(domain: string) {
  return [
    {
      type: "TXT",
      name: "@",
      value: "v=spf1 include:spf.mandrillapp.com ?all",
      record: "SPF",
    },
    {
      type: "TXT",
      name: `mandrill._domainkey.${domain}`,
      value: "",
      record: "DKIM",
      dashboardOnly: true,
      dashboardUrl: MANDRILL_DASHBOARD_SENDING_DOMAINS_URL,
    },
  ];
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
  verifyDomainOwnership,
  listDomains,
  deleteDomain,
  buildDnsRecords,
  listWebhooks,
  addWebhook,
};
