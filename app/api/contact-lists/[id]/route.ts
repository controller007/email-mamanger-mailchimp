// app/api/contact-lists/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { revalidatePath } from "next/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const list = await prisma.contactList.findFirst({
      where: { id: params.id, createdBy: user.id },
      include: {
        domain: { select: { domain: true, status: true } },
        _count: { select: { contacts: true, emailHistory: true } },
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 },
      );
    }

    const whereContacts = {
      contactListId: params.id,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: whereContacts,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where: whereContacts }),
    ]);

    return NextResponse.json({
      list,
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching contact list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await prisma.contactList.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 },
      );
    }
    if (existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check for duplicate name (excluding this list)
    const duplicate = await prisma.contactList.findFirst({
      where: { name: name.trim(), createdBy: user.id, id: { not: params.id } },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "A contact list with this name already exists" },
        { status: 400 },
      );
    }

    const updated = await prisma.contactList.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim() || undefined,
        updatedAt: new Date(),
      },
      include: {
        domain: { select: { domain: true, status: true } },
        _count: { select: { contacts: true, emailHistory: true } },
      },
    });

    revalidatePath("/");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating contact list:", error);
    return NextResponse.json(
      { error: "Failed to update contact list" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireAuth();

    const existing = await prisma.contactList.findUnique({
      where: { id: params.id },
      include: {
        emailHistory: { select: { id: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contact list not found" },
        { status: 404 },
      );
    }
    if (existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const emailHistoryIds = existing.emailHistory.map((eh) => eh.id);

    await prisma.$transaction(async (tx) => {
      if (emailHistoryIds.length > 0) {
        await tx.emailRecipientEvent.deleteMany({
          where: { emailHistoryId: { in: emailHistoryIds } },
        });
        await tx.emailHistory.deleteMany({
          where: { id: { in: emailHistoryIds } },
        });
      }
      // Contact records cascade delete via Prisma relation
      await tx.contactList.delete({ where: { id: params.id } });
    });

    revalidatePath("/");
    return NextResponse.json({
      success: true,
      message: "Contact list deleted",
    });
  } catch (error) {
    console.error("Error deleting contact list:", error);
    return NextResponse.json(
      { error: "Failed to delete contact list" },
      { status: 500 },
    );
  }
}
