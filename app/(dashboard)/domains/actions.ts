"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { resend } from "@/app/_lib/email/resend-client";

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

    const { data: resendDomain, error } = await resend.domains.create({
      name: domainName,
      region: "us-east-1",
    });

    if (error || !resendDomain) {
      return {
        success: false,
        error: error?.message || "Failed to create domain in Resend",
      };
    }

    const domain = await prisma.domain.create({
      data: {
        domain: domainName,
        status: "pending",
        resendId: resendDomain.id,
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
        records: resendDomain.records as DomainDnsRecord[],
      },
    };
  } catch (error) {
    console.error("Create domain error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ── verifyDomain ──────────────────────────────────────────────────────────────

export async function verifyDomain(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.resendId) {
      return { success: false, error: "Domain not found" };
    }

    await resend.domains.verify(domain.resendId);

    const { data, error } = await resend.domains.get(domain.resendId);

    if (error) {
      return { success: false, error: error.message || "Verification failed" };
    }

    const status = data?.status === "verified" ? "verified" : "pending";

    // Enable open + click tracking on Resend side when domain first verifies.
    // We set trackingSubdomain to "track" (hardcoded per spec) so Resend
    // generates track.<domain>.com as the tracking host.
    if (status === "verified") {
      try {
        await resend.domains.update({
          id: domain.resendId,
          openTracking: true,
          clickTracking: true,
          trackingSubdomain: "track",
        });
      } catch (e) {
        console.error("Failed to enable tracking on verify:", e);
      }
    }

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

    if (!domain || !domain.resendId) {
      return { success: false, error: "Domain not found" };
    }

    const { data: domainData, error } = await resend.domains.get(
      domain.resendId,
    );

    if (error || !domainData) {
      return { success: false, error: "Failed to fetch domain records" };
    }

    return {
      success: true,
      records: domainData.records as DomainDnsRecord[],
      status: domainData.status,
    };
  } catch (error) {
    console.error("Get domain records error:", error);
    return { success: false, error: "Failed to fetch records" };
  }
}

// ── _activateTrackingOnResend (internal helper) ───────────────────────────────
//
// Calls resend.domains.update to set trackingSubdomain = "track" + enable both
// tracking flags. Returns the filtered Tracking/TrackingCAA records and the
// full subdomain name (e.g. "track.yourdomain.com").
// Used by getTrackingRecords (auto-activate on first panel open) and
// verifyTracking (ensure activated before verifying).

async function _activateTrackingOnResend(
  resendId: string,
  domainName: string,
  dbDomainId: string,
): Promise<{
  trackingRecords: DomainDnsRecord[];
  trackingSubdomainFull: string;
}> {
  const { data: updatedDomain, error } = await resend.domains.update({
    id: resendId,
    openTracking: true,
    clickTracking: true,
    trackingSubdomain: "track",
  });

  if (error || !updatedDomain) {
    throw new Error(error?.message || "Failed to activate tracking on Resend");
  }

  const allRecords = (updatedDomain as any).records as DomainDnsRecord[];
  const trackingRecords =
    allRecords?.filter(
      (r) => r.record === "Tracking" || r.record === "TrackingCAA",
    ) ?? [];

  const trackingCname = trackingRecords.find((r) => r.record === "Tracking");
  const trackingSubdomainFull = trackingCname?.name ?? `track.${domainName}`;

  // Persist subdomain in DB so future loads don't need to call update again
  await prisma.domain.update({
    where: { id: dbDomainId },
    data: { trackingSubdomain: "track", trackingStatus: "pending" },
  });

  return { trackingRecords, trackingSubdomainFull };
}

// ── enableTracking ────────────────────────────────────────────────────────────
//
// Called when user explicitly clicks "Enable Tracking" button for the first
// time. Activates tracking on Resend and returns records to display.

export async function enableTracking(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id, status: "verified" },
    });

    if (!domain || !domain.resendId) {
      return { success: false, error: "Domain not found or not verified" };
    }

    const { trackingRecords, trackingSubdomainFull } =
      await _activateTrackingOnResend(domain.resendId, domain.domain, domainId);

    revalidatePath("/");

    return { success: true, trackingSubdomainFull, trackingRecords };
  } catch (error) {
    console.error("Enable tracking error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to enable tracking",
    };
  }
}

// ── getTrackingRecords ────────────────────────────────────────────────────────
//
// Called when the tracking panel is opened (expand toggle).
// If trackingSubdomain is not set in DB yet, it means this is an existing
// domain that was verified before the tracking feature existed — we auto-
// activate it on Resend so DNS records are generated and visible immediately.
// If already activated, we just fetch the current record + status.

export async function getTrackingRecords(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.resendId) {
      return { success: false, error: "Domain not found" };
    }

    let trackingRecords: DomainDnsRecord[] = [];
    let trackingSubdomainFull: string | null = null;

    // ── Auto-activate for existing domains that don't have it set yet ──────
    if (!domain.trackingSubdomain) {
      try {
        const activated = await _activateTrackingOnResend(
          domain.resendId,
          domain.domain,
          domainId,
        );
        trackingRecords = activated.trackingRecords;
        trackingSubdomainFull = activated.trackingSubdomainFull;
      } catch (e) {
        console.error("Auto-activate tracking failed:", e);
        // Fall through and try a plain get() to at least show what Resend has
      }
    }

    // ── Always fetch fresh from Resend for current record status ───────────
    const { data: domainData, error } = await resend.domains.get(
      domain.resendId,
    );

    if (error || !domainData) {
      return {
        success: false,
        error: "Failed to fetch domain data from Resend",
      };
    }

    const allRecords = (domainData as any).records as DomainDnsRecord[];
    // Re-filter from fresh get() so statuses are up-to-date
    trackingRecords =
      allRecords?.filter(
        (r) => r.record === "Tracking" || r.record === "TrackingCAA",
      ) ?? [];

    const trackingCname = trackingRecords.find((r) => r.record === "Tracking");
    const isVerified = trackingCname?.status === "verified";

    // Resolve the full subdomain name from the live record name field
    trackingSubdomainFull =
      trackingCname?.name ??
      (domain.trackingSubdomain
        ? `${domain.trackingSubdomain}.${domain.domain}`
        : `track.${domain.domain}`);

    // Sync DB if Resend says verified but DB is behind
    if (isVerified && domain.trackingStatus !== "verified") {
      await prisma.domain.update({
        where: { id: domainId },
        data: { trackingStatus: "verified" },
      });
    }

    revalidatePath("/");

    return {
      success: true,
      trackingRecords,
      trackingSubdomainFull,
      trackingStatus: isVerified
        ? "verified"
        : (domain.trackingStatus ?? "pending"),
      openTracking: (domainData as any).open_tracking ?? false,
      clickTracking: (domainData as any).click_tracking ?? false,
    };
  } catch (error) {
    console.error("Get tracking records error:", error);
    return { success: false, error: "Failed to fetch tracking records" };
  }
}

// ── verifyTracking ────────────────────────────────────────────────────────────
//
// Called when user clicks "Verify Tracking" after adding DNS records.
// Ensures tracking is activated on Resend (handles domains that somehow
// never had it set), triggers verification, then checks if CNAME is verified.

export async function verifyTracking(domainId: string) {
  try {
    const user = await requireAuth();

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: user.id },
    });

    if (!domain || !domain.resendId) {
      return { success: false, error: "Domain not found" };
    }

    // Ensure tracking subdomain is set on Resend before verifying.
    // Handles edge case where domain was verified before this feature shipped.
    if (!domain.trackingSubdomain) {
      try {
        await _activateTrackingOnResend(
          domain.resendId,
          domain.domain,
          domainId,
        );
      } catch (e) {
        console.error("Could not activate tracking before verify:", e);
        // Don't hard-fail — attempt verify anyway
      }
    }

    // Trigger re-verification on Resend
    await resend.domains.verify(domain.resendId);

    // Fetch updated records to check tracking status
    const { data: domainData, error } = await resend.domains.get(
      domain.resendId,
    );

    if (error || !domainData) {
      return { success: false, error: "Failed to fetch updated records" };
    }

    const allRecords = (domainData as any).records as DomainDnsRecord[];
    const trackingRecords =
      allRecords?.filter(
        (r) => r.record === "Tracking" || r.record === "TrackingCAA",
      ) ?? [];

    const trackingCname = trackingRecords.find((r) => r.record === "Tracking");
    const isVerified = trackingCname?.status === "verified";

    if (isVerified) {
      await prisma.domain.update({
        where: { id: domainId },
        data: { trackingStatus: "verified" },
      });
      revalidatePath("/");
    }

    const trackingSubdomainFull =
      trackingCname?.name ??
      (domain.trackingSubdomain
        ? `${domain.trackingSubdomain}.${domain.domain}`
        : `track.${domain.domain}`);

    return {
      success: true,
      trackingStatus: isVerified ? "verified" : "pending",
      trackingRecords,
      trackingSubdomainFull,
      message: isVerified
        ? "Tracking domain verified! Click & open tracking is now active."
        : "Tracking DNS record not yet detected. DNS propagation can take 5–30 minutes. Please try again shortly.",
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

    if (domain.resendId) {
      try {
        await resend.domains.remove(domain.resendId);
      } catch (error) {
        console.error("Failed to delete Resend domain:", error);
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
