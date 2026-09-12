// app/api/contact-lists/[id]/contacts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";

const MAX_CONTACTS = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function syncEmailsArray(listId: string) {
  const contacts = await prisma.contact.findMany({
    where: { contactListId: listId },
    select: { email: true },
  });
  await prisma.contactList.update({
    where: { id: listId },
    data: { emails: contacts.map((c) => c.email), updatedAt: new Date() },
  });
}

// POST — add one or many contacts (bulk import)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    const list = await prisma.contactList.findFirst({
      where: { id: params.id, createdBy: user.id },
    });
    if (!list) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { contacts = [] } = body as {
      contacts: {
        email: string;
        firstName?: string;
        lastName?: string;
        company?: string;
        phone?: string;
      }[];
    };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "contacts array is required" },
        { status: 400 },
      );
    }

    // Validate + deduplicate incoming
    const seen = new Set<string>();
    const valid = contacts
      .filter((c) => {
        const email = c.email?.trim?.().toLowerCase();
        if (!email || !EMAIL_RE.test(email) || seen.has(email)) return false;
        seen.add(email);
        return true;
      })
      .map((c) => ({
        email: c.email.trim().toLowerCase(),
        firstName: c.firstName?.trim() || undefined,
        lastName: c.lastName?.trim() || undefined,
        company: c.company?.trim() || undefined,
        phone: c.phone?.trim() || undefined,
        contactListId: params.id,
      }));

    if (valid.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses found" },
        { status: 400 },
      );
    }

    // ── HARD CAP: check existing + new against limit ──────────────────────
    const existingCount = await prisma.contact.count({
      where: { contactListId: params.id },
    });

    const totalAfterAdd = existingCount + valid.length;

    if (totalAfterAdd > MAX_CONTACTS) {
      const remaining = MAX_CONTACTS - existingCount;
      if (remaining <= 0) {
        return NextResponse.json(
          {
            error: `This list is already at the ${MAX_CONTACTS}-contact limit. Remove contacts before adding more.`,
            code: "CONTACT_LIMIT_EXCEEDED",
            limit: MAX_CONTACTS,
            current: existingCount,
            remaining: 0,
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        {
          error: `Adding ${valid.length} contacts would exceed the ${MAX_CONTACTS}-contact limit. This list has ${existingCount} contacts; you can add at most ${remaining} more.`,
          code: "CONTACT_LIMIT_EXCEEDED",
          limit: MAX_CONTACTS,
          current: existingCount,
          remaining,
          attempted: valid.length,
        },
        { status: 400 },
      );
    }
    // ─────────────────────────────────────────────────────────────────────

    const result = await prisma.contact.createMany({
      data: valid,
    });

    await syncEmailsArray(params.id);

    return NextResponse.json({
      success: true,
      added: result.count,
      skipped: valid.length - result.count,
      total: existingCount + result.count,
    });
  } catch (error) {
    console.error("Error adding contacts:", error);
    return NextResponse.json(
      { error: "Failed to add contacts" },
      { status: 500 },
    );
  }
}

// PATCH — edit a single contact
// FIX #1: Now accepts `email` field and checks for duplicates within the list.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    const list = await prisma.contactList.findFirst({
      where: { id: params.id, createdBy: user.id },
    });
    if (!list) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      contactId,
      email,
      firstName,
      lastName,
      company,
      phone,
      isSubscribed,
    } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 },
      );
    }

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, contactListId: params.id },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // If email is being changed, validate format and check for duplicates
    let newEmail: string | undefined;
    if (email && email.trim().toLowerCase() !== contact.email) {
      newEmail = email.trim().toLowerCase();

      if (!EMAIL_RE.test(newEmail as string)) {
        return NextResponse.json(
          { error: "Invalid email address format" },
          { status: 400 },
        );
      }

      // Check for duplicate in this list (exclude current contact)
      const duplicate = await prisma.contact.findFirst({
        where: {
          contactListId: params.id,
          email: newEmail,
          id: { not: contactId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error: `A contact with email "${newEmail}" already exists in this list.`,
          },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(newEmail ? { email: newEmail } : {}),
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        ...(typeof isSubscribed === "boolean" ? { isSubscribed } : {}),
        updatedAt: new Date(),
      },
    });

    // Keep the emails array on the list in sync if email changed
    if (newEmail) {
      await syncEmailsArray(params.id);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 },
    );
  }
}

// DELETE — remove contacts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    const list = await prisma.contactList.findFirst({
      where: { id: params.id, createdBy: user.id },
    });
    if (!list) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { contactIds = [] } = body as { contactIds: string[] };

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds array is required" },
        { status: 400 },
      );
    }

    await prisma.contact.deleteMany({
      where: { id: { in: contactIds }, contactListId: params.id },
    });

    await syncEmailsArray(params.id);

    return NextResponse.json({ success: true, removed: contactIds.length });
  } catch (error) {
    console.error("Error deleting contacts:", error);
    return NextResponse.json(
      { error: "Failed to delete contacts" },
      { status: 500 },
    );
  }
}
