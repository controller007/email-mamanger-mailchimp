"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import {
  Globe,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Mail,
  Shield,
  AlertCircle,
  MousePointerClick,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  deleteDomain,
  deleteSender,
  getDomainRecords,
  verifyDomain,
  enableTracking,
  getTrackingRecords,
  verifyTracking,
} from "../(dashboard)/domains/actions";
import { DnsRecordsDisplay } from "./dns-record-display";
import { EditSenderDialog } from "./sender-dialogue";
import { AddSenderDialog } from "./add-sender";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DnsRecord {
  record: string;
  name: string;
  value: string;
  type: string;
  priority?: number;
  ttl?: string;
  status?: string;
}

interface Domain {
  id: string;
  domain: string;
  status: string;
  trackingSubdomain?: string | null;
  trackingStatus?: string | null;
  createdAt: Date;
  senders: Array<{ id: string; name: string; email: string }>;
}

// ── DomainList ────────────────────────────────────────────────────────────────

export function DomainList({ domains }: { domains: Domain[] }) {
  return (
    <div className="space-y-4">
      {domains.map((domain) => (
        <DomainCard key={domain.id} domain={domain} />
      ))}
    </div>
  );
}

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "verified":
      return {
        label: "Verified",
        cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "pending":
      return {
        label: "Pending",
        cls: "bg-amber-100 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      };
    default:
      return {
        label: "Not verified",
        cls: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-500",
      };
  }
}

// ── ClickTrackingPanel ────────────────────────────────────────────────────────

type TrackingPanelState =
  | "idle"
  | "loading"
  | "records"
  | "verifying"
  | "verified"
  | "error";

interface TrackingState {
  panelState: TrackingPanelState;
  trackingSubdomainFull: string | null;
  trackingRecords: DnsRecord[];
  errorMsg: string;
  verifyMessage: string;
}

function ClickTrackingPanel({
  domainId,
  domainName,
  initialTrackingStatus,
}: {
  domainId: string;
  domainName: string;
  initialTrackingStatus: string | null | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<TrackingState>({
    panelState: initialTrackingStatus === "verified" ? "verified" : "idle",
    trackingSubdomainFull: null,
    trackingRecords: [],
    errorMsg: "",
    verifyMessage: "",
  });
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleEnable = async () => {
    setState((s) => ({ ...s, panelState: "loading", errorMsg: "" }));
    const result = await enableTracking(domainId);
    if (!result.success) {
      setState((s) => ({
        ...s,
        panelState: "error",
        errorMsg: result.error || "Failed to enable tracking",
      }));
      return;
    }
    setState((s) => ({
      ...s,
      panelState: "records",
      trackingSubdomainFull:
        (result as any).trackingSubdomainFull ?? `track.${domainName}`,
      trackingRecords: ((result as any).trackingRecords as DnsRecord[]) ?? [],
    }));
  };

  const handleFetchRecords = async () => {
    setState((s) => ({ ...s, panelState: "loading", errorMsg: "" }));
    const result = await getTrackingRecords(domainId);
    if (!result.success) {
      setState((s) => ({
        ...s,
        panelState: "error",
        errorMsg: result.error || "Failed to fetch records",
      }));
      return;
    }
    setState((s) => ({
      ...s,
      panelState:
        (result as any).trackingStatus === "verified" ? "verified" : "records",
      trackingSubdomainFull:
        (result as any).trackingSubdomainFull ?? `track.${domainName}`,
      trackingRecords: ((result as any).trackingRecords as DnsRecord[]) ?? [],
    }));
  };

  const handleVerify = async () => {
    setState((s) => ({
      ...s,
      panelState: "verifying",
      verifyMessage: "",
      errorMsg: "",
    }));
    const result = await verifyTracking(domainId);
    if (!result.success) {
      setState((s) => ({
        ...s,
        panelState: "records",
        errorMsg: result.error || "Verification failed",
      }));
      return;
    }
    setState((s) => ({
      ...s,
      panelState:
        (result as any).trackingStatus === "verified" ? "verified" : "records",
      trackingRecords:
        ((result as any).trackingRecords as DnsRecord[]) ?? s.trackingRecords,
      verifyMessage: (result as any).message || "",
      errorMsg: "",
    }));
  };

  const handleToggle = () => {
    if (!expanded) {
      setExpanded(true);
      if (state.panelState === "idle") handleFetchRecords();
    } else {
      setExpanded(false);
    }
  };

  const isVerified =
    initialTrackingStatus === "verified" || state.panelState === "verified";

  return (
    <div className="border-t border-gray-100">
      {/* Collapsed trigger */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50/60 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${isVerified ? "bg-emerald-50 border-emerald-200" : "bg-violet-50 border-violet-200"}`}
          >
            <MousePointerClick
              className={`h-4 w-4 ${isVerified ? "text-emerald-600" : "text-violet-600"}`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              Click &amp; Open Tracking
              {isVerified ? (
                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                  Active
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                  Setup Required
                </Badge>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isVerified
                ? `Tracking active on track.${domainName}`
                : "Add one DNS record to unlock full campaign analytics"}
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
          {/* Loading */}
          {state.panelState === "loading" && (
            <div className="flex items-center gap-3 py-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              Fetching tracking records from System...
            </div>
          )}

          {/* Error */}
          {state.panelState === "error" && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.errorMsg}</AlertDescription>
              </Alert>
              <Button onClick={handleEnable} className="w-full">
                <MousePointerClick className="mr-2 h-4 w-4" />
                Enable Click &amp; Open Tracking
              </Button>
            </>
          )}

          {/* Verified */}
          {state.panelState === "verified" && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                <strong>Tracking is live!</strong> Open rates and click-through
                rates are now captured for all campaigns on{" "}
                <strong>track.{domainName}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {/* Idle — not yet enabled */}
          {state.panelState === "idle" && (
            <>
              <Alert className="border-violet-200 bg-violet-50">
                <Zap className="h-4 w-4 text-violet-600" />
                <AlertDescription className="text-violet-900">
                  <strong>This is critical for campaign analytics.</strong>{" "}
                  Without this DNS record, open rates and click-through rates
                  show as zero. Takes under 2 minutes to add and unlocks
                  everything in your analytics dashboard.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    {
                      icon: Eye,
                      title: "Open Tracking",
                      desc: "Know when recipients open your emails and on which devices.",
                      color: "text-blue-600",
                      bg: "bg-blue-50 border-blue-200",
                    },
                    {
                      icon: MousePointerClick,
                      title: "Click Tracking",
                      desc: "See which links get clicked and by how many unique recipients.",
                      color: "text-violet-600",
                      bg: "bg-violet-50 border-violet-200",
                    },
                  ] as const
                ).map(({ icon: Icon, title, desc, color, bg }) => (
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
              <Button onClick={handleEnable} className="w-full">
                <MousePointerClick className="mr-2 h-4 w-4" />
                Enable Click &amp; Open Tracking
              </Button>
            </>
          )}

          {/* Records — DNS to add */}
          {(state.panelState === "records" ||
            state.panelState === "verifying") && (
            <>
              {state.verifyMessage && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {state.verifyMessage}
                  </AlertDescription>
                </Alert>
              )}
              {state.errorMsg && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.errorMsg}</AlertDescription>
                </Alert>
              )}
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Do not skip this step.</strong> Without these records,
                  opens and clicks appear as zero in your analytics — you'll
                  have no visibility into campaign performance.
                </AlertDescription>
              </Alert>
              <Alert className="border-gray-200 bg-gray-50">
                <Info className="h-4 w-4 text-gray-500" />
                <AlertDescription className="text-gray-700">
                  Tracking runs via{" "}
                  <strong>
                    {state.trackingSubdomainFull ?? `track.${domainName}`}
                  </strong>
                  . Links in emails are rewritten through this host, logging
                  opens and clicks before redirecting to the original URL. No
                  personal data is stored.
                </AlertDescription>
              </Alert>
              {state.trackingRecords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Add these DNS records at your domain provider
                  </p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs w-16">Type</TableHead>
                          <TableHead className="text-xs">Name / Host</TableHead>
                          <TableHead className="text-xs">
                            Value / Points To
                          </TableHead>
                          <TableHead className="text-xs w-20">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.trackingRecords.map((rec, i) => (
                          <TableRow key={i} className="bg-white">
                            <TableCell>
                              <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                                {rec.type}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-gray-700 break-all">
                                  {rec.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyText(rec.name, `n${i}`)}
                                  className="p-1 rounded hover:bg-gray-100 shrink-0"
                                >
                                  {copied === `n${i}` ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-gray-700 break-all">
                                  {rec.value}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyText(rec.value, `v${i}`)}
                                  className="p-1 rounded hover:bg-gray-100 shrink-0"
                                >
                                  {copied === `v${i}` ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {rec.status === "verified" ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px]">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {state.trackingRecords.some(
                    (r) => r.record === "TrackingCAA",
                  ) && (
                    <p className="text-xs text-gray-500 flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                      The CAA record is required because your domain has
                      existing CAA records. It allows System to issue a TLS
                      certificate for your tracking subdomain.
                    </p>
                  )}
                </div>
              )}
              <ol className="space-y-2">
                {[
                  "Log in to your DNS / domain provider (e.g. Cloudflare, Namecheap, Hostinger).",
                  "Add the record(s) above. For the CNAME: Name is the full subdomain, Value is where it points.",
                  "Save. DNS propagation usually takes 5–30 minutes, sometimes up to 48 hours.",
                  `Click "Verify Tracking" once you've added the records.`,
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
              <Button
                onClick={handleVerify}
                disabled={state.panelState === "verifying"}
                variant="outline"
                className="w-full border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                {state.panelState === "verifying" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verify Tracking
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── DomainCard ────────────────────────────────────────────────────────────────

function DomainCard({ domain }: { domain: Domain }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const cfg = statusConfig(domain.status);

  const handleVerify = async () => {
    setIsVerifying(true);
    setMessage("");
    const result = await verifyDomain(domain.id);
    setMessage(
      result.success
        ? result.message || "Verified!"
        : result.error || "Verification failed",
    );
    setMessageOk(!!result.success);
    if (result.success) router.refresh();
    setIsVerifying(false);
  };

  const handleToggleRecords = async () => {
    if (showRecords) {
      setShowRecords(false);
      return;
    }
    const result = await getDomainRecords(domain.id);
    if (result.success && result.records) {
      setRecords(result.records);
      setShowRecords(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteDomain(domain.id);
    if (result.success) router.refresh();
    setIsDeleting(false);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${domain.status === "verified" ? "bg-emerald-50 border border-emerald-200" : "bg-gray-100 border border-gray-200"}`}
          >
            <Globe
              className={`h-5 w-5 ${domain.status === "verified" ? "text-emerald-600" : "text-gray-500"}`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">
                {domain.domain}
              </h3>
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Added{" "}
              {new Date(domain.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · {domain.senders.length} sender
              {domain.senders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerify}
            disabled={isVerifying || domain.status === "verified"}
            className="rounded-xl"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                Verify Domain
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleRecords}
            className="rounded-xl"
          >
            {showRecords ? (
              <>
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                Hide DNS
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View DNS
              </>
            )}
          </Button>
          {domain.status === "verified" && (
            <AddSenderDialog domainId={domain.id} domainName={domain.domain} />
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                disabled={isDeleting}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete domain?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently deletes <strong>{domain.domain}</strong> and all
                  its senders and contact lists. Cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {message && (
        <div className="px-6 pb-3">
          <Alert
            className={
              messageOk
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }
          >
            <AlertCircle
              className={`h-4 w-4 ${messageOk ? "text-emerald-600" : "text-red-600"}`}
            />
            <AlertDescription
              className={messageOk ? "text-emerald-800" : "text-red-800"}
            >
              {message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {showRecords && records.length > 0 && (
        <div className="px-6 pb-4">
          <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
            <DnsRecordsDisplay
              records={records}
              domain={domain.domain}
              domainId={domain.id}
              onClose={() => setShowRecords(false)}
            />
          </div>
        </div>
      )}

      {/* Tracking panel — verified domains only */}
      {domain.status === "verified" && (
        <ClickTrackingPanel
          domainId={domain.id}
          domainName={domain.domain}
          initialTrackingStatus={domain.trackingStatus}
        />
      )}

      {/* Senders */}
      {domain.senders.length > 0 ? (
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Senders ({domain.senders.length})
          </p>
          <div className="space-y-2">
            {domain.senders.map((sender) => (
              <SenderRow
                key={sender.id}
                sender={sender}
                domainName={domain.domain}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-6 py-4 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                No senders yet
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {domain.status === "verified"
                  ? "Add a sender email address (e.g. noreply@yourdomain.com) to start sending campaigns."
                  : "Verify your domain first, then add sender email addresses."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SenderRow ─────────────────────────────────────────────────────────────────

function SenderRow({
  sender,
  domainName,
}: {
  sender: { id: string; name: string; email: string };
  domainName: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteSender(sender.id);
    if (result.success) router.refresh();
    setIsDeleting(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {sender.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {sender.name}
        </p>
        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
          <Mail className="h-2.5 w-2.5" />
          {sender.email}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <EditSenderDialog sender={sender} domainName={domainName} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete sender"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete sender?</AlertDialogTitle>
              <AlertDialogDescription>
                Permanently deletes <strong>{sender.email}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete Sender"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
