"use client";

/**
 * ClickTrackingSetup
 *
 * Drop this inside DomainCard (in domain-list.tsx) when domain.status === "verified".
 * Unlike Resend, Mailchimp Transactional (Mandrill) tracks opens and clicks
 * automatically for every send (trackOpens/trackClicks default to true in
 * mailchimp-transactional-client.ts) — no separate DNS/CNAME setup required.
 * This panel just confirms that to the user.
 */

import { useState } from "react";
import { Badge } from "@/app/_components/ui/badge";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  Eye,
  CheckCircle2,
} from "lucide-react";

interface ClickTrackingSetupProps {
  /** The verified domain string, e.g. "yourdomain.com" */
  domain: string;
}

export function ClickTrackingSetup({ domain }: ClickTrackingSetupProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50/60 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <MousePointerClick className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Click &amp; Open Tracking
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                Active
              </Badge>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Enabled automatically for {domain} — no setup required
            </p>
          </div>
        </div>
        <div className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0 ml-4">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-900">
              Mailchimp Transactional tracks opens and clicks on every email
              sent from this domain by default — there's no DNS record to add.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: Eye,
                title: "Open Tracking",
                desc: "Know exactly when recipients open your emails and from which devices.",
                color: "text-blue-600",
                bg: "bg-blue-50 border-blue-200",
              },
              {
                icon: MousePointerClick,
                title: "Click Tracking",
                desc: "See which links get clicked and how many unique recipients clicked them.",
                color: "text-violet-600",
                bg: "bg-violet-50 border-violet-200",
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className={`flex items-start gap-3 p-3 rounded-xl border ${bg}`}
              >
                <Icon className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
                <div>
                  <p className={`text-xs font-bold ${color}`}>{title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
