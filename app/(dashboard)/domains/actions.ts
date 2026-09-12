"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import {
  addDomain as mandrillAddDomain,
  checkDomain as mandrillCheckDomain,
  deleteDomain as mandrillDeleteDomain,
  buildDnsRecords,
} from "@/app/_lib/email/mailchimp-transactional-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DomainDnsRecord {
  record: string;
  name: string;
  value: string;
  type: string;
  priority?: number;
  ttl?: string;
  status?: string;
}

function recordsFromCheck(domainName: string, check: Awaited<ReturnType<typeof mandrillCheckDomain>>): DomainDnsRecord[] {
  const base = buildDnsRecords(domainName);
  return base.map((r) => ({
    ...r,
    status:
      r.record === "SPF"
        ? check.spf?.valid
          ? "verified"
          : "pending"
        : check.dkim?.valid
          ? "verified"
          : "pending",
  }));
}

// ── createDomain ──────────────────────────────────────────────────────────────

export async function createDomain(domainName: string) {
  try {
    const user = await requireAuth();

    const existingDomain = await prisma.domain.findUnique({
      where: { domain: domainName },
    });
    if (existingDomain) {
      return { success: false, error: "Domain already exists in the system" };
    }

    let check;
    try {
      check = await mandrillAddDomain(domainName);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add domain in Mailchimp Transactional",
      };
    }

    const domain = await prisma.domain.create({
      data: {
        domain: domainName,
        status: "pending",
        mailchimpDomainId: domainName,
        userId: user.id,
      },
    });

    revalidatePath("/");

    return {
      success: true,
      domain: {
        id: domain.id,
        domain: domain.domain,
        status: domain.status,
        records: recordsFromCheck(domainName, check),
      },
    };
  } catch (error) {
    console.error("Create domain error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ── verifyDomain ──────────────────────────────────────────────────────────────
//
// Mailchimp Transactional verifies sending domains by checking SPF/DKIM DNS
// records on demand (no one-time verification token like Resend) — so
// "verify" here just re-runs the check and persists whichever status it finds.

export async function verifyDomain(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.mailchimpDomainId) {
      return { success: false, error: "Domain not found" };
    }

    let check;
    try {
      check = await mandrillCheckDomain(domain.mailchimpDomainId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }

    const status = check.spf?.valid && check.dkim?.valid ? "verified" : "pending";

    await prisma.domain.update({
      where: { id: domainId },
      data: { status },
    });

    revalidatePath("/");

    return {
      success: true,
      status,
      message:
        status === "verified"
          ? "Domain verified successfully!"
          : "Domain not yet verified. Please check your DNS records and try again.",
    };
  } catch (error) {
    console.error("Verify domain error:", error);
    return { success: false, error: "Verification failed" };
  }
}

// ── getDomainRecords ──────────────────────────────────────────────────────────

export async function getDomainRecords(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.mailchimpDomainId) {
      return { success: false, error: "Domain not found" };
    }

    let check;
    try {
      check = await mandrillCheckDomain(domain.mailchimpDomainId);
    } catch {
      return { success: false, error: "Failed to fetch domain records" };
    }

    const status = check.spf?.valid && check.dkim?.valid ? "verified" : "pending";

    return {
      success: true,
      records: recordsFromCheck(domain.domain, check),
      status,
    };
  } catch (error) {
    console.error("Get domain records error:", error);
    return { success: false, error: "Failed to fetch records" };
  }
}

// ── Click/open tracking ─────────────────────────────────────────────────────
//
// Mailchimp Transactional tracks opens/clicks per-message (trackOpens /
// trackClicks flags on send, on by default — see mailchimp-transactional-client.ts)
// with no separate DNS/CNAME setup required, unlike Resend. These are kept as
// thin no-op-ish reads so existing UI (ClickTrackingSetup) that checks
// "is tracking enabled" can just always report enabled once the domain verifies.

export async function enableTracking(domainId: string) {
  try {
    const user = await requireAuth();
    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id, status: "verified" },
    });
    if (!domain) {
      return { success: false, error: "Domain not found or not verified" };
    }
    await prisma.domain.update({
      where: { id: domainId },
      data: { trackingStatus: "verified", trackingSubdomain: null },
    });
    revalidatePath("/");
    return { success: true, trackingSubdomainFull: null, trackingRecords: [] };
  } catch (error) {
    console.error("Enable tracking error:", error);
    return { success: false, error: "Failed to enable tracking" };
  }
}

export async function getTrackingRecords(domainId: string) {
  try {
    const user = await requireAuth();
    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });
    if (!domain) return { success: false, error: "Domain not found" };

    return {
      success: true,
      trackingRecords: [],
      trackingSubdomainFull: null,
      trackingStatus: domain.status === "verified" ? "verified" : "pending",
      openTracking: domain.status === "verified",
      clickTracking: domain.status === "verified",
    };
  } catch (error) {
    console.error("Get tracking records error:", error);
    return { success: false, error: "Failed to fetch tracking records" };
  }
}

export async function verifyTracking(domainId: string) {
  try {
    const user = await requireAuth();
    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });
    if (!domain) return { success: false, error: "Domain not found" };

    const verified = domain.status === "verified";
    if (verified) {
      await prisma.domain.update({
        where: { id: domainId },
        data: { trackingStatus: "verified" },
      });
    }
    revalidatePath("/");

    return {
      success: true,
      trackingStatus: verified ? "verified" : "pending",
      trackingRecords: [],
      trackingSubdomainFull: null,
      message: verified
        ? "Tracking is automatically active for all Mailchimp Transactional sends from this domain."
        : "Verify the domain's SPF/DKIM records first — tracking activates automatically once verified.",
    };
  } catch (error) {
    console.error("Verify tracking error:", error);
    return { success: false, error: "Verification failed" };
  }
}

// ── createSender ──────────────────────────────────────────────────────────────

export async function createSender(
  domainId: string,
  name: string,
  username: string,
) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id, status: "verified" },
    });

    if (!domain) {
      return { success: false, error: "Domain not found or not verified" };
    }

    const email = `${username}@${domain.domain}`;

    const existingSender = await prisma.sender.findUnique({ where: { email } });
    if (existingSender) {
      return { success: false, error: "Sender email already exists" };
    }

    const sender = await prisma.sender.create({
      data: { name, email, domainId, userId: user.id },
    });

    revalidatePath("/");

    return {
      success: true,
      sender: { id: sender.id, name: sender.name, email: sender.email },
    };
  } catch (error) {
    console.error("Create sender error:", error);
    return { success: false, error: "Failed to create sender" };
  }
}

// ── getAllDomains ─────────────────────────────────────────────────────────────

export async function getAllDomains() {
  try {
    const user = await requireAuth();

    const domains = await prisma.domain.findMany({
      where: { userId: user.id },
      include: { senders: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, domains };
  } catch (error) {
    console.error("Get domains error:", error);
    return { success: false, error: "Failed to fetch domains", domains: [] };
  }
}

// ── deleteDomain ──────────────────────────────────────────────────────────────

export async function deleteDomain(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
      include: {
        contactLists: {
          include: { emailHistory: { select: { id: true } } },
        },
        senders: true,
      },
    });

    if (!domain) {
      return { success: false, error: "Domain not found" };
    }

    const emailHistoryIds = domain.contactLists.flatMap((list) =>
      list.emailHistory.map((eh) => eh.id),
    );

    if (domain.mailchimpDomainId) {
      try {
        await mandrillDeleteDomain(domain.mailchimpDomainId);
      } catch (error) {
        console.error("Failed to delete Mailchimp Transactional domain:", error);
      }
    }

    await prisma.$transaction(async (tx) => {
      if (emailHistoryIds.length > 0) {
        await tx.emailRecipientEvent.deleteMany({
          where: { emailHistoryId: { in: emailHistoryIds } },
        });
        await tx.emailHistory.deleteMany({
          where: { id: { in: emailHistoryIds } },
        });
      }
      await tx.contactList.deleteMany({ where: { domainId } });
      await tx.sender.deleteMany({ where: { domainId } });
      await tx.domain.delete({ where: { id: domainId } });
    });

    revalidatePath("/");
    return { success: true, message: "Domain deleted successfully" };
  } catch (error) {
    console.error("Delete domain error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete domain",
    };
  }
}

// ── updateSender ──────────────────────────────────────────────────────────────

export async function updateSender(
  senderId: string,
  name: string,
  username: string,
  domainName: string,
) {
  try {
    const user = await requireAuth();

    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: user.id },
    });

    if (!sender) {
      return { success: false, error: "Sender not found" };
    }

    const newEmail = `${username}@${domainName}`;
    const existingSender = await prisma.sender.findFirst({
      where: { email: newEmail, id: { not: senderId } },
    });
    if (existingSender) {
      return { success: false, error: "Email address already in use" };
    }

    const updated = await prisma.sender.update({
      where: { id: senderId },
      data: { name, email: newEmail, updatedAt: new Date() },
    });

    revalidatePath("/");

    return {
      success: true,
      sender: { id: updated.id, name: updated.name, email: updated.email },
    };
  } catch (error) {
    console.error("Update sender error:", error);
    return { success: false, error: "Failed to update sender" };
  }
}

// ── deleteSender ──────────────────────────────────────────────────────────────

export async function deleteSender(senderId: string) {
  try {
    const user = await requireAuth();

    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId: user.id },
    });

    if (!sender) {
      return { success: false, error: "Sender not found" };
    }

    await prisma.sender.delete({ where: { id: senderId } });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Delete sender error:", error);
    return { success: false, error: "Failed to delete sender" };
  }
}
