// app/api/templates/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { BUILTIN_TEMPLATES } from "@/app/_lib/email/templates";

// ── GET — fetch a single template (supports builtin IDs too) ──────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if it's a builtin template
    const builtin = BUILTIN_TEMPLATES.find((t) => t.id === params.id);
    if (builtin) {
      return NextResponse.json({
        ...builtin,
        // Ensure designJson is always the string version
        designJson: builtin.designJson,
        isBuiltin: true,
      });
    }

    const template = await prisma.emailTemplate.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PUT — update an existing template ─────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      subject,
      body: emailBody,
      designJson,
      category,
    } = body;

    const template = await prisma.emailTemplate.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(subject !== undefined && { subject }),
        ...(emailBody !== undefined && { body: emailBody }),
        ...(designJson !== undefined && { designJson }),
        ...(category !== undefined && { category }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── DELETE — delete a template ────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const template = await prisma.emailTemplate.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    await prisma.emailTemplate.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
