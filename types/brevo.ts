// app/_lib/email/brevo-types.ts

export interface BrevoDomainDnsRecord {
  type: string;
  hostname: string;
  value: string;
  priority?: number;
}

export interface BrevoDomain {
  domain_name: string;
  authenticated: boolean;
  verification_status: string;
  dns_records: BrevoDomainDnsRecord[];
}

export interface BrevoWebhookEvent {
  event: string;
  email?: string;
  id?: number;
  date?: string;
  ts?: number;
  "message-id"?: string;
  ts_event?: number;
  subject?: string;
  tag?: string;
  sending_ip?: string;
  ts_epoch?: number;
  tags?: string[];
  // Campaign events
  campaign_id?: number;
  link?: string;
  // Contact import events
  process_id?: number;
  status?: string;
  total?: number;
  success?: number;
  failed?: number;
}

export interface BrevoImportStatus {
  id: number;
  status: "queued" | "in_progress" | "completed" | "failed";
  total: number;
  success: number;
  failed: number;
  created_at: string;
  updated_at: string;
}

export type EmailSendMethod = "transactional" | "campaign";