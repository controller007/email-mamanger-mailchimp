"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import {
  addVerifiedDomain,
  verifyVerifiedDomain,
  deleteVerifiedDomain,
} from "@/app/_lib/email/mailchimp-marketing-client";

// ── createDomain ──────────────────────────────────────────────────────────────
//
// Domain authentication runs entirely through Mailchimp Marketing's
// /verified-domains API (used as the single source of truth for both send
// modes). Adding a domain here makes Mailchimp email a verification code to
// an address on that domain — there's no DNS record step for this method.

export async function createDomain(domainName: string) {
  try {
    const user = await requireAuth();

    const existingDomain = await prisma.domain.findUnique({
      where: { domain: domainName },
    });
    if (existingDomain) {
      return { success: false, error: "Domain already exists in the system" };
    }

    let mcDomain;
    try {
      mcDomain = await addVerifiedDomain(domainName);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add domain in Mailchimp Marketing",
      };
    }

    const domain = await prisma.domain.create({
      data: {
        domain: domainName,
        status: "pending",
        mailchimpDomainId: String(mcDomain.id),
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
      },
    };
  } catch (error) {
    console.error("Create domain error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ── verifyDomain ──────────────────────────────────────────────────────────────
//
// Mailchimp Marketing verifies domain ownership via a one-time code emailed
// when the domain was added — the user reads that email and submits the code
// here, rather than us polling any DNS state.

export async function verifyDomain(domainId: string, code: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain) {
      return { success: false, error: "Domain not found" };
    }

    if (!code?.trim()) {
      return { success: false, error: "Enter the verification code from your email" };
    }

    let result;
    try {
      result = await verifyVerifiedDomain(domain.domain, code.trim());
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }

    const status = result.verified ? "verified" : "pending";

    await prisma.domain.update({
      where: { id: domainId },
      data: { status },
    });

    revalidatePath("/");

    return {
      success: status === "verified",
      status,
      message:
        status === "verified"
          ? "Domain verified successfully!"
          : "That code didn't verify the domain. Double-check it and try again.",
    };
  } catch (error) {
    console.error("Verify domain error:", error);
    return { success: false, error: "Verification failed" };
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
        await deleteVerifiedDomain(domain.domain);
      } catch (error) {
        console.error("Failed to delete Mailchimp Marketing verified domain:", error);
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
