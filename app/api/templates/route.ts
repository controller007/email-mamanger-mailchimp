// app/api/templates/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { BUILTIN_TEMPLATES } from "@/app/_lib/email/templates";
import { buildEmailHtml } from "@/app/_components/email-builder";
;

// ── GET — list all saved templates for the current user ───────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        subject: true,
        body: true,
        designJson: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── POST — create a new template ──────────────────────────────────────────────
// Also used when "duplicating" a builtin template — caller passes builtinId
// and we copy the builtin's designJson + body + subject into a new saved template.
export async function POST(request: NextRequest) {
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
      category = "custom",
      // Optional: duplicate a builtin template by its id
      builtinId,
    } = body;

    let finalBody = emailBody;
    let finalDesignJson = designJson;
    let finalSubject = subject;
    let finalName = name;
    let finalDescription = description;
    let finalCategory = category;

    // If duplicating a builtin template, resolve its fields
    if (builtinId) {
      const builtin = BUILTIN_TEMPLATES.find((t) => t.id === builtinId);
      if (!builtin) {
        return NextResponse.json(
          { error: "Builtin template not found" },
          { status: 404 },
        );
      }
      finalName = name || `${builtin.name} (copy)`;
      finalDescription = description || builtin.description;
      finalSubject = subject || builtin.subject;
      finalCategory = category || builtin.category;

      // designJson is already a string in the builtin
      finalDesignJson = builtin.designJson;

      // Regenerate the HTML body from the designJson blocks so it's always fresh
      if (finalDesignJson) {
        try {
          const parsed = JSON.parse(finalDesignJson);
          // Lazy import to avoid circular issues — caller can also pass body directly
          if (parsed.blocks && parsed.globalSettings) {
        
            finalBody = buildEmailHtml(parsed.blocks, parsed.globalSettings);
          }
        } catch {
          finalBody = builtin.body;
        }
      } else {
        finalBody = builtin.body;
      }
    }

    if (!finalName || !finalBody) {
      return NextResponse.json(
        { error: "Name and body are required" },
        { status: 400 },
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: finalName,
        description: finalDescription || null,
        subject: finalSubject || null,
        body: finalBody,
        designJson: finalDesignJson || null,
        category: finalCategory,
        userId: session.user.id,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
