// app/(dashboard)/domains/page.tsx
import { requireAuth } from "@/app/_lib/auth/session";
import { getAllDomains } from "./actions";
import { AddDomainDialog } from "../../_components/domain-dialgue";
import { DomainList } from "../../_components/domain-list";
import { DomainsStats } from "../../_components/domain-stats";

export default async function DomainsPage() {
  await requireAuth();
  const { domains } = await getAllDomains();  
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center shadow-md shadow-teal-200">
            <svg
              className="h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Domains</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Configure sending domains and email senders
            </p>
          </div>
        </div>
        <AddDomainDialog />
      </div>

      {/* ── Stats — client component so it can compute partiallyVerified ── */}
      {domains && domains.length > 0 && (
        <DomainsStats domains={domains as any} />
      )}

      {/* ── Domain List or Empty State ─────────────────────────────────── */}
      {domains && domains.length > 0 ? (
        <DomainList domains={domains as any} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
            <svg
              className="h-6 w-6 text-teal-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            No domains yet
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            Add a domain you own to send professional emails with your brand.
          </p>
          <div className="mt-5">
            <AddDomainDialog />
          </div>
        </div>
      )}

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <svg
            className="h-4 w-4 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h2 className="text-sm font-bold text-gray-900">
            How domain verification works
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: "1",
              title: "Add your domain",
              desc: "Enter the domain you want to use for sending emails.",
            },
            {
              step: "2",
              title: "Configure DNS",
              desc: "Add the provided SPF, DKIM, and DMARC records to your DNS provider.",
            },
            {
              step: "3",
              title: "Verify",
              desc: "Click verify once DNS records are added. Propagation can take up to 48 hours.",
            },
            {
              step: "4",
              title: "Enable tracking",
              desc: "Add the tracking CNAME record to unlock open rates and click-through analytics.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
