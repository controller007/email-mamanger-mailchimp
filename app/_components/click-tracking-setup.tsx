"use client";

/**
 * ClickTrackingSetup
 *
 * Drop this inside DomainCard (in domain-list.tsx) when domain.status === "verified".
 * It renders a collapsible "Enable Click & Open Tracking" section with the
 * CNAME record the user must add to their DNS to activate Resend's tracking proxy.
 *
 * The tracking hostname is fixed to: track.domain.com
 * That CNAME must point to: resend.com (Resend's tracking infrastructure).
 *
 * Usage inside DomainCard JSX (after the Senders section):
 *
 *   {domain.status === "verified" && (
 *     <ClickTrackingSetup domain={domain.domain} />
 *   )}
 */

import { useState } from "react";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  Eye,
  AlertTriangle,
  Zap,
  Info,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

// This is your app's fixed tracking proxy domain — hardcoded per spec.
const TRACKING_HOST = "track.domain.com";
// The CNAME value Resend requires for its tracking infrastructure.
const CNAME_TARGET = "resend.com";

// ── Component ─────────────────────────────────────────────────────────────────

interface ClickTrackingSetupProps {
  /** The verified domain string, e.g. "yourdomain.com" */
  domain: string;
}

export function ClickTrackingSetup({ domain }: ClickTrackingSetupProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<"name" | "value" | null>(null);

  const copy = (text: string, field: "name" | "value") => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const record = {
    type: "CNAME",
    name: TRACKING_HOST,
    value: CNAME_TARGET,
  };

  return (
    <div className="border-t border-gray-100">
      {/* ── Collapsed trigger ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50/60 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
            <MousePointerClick className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Click &amp; Open Tracking
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                Setup Required
              </Badge>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Add one DNS record to track opens and clicks in your campaigns
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

      {/* ── Expanded panel ────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Why it matters */}
          <Alert className="border-violet-200 bg-violet-50">
            <Zap className="h-4 w-4 text-violet-600" />
            <AlertDescription className="text-violet-900">
              <strong>This is critical for campaign analytics.</strong> Without
              this DNS record, open rates and click-through rates will show as
              zero in your dashboard — you'll have no visibility into what's
              working. It takes under 2 minutes to add and unlocks the full
              power of your email analytics.
            </AlertDescription>
          </Alert>

          {/* What tracking gives you */}
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

          {/* How it works note */}
          <Alert className="border-gray-200 bg-gray-50">
            <Info className="h-4 w-4 text-gray-500" />
            <AlertDescription className="text-gray-700 text-sm">
              Tracking works via <strong>{TRACKING_HOST}</strong> — your app's
              dedicated tracking proxy. Links in your emails are rewritten to
              pass through this domain, logging opens and clicks before
              redirecting recipients to the original URL. No personal data is
              stored.
            </AlertDescription>
          </Alert>

          {/* The DNS record */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Add this DNS record at your domain provider
            </p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Name / Host</TableHead>
                    <TableHead className="text-xs">Value / Points To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-white">
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                        {record.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-700">
                          {record.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => copy(record.name, "name")}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Copy name"
                        >
                          {copied === "name" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-700">
                          {record.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => copy(record.value, "value")}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Copy value"
                        >
                          {copied === "value" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Step-by-step */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Steps
            </p>
            <ol className="space-y-2">
              {[
                "Log in to your DNS / domain provider (e.g. Hostinger, Cloudflare, Namecheap).",
                `Add a new CNAME record with Name: ${TRACKING_HOST} and Value: ${CNAME_TARGET}.`,
                "Save the record. DNS propagation usually takes 5–30 minutes, sometimes up to 48 hours.",
                "Once propagated, click tracking and open tracking will activate automatically for all new campaigns.",
              ].map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-xs text-gray-600"
                >
                  <span className="h-5 w-5 rounded-full bg-violet-100 text-violet-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Warning */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Do not skip this step.</strong> Your domain is verified
              and ready to send — but without the tracking CNAME your analytics
              page will show incomplete data. This is one of the most important
              DNS records for understanding campaign performance.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
