// app/api/contact-lists/route.ts
// CHANGES FROM ORIGINAL:
//   1. Hard cap of MAX_CONTACTS (100) enforced at API level
//   2. Returns 400 if contacts exceed cap
//   3. Everything else identical to your original

import { type NextRequest, NextResponse } from "next/server";
import { getSession, requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { revalidatePath } from "next/cache";

const MAX_CONTACTS = 100;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, domainId, contacts = [], emails = [] } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!domainId) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 },
      );
    }

    // Verify domain is verified and belongs to user
    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId: session.user.id, status: "verified" },
    });
    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found or not verified" },
        { status: 400 },
      );
    }

    // Build contacts array from either format
    const contactsToCreate: {
      email: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      phone?: string;
    }[] =
      contacts.length > 0
        ? contacts
        : emails.map((e: string) => ({ email: e }));

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validContacts = contactsToCreate.filter((c) =>
      EMAIL_RE.test(c.email?.trim?.() || ""),
    );

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: "At least one valid email is required" },
        { status: 400 },
      );
    }

    // Deduplicate by email
    const seen = new Set<string>();
    const dedupedContacts = validContacts.filter((c) => {
      const email = c.email.trim().toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });

    // ── HARD CAP: enforce 100-contact limit ──────────────────────────────────
    if (dedupedContacts.length > MAX_CONTACTS) {
      return NextResponse.json(
        {
          error: `Contact lists are limited to ${MAX_CONTACTS} contacts. You provided ${dedupedContacts.length}. Please trim your list and try again.`,
          code: "CONTACT_LIMIT_EXCEEDED",
          limit: MAX_CONTACTS,
          provided: dedupedContacts.length,
        },
        { status: 400 },
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const emailList = dedupedContacts.map((c) => c.email.trim().toLowerCase());

    // Create contact list + contacts in a transaction
    const contactList = await prisma.$transaction(async (tx) => {
      const list = await tx.contactList.create({
        data: {
          name: name.trim(),
          description: description?.trim() || undefined,
          emails: emailList,
          status: "ready",
          domainId,
          createdBy: session.user.id,
        },
      });

      if (dedupedContacts.length > 0) {
        await tx.contact.createMany({
          data: dedupedContacts.map((c) => ({
            email: c.email.trim().toLowerCase(),
            firstName: c.firstName?.trim() || undefined,
            lastName: c.lastName?.trim() || undefined,
            company: c.company?.trim() || undefined,
            phone: c.phone?.trim() || undefined,
            contactListId: list.id,
          })),
        });
      }

      return list;
    });

    revalidatePath("/");
    return NextResponse.json(contactList, { status: 201 });
  } catch (error) {
    console.error("Error creating contact list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactLists = await prisma.contactList.findMany({
      where: { createdBy: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        domain: {
          select: { domain: true, status: true, senders: true },
        },
        _count: {
          select: { emailHistory: true, contacts: true },
        },
      },
    });

    return NextResponse.json(contactLists);
  } catch (error) {
    console.error("Error fetching contact lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: ids must be a non-empty array" },
        { status: 400 },
      );
    }

    const contactLists = await prisma.contactList.findMany({
      where: { id: { in: ids } },
      include: { emailHistory: { select: { id: true } } },
    });

    const unauthorized = contactLists.filter((l) => l.createdBy !== user.id);
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (contactLists.length !== ids.length) {
      return NextResponse.json(
        { error: "Some contact lists were not found" },
        { status: 404 },
      );
    }

    const emailHistoryIds = contactLists.flatMap((l) =>
      l.emailHistory.map((eh) => eh.id),
    );

    await prisma.$transaction(async (tx) => {
      if (emailHistoryIds.length > 0) {
        await tx.emailRecipientEvent.deleteMany({
          where: { emailHistoryId: { in: emailHistoryIds } },
        });
        await tx.emailHistory.deleteMany({
          where: { id: { in: emailHistoryIds } },
        });
      }
      await tx.contactList.deleteMany({
        where: { id: { in: ids }, createdBy: user.id },
      });
    });

    revalidatePath("/");
    return NextResponse.json({
      success: true,
      message: `Deleted ${contactLists.length} contact list(s)`,
    });
  } catch (error) {
    console.error("Error during bulk delete:", error);
    return NextResponse.json(
      { error: "Failed to delete contact lists" },
      { status: 500 },
    );
  }
}
