"use client";

/**
 * email-detail-dialog.tsx — UPGRADED
 * ─────────────────────────────────────
 * Drop-in replacement. Renders visual builder HTML correctly in the preview tab.
 * Analytics tab has richer progress bars and color-coded health indicators.
 * Wider dialog, taller iframe, mobile phone frame for mobile preview.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/app/_components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import {
  Monitor,
  Smartphone,
  Send,
  Eye,
  BarChart2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  MousePointerClick,
  MailOpen,
  Truck,
  X,
  Info,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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
  contactList: {
    name: string;
    domain: { domain: string };
    _count: { emailHistory: number };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML preview builder (handles both visual builder HTML and plain Tiptap HTML)
// ─────────────────────────────────────────────────────────────────────────────

function buildEmailPreviewHtml(body: string, senderName: string): string {
  // Visual builder templates already contain full DOCTYPE HTML
  if (body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html")) {
    return body;
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrapper{padding:24px 12px}
    .container{max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08)}
    .body-content{padding:36px 44px;color:#374151;font-size:15px;line-height:1.7}
    .footer{padding:16px 44px;border-top:1px solid #e5e7eb;text-align:center}
    .footer p{font-size:12px;color:#9ca3af}
    .footer a{color:#6b7280;text-decoration:underline}
    .body-content h1{font-size:26px;font-weight:700;margin-bottom:14px;color:#111827;line-height:1.25}
    .body-content h2{font-size:20px;font-weight:600;margin-bottom:12px;color:#111827}
    .body-content h3{font-size:17px;font-weight:600;margin-bottom:10px;color:#111827}
    .body-content p{margin-bottom:14px}
    .body-content ul,.body-content ol{margin-bottom:14px;padding-left:22px}
    .body-content li{margin-bottom:5px}
    .body-content a{color:#2563eb;text-decoration:underline}
    .body-content strong{font-weight:700}
    .body-content em{font-style:italic}
    .body-content blockquote{padding:10px 14px;border-left:4px solid #e5e7eb;color:#6b7280;font-style:italic;margin-bottom:14px}
    .body-content img{max-width:100%;border-radius:6px;height:auto}
    .body-content hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
    .body-content table{width:100%;border-collapse:collapse;margin-bottom:14px}
    .body-content td,.body-content th{padding:9px 11px;border:1px solid #e5e7eb;text-align:left}
    .body-content th{background:#f9fafb;font-weight:600}
    .body-content code{background:#f3f4f6;padding:2px 5px;border-radius:3px;font-family:monospace;font-size:13px}
    .body-content pre{background:#1e1e2e;color:#cdd6f4;padding:14px;border-radius:7px;overflow-x:auto;margin-bottom:14px}
    .body-content pre code{background:transparent;color:inherit;padding:0}
    @media(max-width:600px){.body-content{padding:20px 16px!important}.footer{padding:14px 16px!important}}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="body-content">${body || '<p style="color:#9ca3af;">No content</p>'}</div>
      <div class="footer">
        <p>Sent by <strong>${senderName}</strong> · <a href="#">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics stat bar
// ─────────────────────────────────────────────────────────────────────────────

function StatBar({
  label,
  value,
  detail,
  pct,
  color,
  icon,
  health,
}: {
  label: string;
  value: string;
  detail: string;
  pct: number;
  color: string;
  icon: React.ReactNode;
  health: "good" | "warn" | "bad" | "neutral";
}) {
  const healthIcon = {
    good: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    bad: <XCircle className="h-4 w-4 text-red-500" />,
    neutral: <Info className="h-4 w-4 text-gray-400" />,
  }[health];

  const barColor = {
    good: "bg-green-500",
    warn: "bg-amber-400",
    bad: "bg-red-400",
    neutral: "bg-blue-400",
  }[health];

  return (
    <div className="p-4 bg-white border border-gray-100 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color}`}>{icon}</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-400">{detail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {healthIcon}
          <span
            className={`text-xl font-bold ${health === "good" ? "text-green-700" : health === "warn" ? "text-amber-600" : health === "bad" ? "text-red-600" : "text-gray-700"}`}
          >
            {value}
          </span>
        </div>
      </div>
      {pct >= 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dialog
// ─────────────────────────────────────────────────────────────────────────────

export function EmailDetailDialog({
  email,
  open,
  onClose,
}: {
  email: EmailHistoryItem;
  open: boolean;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const deliveryRate =
    email.sentCount > 0
      ? Math.round((email.deliveredCount / email.sentCount) * 100)
      : 0;
  const openRate =
    email.deliveredCount > 0
      ? Math.round((email.openedCount / email.deliveredCount) * 100)
      : 0;
  const clickRate =
    email.deliveredCount > 0
      ? Math.round((email.clickedCount / email.deliveredCount) * 100)
      : 0;
  const bounceRate =
    email.sentCount > 0
      ? Number(((email.bouncedCount / email.sentCount) * 100).toFixed(2))
      : 0;
  const complaintRate =
    email.sentCount > 0
      ? Number(
          (((email.complainedCount || 0) / email.sentCount) * 100).toFixed(3),
        )
      : 0;

  const statusColor: Record<string, string> = {
    sent: "bg-green-100 text-green-700 border-green-200",
    sending: "bg-blue-100 text-blue-700 border-blue-200",
    failed: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl shrink-0">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-base font-semibold text-gray-900 truncate max-w-lg">
                  {email.subject}
                </DialogTitle>
                {email.status && (
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor[email.status] || statusColor.sent}`}
                  >
                    {email.status}
                  </span>
                )}
              </div>
              <DialogDescription className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  {email.contactList.name}
                </span>
                {" · "}
                {email.contactList.domain.domain}
                {" · "}
                {new Date(email.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ── Quick stat pills ─────────────────────────────────────────── */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {[
              {
                icon: <Send className="h-3.5 w-3.5" />,
                label: "Sent",
                value: email.sentCount,
                color: "bg-blue-50 text-blue-700",
              },
              {
                icon: <Truck className="h-3.5 w-3.5" />,
                label: "Delivered",
                value: email.deliveredCount,
                color: "bg-green-50 text-green-700",
              },
              {
                icon: <MailOpen className="h-3.5 w-3.5" />,
                label: "Opened",
                value: email.openedCount,
                color: "bg-purple-50 text-purple-700",
              },
              {
                icon: <MousePointerClick className="h-3.5 w-3.5" />,
                label: "Clicked",
                value: email.clickedCount,
                color: "bg-indigo-50 text-indigo-700",
              },
              {
                icon: <XCircle className="h-3.5 w-3.5" />,
                label: "Bounced",
                value: email.bouncedCount,
                color: "bg-red-50 text-red-700",
              },
              {
                icon: <AlertTriangle className="h-3.5 w-3.5" />,
                label: "Complaints",
                value: email.complainedCount || 0,
                color: "bg-orange-50 text-orange-700",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${stat.color} text-xs font-semibold`}
              >
                {stat.icon}
                <span>{stat.value.toLocaleString()}</span>
                <span className="font-normal opacity-70">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs
            defaultValue="preview"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mx-6 mt-4 mb-0 w-fit shrink-0">
              <TabsTrigger
                value="preview"
                className="text-xs flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Email Preview
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="text-xs flex items-center gap-1.5"
              >
                <BarChart2 className="h-3.5 w-3.5" /> Analytics
              </TabsTrigger>
              <TabsTrigger
                value="info"
                className="text-xs flex items-center gap-1.5"
              >
                <Info className="h-3.5 w-3.5" /> Details
              </TabsTrigger>
            </TabsList>

            {/* ── Preview tab ─────────────────────────────────────────── */}
            <TabsContent
              value="preview"
              className="flex-1 overflow-auto p-6 space-y-4"
            >
              {/* Controls */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Accurate inbox rendering of the sent email
                </p>
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setViewMode("desktop")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "desktop" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Monitor className="h-3 w-3" /> Desktop
                  </button>
                  <button
                    onClick={() => setViewMode("mobile")}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "mobile" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Smartphone className="h-3 w-3" /> Mobile
                  </button>
                </div>
              </div>

              {/* Inbox chrome */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(email.senderName || "S").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {email.senderName || "Sender"}
                        </p>
                        {email.senderEmail && (
                          <p className="text-xs text-gray-400">
                            &lt;{email.senderEmail}&gt;
                          </p>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700 mt-0.5 truncate">
                        {email.subject}
                      </p>
                      {email.preheader && (
                        <p className="text-xs text-gray-400 truncate">
                          {email.preheader}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(email.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Iframe */}
                <div className="bg-gray-100 p-4 flex justify-center overflow-auto">
                  {viewMode === "mobile" ? (
                    <div
                      className="relative bg-gray-900 rounded-[2.5rem] p-3 pb-4 shadow-2xl"
                      style={{ width: 380 }}
                    >
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-gray-700 rounded-full" />
                      <div className="bg-white rounded-[2rem] overflow-hidden mt-3">
                        <iframe
                          srcDoc={buildEmailPreviewHtml(
                            email.body,
                            email.senderName || "Sender",
                          )}
                          title="Mobile preview"
                          className="w-full border-0 block"
                          style={{ height: 520 }}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white shadow rounded-xl overflow-hidden w-full max-w-2xl">
                      <iframe
                        srcDoc={buildEmailPreviewHtml(
                          email.body,
                          email.senderName || "Sender",
                        )}
                        title="Desktop preview"
                        className="w-full border-0 block"
                        style={{ height: 560 }}
                        sandbox="allow-same-origin"
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Analytics tab ────────────────────────────────────────── */}
            <TabsContent
              value="analytics"
              className="flex-1 overflow-auto p-6 space-y-3"
            >
              <StatBar
                label="Delivery Rate"
                value={`${deliveryRate}%`}
                detail={`${email.deliveredCount.toLocaleString()} of ${email.sentCount.toLocaleString()} delivered`}
                pct={deliveryRate}
                color="bg-green-100"
                icon={<Truck className="h-4 w-4 text-green-700" />}
                health={
                  deliveryRate > 95
                    ? "good"
                    : deliveryRate > 85
                      ? "warn"
                      : "bad"
                }
              />
              <StatBar
                label="Open Rate"
                value={`${openRate}%`}
                detail={`${email.openedCount.toLocaleString()} recipients opened`}
                pct={openRate}
                color="bg-purple-100"
                icon={<MailOpen className="h-4 w-4 text-purple-700" />}
                health={
                  openRate > 25 ? "good" : openRate > 15 ? "warn" : "neutral"
                }
              />
              <StatBar
                label="Click Rate"
                value={`${clickRate}%`}
                detail={`${email.clickedCount.toLocaleString()} link clicks`}
                pct={clickRate}
                color="bg-indigo-100"
                icon={<MousePointerClick className="h-4 w-4 text-indigo-700" />}
                health={
                  clickRate > 5 ? "good" : clickRate > 2 ? "warn" : "neutral"
                }
              />
              <StatBar
                label="Bounce Rate"
                value={`${bounceRate}%`}
                detail={`${email.bouncedCount.toLocaleString()} bounced`}
                pct={bounceRate}
                color="bg-red-100"
                icon={<XCircle className="h-4 w-4 text-red-700" />}
                health={
                  bounceRate === 0 ? "good" : bounceRate < 2 ? "warn" : "bad"
                }
              />
              <StatBar
                label="Complaint Rate"
                value={`${complaintRate}%`}
                detail={`${(email.complainedCount || 0).toLocaleString()} spam complaints`}
                pct={complaintRate * 100} // scale up for visibility
                color="bg-orange-100"
                icon={<AlertTriangle className="h-4 w-4 text-orange-700" />}
                health={
                  (email.complainedCount || 0) === 0
                    ? "good"
                    : complaintRate < 0.08
                      ? "warn"
                      : "bad"
                }
              />
              <StatBar
                label="Unsubscribes"
                value={String(email.unsubscribedCount || 0)}
                detail="removed from contact list"
                pct={-1}
                color="bg-gray-100"
                icon={<Users className="h-4 w-4 text-gray-600" />}
                health={
                  (email.unsubscribedCount || 0) === 0
                    ? "good"
                    : (email.unsubscribedCount || 0) < 5
                      ? "warn"
                      : "bad"
                }
              />

              <div className="pt-2">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">
                    List{" "}
                    <strong className="text-gray-700">
                      {email.contactList.name}
                    </strong>{" "}
                    has been used in{" "}
                    <strong className="text-gray-700">
                      {email.contactList._count.emailHistory}
                    </strong>{" "}
                    total campaign
                    {email.contactList._count.emailHistory !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Health legend */}
              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Good
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />{" "}
                  Review
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-red-500" /> Attention
                  needed
                </span>
                <span className="flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-gray-400" /> Informational
                </span>
              </div>
            </TabsContent>

            {/* ── Details tab ──────────────────────────────────────────── */}
            <TabsContent value="info" className="flex-1 overflow-auto p-6">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Subject", value: email.subject },
                    { label: "Status", value: email.status || "sent" },
                    { label: "Sender Name", value: email.senderName || "—" },
                    { label: "Sender Email", value: email.senderEmail || "—" },
                    { label: "Contact List", value: email.contactList.name },
                    { label: "Domain", value: email.contactList.domain.domain },
                    {
                      label: "Sent",
                      value: new Date(email.createdAt).toLocaleString(),
                    },
                    { label: "Preheader", value: email.preheader || "—" },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="bg-gray-50 border border-gray-100 rounded-xl p-3"
                    >
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-2 font-medium">
                    Email Statistics
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Total Sent", value: email.sentCount },
                      { label: "Delivered", value: email.deliveredCount },
                      { label: "Opened", value: email.openedCount },
                      { label: "Clicked", value: email.clickedCount },
                      { label: "Failed", value: email.failedCount },
                      { label: "Bounced", value: email.bouncedCount },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <p className="text-xl font-bold text-gray-900">
                          {value.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
