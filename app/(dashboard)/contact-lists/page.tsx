// app/(dashboard)/contact-lists/page.tsx
// UPDATED: wires the active domain filter from ContactListsGrid
// into CreateContactListDialog as defaultDomainId so that when
// a domain is filtered, the create dialog pre-selects it.

import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { ContactListsPageClient } from "./page-client";

async function getData(userId: string) {
  const [contactLists, domains] = await Promise.all([
    prisma.contactList.findMany({
      where: { createdBy: userId },
      include: {
        domain: {
          include: { senders: true },
        },
        _count: { select: { emailHistory: true, contacts: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.domain.findMany({
      where: { userId, status: "verified" },
      include: { senders: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { contactLists, domains };
}

export default async function ContactListsPage() {
  const user = await requireAuth();
  const { contactLists, domains } = await getData(user.id);

  return (
    <ContactListsPageClient
      contactLists={contactLists as any}
      domains={domains as any}
    />
  );
}
