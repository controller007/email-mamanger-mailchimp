// app/(dashboard)/contact-lists/page-client.tsx
// Client wrapper that holds activeDomainId state shared between
// ContactListsGrid (which sets it) and CreateContactListDialog (which reads it).

"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { ContactListsGrid } from "@/app/_components/contact-lists-grid";
import { CreateContactListDialog } from "@/app/_components/create-contact-list-dialog";
import { Users, Plus } from "lucide-react";
import type { Domain, Sender } from "@prisma/client";

interface ContactListWithRelations {
  id: string;
  name: string;
  description?: string | null;
  emails: string[];
  status: string;
  createdAt: Date;
  domainId: string;
  domain: {
    id: string;
    domain: string;
    status: string;
    senders: Array<{ id: string; name: string; email: string }>;
  };
  _count: { emailHistory: number; contacts: number };
}

interface ContactListsPageClientProps {
  contactLists: ContactListWithRelations[];
  domains: Array<Domain & { senders: Sender[] }>;
}

export function ContactListsPageClient({
  contactLists,
  domains,
}: ContactListsPageClientProps) {

  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-md shadow-indigo-200">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contact Lists</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {contactLists.length.toLocaleString()} list
              {contactLists.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <CreateContactListDialog
          verifiedDomains={domains}
          defaultDomainId={activeDomainId ?? undefined}
        >
          <Button className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Create List
          </Button>
        </CreateContactListDialog>
      </div>

      {/* ── Grid (passes domain filter changes back up) ──────────── */}
      {contactLists.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
          <Users className="mx-auto h-12 w-12 text-gray-200 mb-4" />
          <p className="text-base font-semibold text-gray-600 mb-1">
            No contact lists yet
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Create your first list to start sending campaigns.
          </p>
          <CreateContactListDialog verifiedDomains={domains}>
            <Button className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Create Your First List
            </Button>
          </CreateContactListDialog>
        </div>
      ) : (
        <ContactListsGrid
          contactLists={contactLists}
          domains={domains}
          onDomainFilterChange={setActiveDomainId}
        />
      )}
    </div>
  );
}
