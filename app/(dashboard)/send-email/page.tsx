import { requireAuth } from "@/app/_lib/auth/session";
import prisma from "@/app/_lib/db/prisma";
import { Button } from "@/app/_components/ui/button";
import { EmailComposer } from "@/app/_components/email-composer";
import { Globe, Users, Send } from "lucide-react";
import Link from "next/link";
import { getLastEmailSubject } from "./actions";

async function getContactLists(userId: string) {
  return prisma.contactList.findMany({
    where: { createdBy: userId },
    include: {
      domain: { include: { senders: true } },
      _count: { select: { contacts: true, emailHistory: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getSenders(userId: string) {
  return prisma.sender.findMany({
    where: { userId },
    include: { domain: true },
    orderBy: { createdAt: "desc" },
  });
}

export default async function SendEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    listId?: string;
    listIds?: string;
    domainId?: string;
    senderId?: string;
  }>;
}) {
  const user = await requireAuth();
  const resolvedParams = await searchParams;

  const [contactLists, senders, lastSubject] = await Promise.all([
    getContactLists(user.id),
    getSenders(user.id),
    getLastEmailSubject(),
  ]);

  const hasNoSetup = contactLists.length === 0 || senders.length === 0;

  // Multi-list pre-selection (e.g. "Send to all" from the contact lists grid)
  const listIdsFromUrl = (resolvedParams.listIds || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .filter((id) => contactLists.some((l) => l.id === id));

  // Initial selections (optional, from query params / first item)
  const activeListId =
    resolvedParams.listId || listIdsFromUrl[0] || (contactLists[0]?.id ?? "");
  const selectedList = contactLists.find((l) => l.id === activeListId);
  const targetDomainId =
    resolvedParams.domainId ||
    selectedList?.domain?.id ||
    (senders[0]?.domain?.id ?? "");
  const allowedSenders = senders.filter((s) => s.domain.id === targetDomainId);
  const initialSenderId =
    resolvedParams.senderId || (allowedSenders[0]?.id ?? "");

  const steps = [
    {
      done: senders.length > 0,
      label: "Verified sender",
      desc: "Add a domain and create a sender email address.",
      href: "/domains",
      cta: "Add Domain & Sender",
      icon: Globe,
    },
    {
      done: contactLists.length > 0,
      label: "Contact list",
      desc: "Create a contact list with email addresses to send to.",
      href: "/contact-lists",
      cta: "Create Contact List",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-md shadow-blue-200">
            <Send className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Send Campaign</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Compose and deliver your email campaign
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/domains">
              <Globe className="mr-1.5 h-3.5 w-3.5" /> Domains
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/contact-lists">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Lists
            </Link>
          </Button>
        </div>
      </div>

      {!hasNoSetup ? (
        <EmailComposer
          contactLists={contactLists as any}
          senders={senders as any}
          initialListId={activeListId}
          initialListIds={listIdsFromUrl}
          initialDomainId={targetDomainId}
          initialSenderId={initialSenderId}
          lastSubject={lastSubject}
        />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Almost ready to send!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Complete these steps before sending your first campaign.
          </p>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.label} className="flex items-start gap-4">
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${step.done ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}
                >
                  <step.icon
                    className={`h-4 w-4 ${step.done ? "text-emerald-600" : "text-gray-400"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {step.label}
                    </p>
                    {step.done && (
                      <span className="text-xs text-emerald-600 font-medium">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                  {!step.done && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="mt-2"
                    >
                      <Link href={step.href}>{step.cta}</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
