

"use client";

import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Mail,
  Users,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  XCircle,
  MousePointerClick,
  Smartphone,
  Monitor,
  Trash2,
  Trash,
  BarChart3,
  Calendar,
  Globe,
  RefreshCw,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteEmailHistory,
  deleteManyEmailHistories,
  clearAllEmailHistories,
} from "@/app/(dashboard)/email-history/actions";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailHistoryItem {
  id: string;
  subject: string;
  body: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  failedCount: number;
  bouncedCount: number;
  complainedCount?: number;
  unsubscribedCount?: number;
  status?: string;
  senderName?: string;
  senderEmail?: string;
  preheader?: string;
  createdAt: Date;
  // contactList is nullable — list may have been deleted
  contactList: {
    name: string;
    domain: { domain: string };
    _count: { emailHistory: number };
  } | null;
}

interface EmailHistoryListProps {
  emailHistory: EmailHistoryItem[];
  total: number;
  currentPage: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmailPreviewHtml(body: string, senderName: string) {
  if (body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html"))
    return body;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.wrapper{padding:24px 16px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.1)}.body-content{padding:36px 44px;color:#374151;font-size:15px;line-height:1.7}.body-content h1{font-size:26px;font-weight:700;margin-bottom:14px;color:#111827}.body-content h2{font-size:20px;font-weight:600;margin-bottom:12px;color:#111827}.body-content p{margin-bottom:14px}.body-content ul,.body-content ol{margin-bottom:14px;padding-left:22px}.body-content li{margin-bottom:5px}.body-content a{color:#2563eb}.body-content strong{font-weight:700}.body-content img{max-width:100%;border-radius:6px}.footer{padding:18px 44px;border-top:1px solid #e5e7eb;text-align:center}.footer p{font-size:12px;color:#9ca3af}.footer a{color:#6b7280;text-decoration:underline}</style></head><body><div class="wrapper"><div class="container"><div class="body-content">${body}</div><div class="footer"><p>Sent by <strong>${senderName}</strong> · <a href="#">Unsubscribe</a></p></div></div></div></body></html>`;
}

// ── Status badge config ───────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  cls: string;
  Icon: React.ElementType;
  animated?: boolean;
};

function getStatusConfig(
  status?: string,
  email?: EmailHistoryItem,
): StatusConfig {
  // Explicit status field takes priority (new Inngest-based sends always set this)
  switch (status) {
    case "queued":
      return {
        label: "Queued",
        cls: "bg-yellow-100 text-yellow-700 border-yellow-200 border",
        Icon: Clock,
      };
    case "sending":
      return {
        label: "Sending…",
        cls: "bg-blue-100 text-blue-700 border-blue-200 border",
        Icon: Loader2,
        animated: true,
      };
    case "failed":
      return {
        label: "Failed",
        cls: "bg-red-100 text-red-700 border-red-200 border",
        Icon: XCircle,
      };
    case "sent":
    default:
      break;
  }

  // Fallback: derive from counts (for legacy records without explicit status)
  if (email) {
    if (email.failedCount > 0 && email.deliveredCount === 0)
      return {
        label: "Failed",
        cls: "bg-red-100 text-red-700 border-red-200 border",
        Icon: XCircle,
      };
    if (email.deliveredCount > 0 && email.failedCount > 0)
      return {
        label: "Partial",
        cls: "bg-yellow-100 text-yellow-700 border-yellow-200 border",
        Icon: AlertCircle,
      };
    if (email.deliveredCount > 0)
      return {
        label: "Delivered",
        cls: "bg-emerald-100 text-emerald-700 border-emerald-200 border",
        Icon: CheckCircle,
      };
  }

  return {
    label: "Sent",
    cls: "bg-blue-100 text-blue-700 border-blue-200 border",
    Icon: Send,
  };
}

// ── Sent count display — handles queued/sending states ───────────────────────

function SentCountDisplay({ email }: { email: EmailHistoryItem }) {
  if (email.status === "queued") {
    return (
      <span className="text-yellow-600 text-xs flex items-center gap-1">
        <Clock className="h-3 w-3" /> Queued
      </span>
    );
  }
  if (email.status === "sending") {
    return (
      <span className="text-blue-600 text-xs flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Sending…
      </span>
    );
  }
  return <>{email.sentCount.toLocaleString()}</>;
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────

function EmailDetailDialog({
  email,
  open,
  onClose,
}: {
  email: EmailHistoryItem;
  open: boolean;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const sentCount = email.sentCount || 0;
  const deliveredCount = email.deliveredCount || 0;
  const openedCount = email.openedCount || 0;
  const clickedCount = email.clickedCount || 0;
  const failedCount = email.failedCount || 0;
  const bouncedCount = email.bouncedCount || 0;
  const complainedCount = email.complainedCount || 0;
  const unsubscribedCount = email.unsubscribedCount || 0;

  const deliveryRate =
    sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0;
  const openRate =
    deliveredCount > 0 ? Math.round((openedCount / deliveredCount) * 100) : 0;
  const clickRate =
    deliveredCount > 0 ? Math.round((clickedCount / deliveredCount) * 100) : 0;
  const bounceRate =
    sentCount > 0 ? Math.round((bouncedCount / sentCount) * 100) : 0;
  const complaintRate =
    sentCount > 0 ? ((complainedCount / sentCount) * 100).toFixed(3) : "0.000";

  const isInProgress = email.status === "queued" || email.status === "sending";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white rounded-t-xl">
          <DialogTitle className="text-base font-semibold text-gray-900 pr-8 truncate">
            {email.subject}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            {isInProgress ? (
              <span className="flex items-center gap-1 text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                {email.status === "queued"
                  ? "Queued — waiting to send"
                  : "Sending in background…"}
              </span>
            ) : (
              <>
                Sent{" "}
                {new Date(email.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {sentCount.toLocaleString()} recipients
              </>
            )}
          </DialogDescription>
        </div>

        <div className="p-6">
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl mb-6">
              <TabsTrigger
                value="overview"
                className="rounded-lg text-xs font-medium"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="rounded-lg text-xs font-medium"
              >
                Preview
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-lg text-xs font-medium"
              >
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* ── Overview ────────────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-5">
              {isInProgress && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                  <p className="text-sm text-blue-800">
                    {email.status === "queued"
                      ? "This campaign is queued and will start sending shortly."
                      : "This campaign is currently sending in the background. Stats will update automatically."}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  {
                    label: "Contact List",
                    value: email.contactList?.name ?? "Deleted List",
                  },
                  {
                    label: "Domain",
                    value: email.contactList?.domain.domain ?? "—",
                  },
                  ...(email.senderName
                    ? [
                        {
                          label: "Sender",
                          value: `${email.senderName} <${email.senderEmail}>`,
                        },
                      ]
                    : []),
                  {
                    label: "Campaigns",
                    value: email.contactList
                      ? `${email.contactList._count.emailHistory} total from this list`
                      : "—",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  {
                    label: "Sent",
                    value: sentCount,
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                  },
                  {
                    label: "Delivered",
                    value: deliveredCount,
                    bg: "bg-emerald-50",
                    text: "text-emerald-700",
                  },
                  {
                    label: "Opened",
                    value: openedCount,
                    bg: "bg-purple-50",
                    text: "text-purple-700",
                  },
                  {
                    label: "Clicked",
                    value: clickedCount,
                    bg: "bg-indigo-50",
                    text: "text-indigo-700",
                  },
                  {
                    label: "Failed",
                    value: failedCount,
                    bg: "bg-red-50",
                    text: "text-red-700",
                  },
                  {
                    label: "Bounced",
                    value: bouncedCount,
                    bg: "bg-orange-50",
                    text: "text-orange-700",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className={`${m.bg} rounded-xl p-3 text-center`}
                  >
                    <p className={`text-xl font-bold ${m.text}`}>
                      {m.value.toLocaleString()}
                    </p>
                    <p
                      className={`text-[10px] ${m.text} mt-0.5 font-semibold uppercase tracking-wide`}
                    >
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>

              {!isInProgress && sentCount > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Delivery Rate",
                      value: `${deliveryRate}%`,
                      good: deliveryRate > 95,
                    },
                    {
                      label: "Open Rate",
                      value: `${openRate}%`,
                      good: openRate > 20,
                    },
                    {
                      label: "Click Rate",
                      value: `${clickRate}%`,
                      good: clickRate > 2,
                    },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="text-center p-3 border border-gray-100 rounded-xl bg-white"
                    >
                      <p
                        className={`text-2xl font-bold ${r.good ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {r.value}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        {r.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Preview ──────────────────────────────────────────────── */}
            <TabsContent value="preview" className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Inbox preview</p>
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  {(["desktop", "mobile"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
                    >
                      {m === "desktop" ? (
                        <Monitor className="h-3 w-3" />
                      ) : (
                        <Smartphone className="h-3 w-3" />
                      )}
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(email.senderName || "S").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {email.senderName || "Sender"}
                    </p>
                    <p className="text-xs text-gray-700 truncate font-medium mt-0.5">
                      {email.subject}
                    </p>
                    {email.preheader && (
                      <p className="text-xs text-gray-400 truncate">
                        {email.preheader}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-3 overflow-auto max-h-64">
                  <div
                    className={`mx-auto bg-white rounded-lg overflow-hidden shadow-sm ${viewMode === "mobile" ? "max-w-[320px]" : "max-w-full"}`}
                  >
                    <iframe
                      srcDoc={buildEmailPreviewHtml(
                        email.body,
                        email.senderName || "Sender",
                      )}
                      title="Email preview"
                      className="w-full border-0 block"
                      style={{ height: 420 }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Analytics ────────────────────────────────────────────── */}
            <TabsContent value="analytics" className="space-y-3">
              {isInProgress ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-400" />
                  <p className="text-sm font-medium text-gray-600">
                    {email.status === "queued"
                      ? "Campaign not started yet"
                      : "Campaign sending…"}
                  </p>
                  <p className="text-xs mt-1">
                    Analytics will appear here once emails are sent.
                  </p>
                </div>
              ) : (
                [
                  {
                    label: "Delivery Rate",
                    value: `${deliveryRate}%`,
                    detail: `${deliveredCount.toLocaleString()} of ${sentCount.toLocaleString()} delivered`,
                    good: deliveryRate > 95,
                  },
                  {
                    label: "Open Rate",
                    value: `${openRate}%`,
                    detail: `${openedCount.toLocaleString()} opens`,
                    good: openRate > 20,
                  },
                  {
                    label: "Click Rate",
                    value: `${clickRate}%`,
                    detail: `${clickedCount.toLocaleString()} link clicks`,
                    good: clickRate > 2,
                  },
                  {
                    label: "Bounce Rate",
                    value: `${bounceRate}%`,
                    detail: `${bouncedCount.toLocaleString()} bounced`,
                    good: bounceRate === 0,
                  },
                  {
                    label: "Complaint Rate",
                    value: `${complaintRate}%`,
                    detail: `${complainedCount} spam complaints`,
                    good: complainedCount === 0,
                  },
                  {
                    label: "Unsubscribes",
                    value: String(unsubscribedCount),
                    detail: "removed from list",
                    good: unsubscribedCount === 0,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400">{item.detail}</p>
                    </div>
                    <span
                      className={`text-lg font-bold ${item.good ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main List ─────────────────────────────────────────────────────────────────

export function EmailHistoryList({
  emailHistory,
  total,
  currentPage,
  totalPages,
}: EmailHistoryListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const handleSelectItem = (id: string, checked: boolean) => {
    const next = new Set(selectedItems);
    checked ? next.add(id) : next.delete(id);
    if (!checked) setIsSelectAll(false);
    setSelectedItems(next);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(
      checked ? new Set(emailHistory.map((i) => i.id)) : new Set(),
    );
    setIsSelectAll(checked);
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        await deleteManyEmailHistories(Array.from(selectedItems));
        setSelectedItems(new Set());
        setIsSelectAll(false);
        toast.success(
          `Deleted ${selectedItems.size} campaign${selectedItems.size !== 1 ? "s" : ""}.`,
        );
        router.refresh();
      } catch {
        toast.error("Failed to delete selected campaigns.");
      }
    });
  };

  const handleClearAll = () => {
    startTransition(async () => {
      try {
        await clearAllEmailHistories();
        setSelectedItems(new Set());
        setIsSelectAll(false);
        toast.success("All email history cleared.");
        router.refresh();
      } catch {
        toast.error("Failed to clear history.");
      }
    });
  };

  const handleSingleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteEmailHistory(id);
        toast.success("Campaign deleted.");
        router.refresh();
      } catch {
        toast.error("Failed to delete.");
      }
    });
  };

  const handleResync = async (id: string) => {
    setSyncingIds((prev) => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/email-history?id=${id}`);
      if (!response.ok) throw new Error("Sync failed");
      toast.success("Campaign metrics synchronized!");
      router.refresh();
    } catch {
      toast.error("Failed to sync campaign statistics.");
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const navigatePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/email-history?${params.toString()}`);
  };

  if (emailHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
        <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">
          No campaigns found
        </h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          {total === 0
            ? "You haven't sent any campaigns yet."
            : "No campaigns match your current filters."}
        </p>
        {total === 0 && (
          <Button size="sm" className="mt-5" asChild>
            <Link href="/send-email">
              <Send className="mr-1.5 h-3.5 w-3.5" /> Send First Campaign
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelectAll}
              onCheckedChange={handleSelectAll}
              disabled={isPending}
            />
            <span className="text-sm text-gray-500 select-none">
              Select all ({emailHistory.length})
            </span>
          </div>
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                {selectedItems.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isPending}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete selected
              </Button>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={isPending || emailHistory.length === 0}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash className="mr-1.5 h-3.5 w-3.5" /> Clear all history
        </Button>
      </div>

      {/* Campaign cards */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
        {emailHistory.map((email) => {
          const statusConfig = getStatusConfig(email.status, email);
          const { label, cls, Icon, animated } = statusConfig;

          const deliveryRate =
            email.sentCount > 0
              ? Math.round((email.deliveredCount / email.sentCount) * 100)
              : 0;
          const openRate =
            email.deliveredCount > 0
              ? Math.round((email.openedCount / email.deliveredCount) * 100)
              : 0;

          const isSelected = selectedItems.has(email.id);
          const isSyncingThis = syncingIds.has(email.id);
          const isInProgress =
            email.status === "queued" || email.status === "sending";

          // contactList may be null if deleted
          const listName = email.contactList?.name ?? "Deleted List";
          const domainName = email.contactList?.domain.domain ?? "—";

          return (
            <div
              key={email.id}
              className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? "bg-blue-50/30" : ""}`}
              onClick={() => setOpenDetailId(email.id)}
            >
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(c) => handleSelectItem(email.id, !!c)}
                  disabled={isPending}
                />
              </div>

              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-100 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {email.subject}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cls}`}
                  >
                    <Icon
                      className={`h-2.5 w-2.5 ${animated ? "animate-spin" : ""}`}
                    />
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {listName}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(email.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {domainName}
                  </span>
                </div>
              </div>

              {/* Stats — show spinner/label for in-progress */}
              <div className="hidden md:flex items-center gap-5 shrink-0 text-center">
                {isInProgress ? (
                  <div className="flex items-center gap-2 text-xs">
                    {email.status === "queued" ? (
                      <span className="flex items-center gap-1 text-yellow-600 font-medium">
                        <Clock className="h-3.5 w-3.5" /> Queued
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-blue-600 font-medium">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        Sending…
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    {[
                      {
                        label: "Sent",
                        value: email.sentCount.toLocaleString(),
                        color: "text-gray-900",
                      },
                      {
                        label: "Delivered",
                        value: `${deliveryRate}%`,
                        color: "text-emerald-600",
                      },
                      {
                        label: "Opened",
                        value: `${openRate}%`,
                        color: "text-purple-600",
                      },
                      {
                        label: "Clicked",
                        value: email.clickedCount.toLocaleString(),
                        color: "text-indigo-600",
                      },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className={`text-sm font-bold ${color}`}>{value}</p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                          {label}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResync(email.id);
                  }}
                  disabled={isPending || isSyncingThis || isInProgress}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                  title={
                    isInProgress
                      ? "Can't sync while sending"
                      : "Force metrics resync"
                  }
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncingThis ? "animate-spin text-blue-600" : ""}`}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSingleDelete(email.id);
                  }}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail dialogs */}
      {emailHistory.map((email) => (
        <EmailDetailDialog
          key={email.id}
          email={email}
          open={openDetailId === email.id}
          onClose={() => setOpenDetailId(null)}
        />
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} · {total.toLocaleString()} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
