import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/_lib/db/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactListId = params.id;

    console.log("Import webhook received for contact list:", contactListId);

    const contactList = await prisma.contactList.findUnique({
      where: { id: contactListId },
    });

    if (!contactList) {
      console.warn(`Import webhook: ContactList not found for ${contactListId}`);
      return NextResponse.json({ ok: true });
    }

    await prisma.contactList.update({
      where: { id: contactListId },
      data: {
        status: "ready",
        updatedAt: new Date(),
      },
    });

    console.log(`Contact list ${contactListId} marked as ready`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Import webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}