"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import {
  addVerifiedDomain,
  verifyVerifiedDomain,
  deleteVerifiedDomain,
  listVerifiedDomains,
} from "@/app/_lib/email/mailchimp-marketing-client";
import {
  addDomain as mandrillAddDomain,
  checkDomain as mandrillCheckDomain,
  deleteDomain as mandrillDeleteDomain,
  isMandrillDomainVerified,
} from "@/app/_lib/email/mailchimp-transactional-client";

// ── combined status helper ───────────────────────────────────────────────────
//
// `status` stays "verified" whenever EITHER marketingStatus or
// transactionalStatus is "verified" — that's the flag contact-list creation
// and sender creation already gate on, so they don't need to know about the
// two-provider split.

async function recomputeCombinedStatus(domainId: string) {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return;
  const status =
    domain.marketingStatus === "verified" ||
    domain.transactionalStatus === "verified"
      ? "verified"
      : "pending";
  if (status !== domain.status) {
    await prisma.domain.update({ where: { id: domainId }, data: { status } });
  }
}

// ── createDomain ──────────────────────────────────────────────────────────────
//
// Registers the domain with Mailchimp Marketing (required — that's the
// verification code flow this app currently drives) and, best-effort, with
// Mandrill/Transactional too (so its TXT-record verification is ready
// whenever that plan gets configured; failures here are non-fatal and just
// leave transactionalStatus at "not_configured").

export async function createDomain(domainName: string, email: string) {
  try {
    const user = await requireAuth();

    const existingDomain = await prisma.domain.findUnique({
      where: { domain: domainName },
    });
    if (existingDomain) {
      return { success: false, error: "Domain already exists in the system" };
    }

    if (!email?.trim()) {
      return {
        success: false,
        error: "An email address is required to receive the verification code",
      };
    }

    let mcDomain;
    try {
      mcDomain = await addVerifiedDomain(domainName, email.trim());
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add domain in Mailchimp Marketing",
      };
    }

    let mandrillVerifyTxtKey: string | undefined;
    let transactionalStatus = "not_configured";
    if (process.env.MAILCHIMP_TRANSACTIONAL_API_KEY) {
      try {
        const mandrillCheck = await mandrillAddDomain(domainName);
        mandrillVerifyTxtKey = mandrillCheck.verify_txt_key;
        transactionalStatus = "pending";
      } catch (error) {
        console.error("Mandrill add-domain (non-fatal) error:", error);
      }
    }

    const domain = await prisma.domain.create({
      data: {
        domain: domainName,
        status: "pending",
        marketingStatus: "pending",
        transactionalStatus,
        mandrillVerifyTxtKey,
        // Mailchimp's add-domain response has no `id` field — it keys
        // verified domains by the domain name itself (get/verify/delete all
        // take the name, not an id). Stored here only as a "this domain was
        // registered with Mailchimp Marketing" marker.
        mailchimpDomainId: mcDomain.domain,
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
        mandrillVerifyTxtKey,
      },
    };
  } catch (error) {
    console.error("Create domain error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ── verifyDomain (Marketing) ─────────────────────────────────────────────────
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

    const marketingStatus = result.verified ? "verified" : "pending";

    await prisma.domain.update({
      where: { id: domainId },
      data: { marketingStatus },
    });
    await recomputeCombinedStatus(domainId);

    revalidatePath("/");

    return {
      success: marketingStatus === "verified",
      status: marketingStatus,
      message:
        marketingStatus === "verified"
          ? "Domain verified for Marketing sends!"
          : "That code didn't verify the domain. Double-check it and try again.",
    };
  } catch (error) {
    console.error("Verify domain error:", error);
    return { success: false, error: "Verification failed" };
  }
}

// ── verifyTransactionalDomain (Mandrill) ─────────────────────────────────────
//
// Re-checks the mandrill_verify.<domain> TXT record (plus SPF/DKIM) via
// Mandrill's check-domain call and persists whatever it finds.

export async function verifyTransactionalDomain(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain) {
      return { success: false, error: "Domain not found" };
    }

    let check;
    try {
      check = await mandrillCheckDomain(domain.domain);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }

    const transactionalStatus = isMandrillDomainVerified(check)
      ? "verified"
      : "pending";

    await prisma.domain.update({
      where: { id: domainId },
      data: {
        transactionalStatus,
        mandrillVerifyTxtKey: check.verify_txt_key ?? domain.mandrillVerifyTxtKey,
      },
    });
    await recomputeCombinedStatus(domainId);

    revalidatePath("/");

    return {
      success: transactionalStatus === "verified",
      status: transactionalStatus,
      message:
        transactionalStatus === "verified"
          ? "Domain verified for Transactional sends!"
          : "TXT record not detected yet. DNS propagation can take up to 48 hours.",
    };
  } catch (error) {
    console.error("Verify transactional domain error:", error);
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
      where: { id: domainId, userId: user.id, transactionalStatus: "verified" },
    });
    if (!domain) {
      return { success: false, error: "Domain not found or not Transactional-verified" };
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
      trackingStatus: domain.transactionalStatus === "verified" ? "verified" : "pending",
      openTracking: domain.transactionalStatus === "verified",
      clickTracking: domain.transactionalStatus === "verified",
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

    const verified = domain.transactionalStatus === "verified";
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

    let domains = await prisma.domain.findMany({
      where: { userId: user.id },
      include: { senders: true },
      orderBy: { createdAt: "desc" },
    });

    // Cross-check against Mailchimp Marketing's own verified-domains list —
    // our marketingStatus is only as fresh as the last verifyDomain() call
    // and can drift (e.g. the domain expired or was removed directly in
    // Mailchimp's dashboard) without our DB ever finding out. One list call
    // covers every domain, so reconcile on every page load rather than
    // trust the cached value blindly.
    let mcDomains: Awaited<ReturnType<typeof listVerifiedDomains>> = [];
    let fetchOk = false;
    try {
      mcDomains = await listVerifiedDomains();
      fetchOk = true;
    } catch (error) {
      console.error("[domains] Failed to fetch Mailchimp verified domains for sync:", error);
    }
    const mcByName = new Map(mcDomains.map((d) => [d.domain, d]));

    let driftFound = false;
    for (const domain of domains) {
      // Never registered with Mailchimp Marketing, or this fetch failed —
      // nothing to safely reconcile against.
      if (!domain.mailchimpDomainId || !fetchOk) continue;

      const mc = mcByName.get(domain.domain);
      const liveMarketingStatus = mc?.verified ? "verified" : "pending";
      if (liveMarketingStatus !== domain.marketingStatus) {
        await prisma.domain.update({
          where: { id: domain.id },
          data: { marketingStatus: liveMarketingStatus },
        });
        await recomputeCombinedStatus(domain.id);
        driftFound = true;
      }
    }

    if (driftFound) {
      domains = await prisma.domain.findMany({
        where: { userId: user.id },
        include: { senders: true },
        orderBy: { createdAt: "desc" },
      });
    }

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
    if (domain.transactionalStatus !== "not_configured") {
      try {
        await mandrillDeleteDomain(domain.domain);
      } catch (error) {
        console.error("Failed to delete Mandrill sending domain:", error);
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
