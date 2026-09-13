// app/_components/email-composer.tsx
// REWRITTEN:
//   - Multi contact-list selector (checkboxes, up to 10 lists)
//   - Global send interval display (read-only, links to settings)
//   - Send triggers Inngest background jobs — tab can be closed immediately
//   - Success state shows "queued" status with link to email history

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Label } from "@/app/_components/ui/label";
import { Input } from "@/app/_components/ui/input";
import { Badge } from "@/app/_components/ui/badge";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import RichTextEditor from "@/app/_components/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  AlertCircle,
  CheckCircle,
  Send,
  Eye,
  Globe,
  Users,
  Braces,
  LayoutTemplate,
  Wand2,
  Pencil,
  PenLine,
  RefreshCw,
  X,
  ChevronRight,
  Clock,
  Sparkles,
  Timer,
  CheckSquare,
  Square,
} from "lucide-react";
import { emailComposeSchema } from "@/app/_lib/validations/email";
import { MultiListSelector } from "@/app/_components/multi-list-selector";
// ── Types ─────────────────────────────────────────────────────────────────────

interface Domain {
  id: string;
  domain: string;
  status: string;
  marketingStatus: string;
  transactionalStatus: string;
  senders: Sender[];
}

interface Sender {
  id: string;
  name: string;
  email: string;
  domain: Domain;
}

interface ContactList {
  id: string;
  name: string;
  description?: string | null;
  emails: string[];
  domainId: string;
  domain: Domain;
  _count?: { contacts: number; emailHistory: number };
}

interface SelectedTemplate {
  id: string;
  name: string;
  isBuiltin: boolean;
  isVisual: boolean;
}

interface EmailComposerProps {
  contactLists: ContactList[];
  senders: Sender[];
  initialListId: string;
  initialListIds?: string[];
  initialDomainId: string;
  initialSenderId: string;
  lastSubject: string | null;
}

// ── Variables ─────────────────────────────────────────────────────────────────

const VARIABLES = [
  { token: "{first_name}", label: "First name" },
  { token: "{last_name}", label: "Last name" },
  { token: "{full_name}", label: "Full name" },
  { token: "{email}", label: "Email address" },
  { token: "{company}", label: "Company" },
];

const CATEGORY_COLORS: Record<string, string> = {
  welcome: "bg-emerald-50 text-emerald-700 border-emerald-200",
  newsletter: "bg-blue-50 text-blue-700 border-blue-200",
  promo: "bg-orange-50 text-orange-700 border-orange-200",
  transactional: "bg-purple-50 text-purple-700 border-purple-200",
  custom: "bg-gray-50 text-gray-700 border-gray-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRecipientCount(list: ContactList) {
  return list._count?.contacts ?? list.emails.length;
}

// ── Visual body preview ───────────────────────────────────────────────────────

function VisualBodyPreview({ html }: { html: string }) {
  return (
    <div
      className="relative overflow-hidden bg-gray-50 rounded-xl border border-blue-100"
      style={{ height: 280 }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: "scale(0.5) translateX(-50%) translateY(-50%)",
          transformOrigin: "top left",
          width: "200%",
          top: "50%",
          left: "50%",
        }}
      >
        <iframe
          srcDoc={html}
          title="Email body preview"
          className="w-full border-0 block"
          style={{ height: 560 }}
          sandbox="allow-same-origin"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-50/90 to-transparent pointer-events-none" />
    </div>
  );
}

// ── Template Picker ────────────────────────────────────────────────────────────

function TemplatePicker({
  onSelect,
  trigger,
}: {
  onSelect: (t: any) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [builtinTemplates, setBuiltinTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "builtin">("builtin");
  const [searchQuery, setSearchQuery] = useState("");
  const hasOpened = useRef(false);

  const fetchTemplates = async () => {
    if (hasOpened.current) return;
    hasOpened.current = true;
    setIsLoading(true);
    try {
      const [myRes, builtinRes] = await Promise.all([
        fetch("/api/templates"),
        fetch("/api/templates?builtin=true"),
      ]);
      if (myRes.ok) setTemplates(await myRes.json());
      if (builtinRes.ok) setBuiltinTemplates(await builtinRes.json());
    } catch {}
    setIsLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    fetchTemplates();
  };

  const handleSelect = (template: any) => {
    onSelect(template);
    setOpen(false);
  };

  const allTemplates = activeTab === "builtin" ? builtinTemplates : templates;
  const filtered = allTemplates.filter(
    (t) =>
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <div onClick={handleOpen}>{trigger}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-3">
            {(["builtin", "my"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab === "builtin" ? (
                  <>
                    <Sparkles className="inline h-3 w-3 mr-1" />
                    Built-in
                  </>
                ) : (
                  "My Templates"
                )}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search templates…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl text-sm mb-3"
          />
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                Loading templates…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">
                No templates found.
                {activeTab === "my" && (
                  <button
                    className="block mx-auto mt-2 text-blue-500 hover:underline text-xs"
                    onClick={() => setActiveTab("builtin")}
                  >
                    Browse built-in templates
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() =>
                      handleSelect({
                        ...template,
                        isBuiltin:
                          !!(template as any).isBuiltIn ||
                          activeTab === "builtin",
                      })
                    }
                    className="text-left p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 truncate pr-2">
                        {template.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {template.designJson && (
                          <span className="inline-flex items-center gap-0.5 bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                            <Wand2 className="h-2 w-2" /> Visual
                          </span>
                        )}
                        <Badge
                          className={`text-[10px] shrink-0 ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom}`}
                        >
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    {template.subject && (
                      <p className="text-xs text-gray-400 mt-1.5 truncate">
                        Subject: {template.subject}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1 text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Use this template <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Template Selected Banner ───────────────────────────────────────────────────

function TemplateSelectedBanner({
  template,
  body,
  onChangeTemplate,
  onWriteManually,
  onEditTemplate,
}: {
  template: SelectedTemplate;
  body: string;
  onChangeTemplate: () => void;
  onWriteManually: () => void;
  onEditTemplate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Wand2 className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-900 truncate">
              {template.name}
            </p>
            <p className="text-[11px] text-blue-600">
              {template.isVisual ? "Visual template" : "Text template"} ·{" "}
              {template.isBuiltin ? "Built-in" : "My template"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onEditTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            {template.isBuiltin ? "Duplicate & Edit" : `Edit`}
          </button>
          <button
            type="button"
            onClick={onWriteManually}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <PenLine className="h-3 w-3" /> Write manually
          </button>
          <button
            type="button"
            onClick={onChangeTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Change
          </button>
        </div>
      </div>
      <VisualBodyPreview html={body} />
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  open,
  onClose,
  subject,
  body,
  senderName,
  senderEmail,
  preheader,
}: {
  open: boolean;
  onClose: () => void;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  preheader: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex gap-2">
              <span className="text-gray-400 w-14 shrink-0">From:</span>
              <span className="font-medium">
                {senderName} &lt;{senderEmail}&gt;
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-14 shrink-0">Subject:</span>
              <span className="font-medium">{subject || "—"}</span>
            </div>
            {preheader && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-14 shrink-0">Preview:</span>
                <span className="text-gray-600">{preheader}</span>
              </div>
            )}
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <iframe
              srcDoc={body}
              title="Email preview"
              className="w-full"
              style={{ height: 480 }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Composer ─────────────────────────────────────────────────────────────

export function EmailComposer({
  contactLists,
  senders,
  initialListId,
  initialListIds,
  initialDomainId,
  initialSenderId,
  lastSubject,
}: EmailComposerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [subject, setSubject] = useState(lastSubject || "");
  const [body, setBody] = useState("");
  const [preheader, setPreheader] = useState("");

  // Multi-list selection
  const [selectedListIds, setSelectedListIds] = useState<string[]>(() => {
    const fromUrl = searchParams.get("listIds");
    if (fromUrl) {
      const ids = fromUrl
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .filter((id) => contactLists.some((l) => l.id === id));
      if (ids.length > 0) return ids;
    }
    if (initialListIds && initialListIds.length > 0) return initialListIds;
    const fromSingle = searchParams.get("listId");
    if (fromSingle) return [fromSingle];
    if (initialListId) return [initialListId];
    return [];
  });

  const [selectedSenderId, setSelectedSenderId] = useState(
    () => initialSenderId || searchParams.get("senderId") || "",
  );
  const [filteredSenders, setFilteredSenders] = useState<Sender[]>([]);
  const [sendMethod, setSendMethod] = useState<"transactional" | "marketing">(
    "transactional",
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bodyIsVisual, setBodyIsVisual] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<SelectedTemplate | null>(null);
  const [templatePickerKey, setTemplatePickerKey] = useState(0);

  // Derive senders from first selected list's domain
  useEffect(() => {
    const firstList = contactLists.find((l) => l.id === selectedListIds[0]);
    const domainId =
      initialDomainId || (firstList ? firstList.domain.id : null);
    if (domainId) {
      const sendersForDomain = senders.filter((s) => s.domain.id === domainId);
      setFilteredSenders(sendersForDomain);
      if (sendersForDomain.length > 0) {
        setSelectedSenderId((prev) =>
          sendersForDomain.find((s) => s.id === prev)
            ? prev
            : sendersForDomain[0].id,
        );
      }
    } else {
      setFilteredSenders([]);
      setSelectedSenderId("");
    }
  }, [selectedListIds, contactLists, senders, initialDomainId]);

  const selectedSender = filteredSenders.find((s) => s.id === selectedSenderId);
  const selectedLists = contactLists.filter((l) =>
    selectedListIds.includes(l.id),
  );
  const totalRecipients = selectedLists.reduce(
    (sum, l) => sum + getRecipientCount(l),
    0,
  );

  // Marketing and Transactional verify independently per domain (a domain
  // can be verified for one and not the other) — gate the send-method
  // choice on whichever domain the selected lists/sender belong to.
  const activeDomain = selectedLists[0]?.domain;
  const marketingAvailable = activeDomain?.marketingStatus === "verified";
  const transactionalAvailable =
    activeDomain?.transactionalStatus === "verified";

  useEffect(() => {
    if (!activeDomain) return;
    if (sendMethod === "marketing" && !marketingAvailable && transactionalAvailable) {
      setSendMethod("transactional");
    } else if (
      sendMethod === "transactional" &&
      !transactionalAvailable &&
      marketingAvailable
    ) {
      setSendMethod("marketing");
    }
  }, [activeDomain, marketingAvailable, transactionalAvailable, sendMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationResult = emailComposeSchema.safeParse({
      subject: subject.trim(),
      body: body.trim(),
      contactListIds: selectedListIds,
      senderId: selectedSenderId,
      preheader: preheader.trim() || undefined,
      sendMethod,
    });

    if (!validationResult.success) {
      setError(validationResult.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationResult.data),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to send campaign");

      setSuccess(
        result.message ||
          `Sent to ${result.sent ?? totalRecipients} recipient${(result.sent ?? totalRecipients) !== 1 ? "s" : ""} across ${result.queued} list${result.queued !== 1 ? "s" : ""}.`,
      );
      setSubject("");
      setBody("");
      setPreheader("");
      setSelectedListIds([]);
      setSelectedSenderId("");
      setBodyIsVisual(false);
      setSelectedTemplate(null);
      setTimeout(() => router.push("/email-history"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (t: {
    id: string;
    name: string;
    subject?: string;
    body: string;
    designJson?: string | null;
    isVisual: boolean;
    isBuiltin: boolean;
  }) => {
    if (t.subject) setSubject(t.subject);
    setBody(t.body);
    setBodyIsVisual(t.isVisual);
    setSelectedTemplate({
      id: t.id,
      name: t.name,
      isBuiltin: t.isBuiltin,
      isVisual: t.isVisual,
    });
  };

  const handleWriteManually = () => {
    setBody("");
    setBodyIsVisual(false);
    setSelectedTemplate(null);
  };

  const handleChangeTemplate = () => {
    setSelectedTemplate(null);
    setBody("");
    setBodyIsVisual(false);
    setTemplatePickerKey((k) => k + 1);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;
    if (selectedTemplate.isBuiltin) {
      router.push(`/templates?duplicateBuiltin=${selectedTemplate.id}`);
    } else {
      router.push(`/templates?editId=${selectedTemplate.id}`);
    }
  };

  const sendMethodAvailable =
    sendMethod === "marketing" ? marketingAvailable : transactionalAvailable;

  const canSend =
    subject &&
    body &&
    selectedListIds.length > 0 &&
    selectedSenderId &&
    sendMethodAvailable;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Composer ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Compose Campaign
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fill in the details and hit Send
                </p>
              </div>
              {!selectedTemplate && (
                <TemplatePicker
                  key={templatePickerKey}
                  onSelect={handleTemplateSelect}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                    >
                      <LayoutTemplate className="h-3.5 w-3.5" /> Use Template
                    </Button>
                  }
                />
              )}
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                {/* ── Multi Contact List Selector ───────────────── */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact Lists *{" "}
                    {selectedListIds.length > 0 && (
                      <span className="normal-case font-normal text-gray-400 ml-1">
                        ({selectedListIds.length} selected)
                      </span>
                    )}
                  </Label>
                  <MultiListSelector
                    contactLists={contactLists}
                    selectedListIds={selectedListIds}
                    onChange={setSelectedListIds}
                    disabled={isLoading}
                  />
                </div>

                {/* ── Send Method ───────────────────────────────── */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Send Via *
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        {
                          value: "transactional" as const,
                          title: "Transactional",
                          desc: "Mailchimp Transactional (Mandrill) — one send per contact",
                          available: !activeDomain || transactionalAvailable,
                        },
                        {
                          value: "marketing" as const,
                          title: "Marketing",
                          desc: "Mailchimp Marketing campaign — synced audience per list",
                          available: !activeDomain || marketingAvailable,
                        },
                      ]
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isLoading || !opt.available}
                        onClick={() => setSendMethod(opt.value)}
                        className={`text-left p-3 rounded-xl border transition-colors ${
                          !opt.available
                            ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                            : sendMethod === opt.value
                              ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-200"
                              : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {opt.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {opt.available
                            ? opt.desc
                            : `${activeDomain?.domain ?? "This domain"} isn't verified for ${opt.title.toLowerCase()} sends yet.`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Sender ────────────────────────────────────── */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    From *
                  </Label>
                  <Select
                    value={selectedSenderId}
                    onValueChange={setSelectedSenderId}
                    disabled={isLoading || filteredSenders.length === 0}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue
                        placeholder={
                          filteredSenders.length === 0
                            ? "Select a contact list first"
                            : "Select a sender"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSenders.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <span>{s.name}</span>
                            <span className="text-gray-400 text-xs">
                              ({s.email})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Subject ───────────────────────────────────── */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Subject *
                  </Label>
                  <div className="space-y-2">
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter email subject…"
                      disabled={isLoading}
                      className="rounded-xl"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                        <Braces className="h-3 w-3" /> Variables:
                      </span>
                      {VARIABLES.map((v) => (
                        <button
                          key={v.token}
                          type="button"
                          onClick={() => setSubject((p) => p + v.token)}
                          className="text-xs px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md font-mono transition-colors"
                          title={`Insert ${v.label}`}
                        >
                          {v.token}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Preheader ─────────────────────────────────── */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Preheader{" "}
                    <span className="normal-case text-gray-400 font-normal">
                      (optional inbox preview text)
                    </span>
                  </Label>
                  <Input
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="Short preview text shown in inbox…"
                    disabled={isLoading}
                    className="rounded-xl"
                    maxLength={200}
                  />
                </div>

                {/* ── Body ──────────────────────────────────────── */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email Body *
                  </Label>
                  {selectedTemplate ? (
                    <TemplateSelectedBanner
                      template={selectedTemplate}
                      body={body}
                      onChangeTemplate={handleChangeTemplate}
                      onWriteManually={handleWriteManually}
                      onEditTemplate={handleEditTemplate}
                    />
                  ) : bodyIsVisual ? (
                    <div className="border border-blue-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200">
                        <div className="flex items-center gap-2">
                          <Wand2 className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">
                            Visual template loaded
                          </span>
                        </div>
                        <button
                          onClick={handleWriteManually}
                          className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Clear
                        </button>
                      </div>
                      <VisualBodyPreview html={body} />
                    </div>
                  ) : (
                    <RichTextEditor
                      content={body}
                      onChange={setBody}
                      placeholder="Write your email content here…"
                    />
                  )}
                </div>

                {/* ── Actions ───────────────────────────────────── */}
                <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    disabled={!body}
                    className="rounded-xl"
                  >
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !canSend}
                    className="min-w-[160px] rounded-xl bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Campaign
                        {selectedListIds.length > 1 && (
                          <Badge className="ml-2 bg-blue-500 text-white border-blue-400 text-[10px]">
                            {selectedListIds.length} lists
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Dynamic Variables */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Braces className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">
                Dynamic Variables
              </h3>
            </div>
            <div className="space-y-2">
              {VARIABLES.map((v) => (
                <div
                  key={v.token}
                  className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs text-gray-600">{v.label}</span>
                  <code className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {v.token}
                  </code>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1">
                Replaced per contact at send time.
              </p>
            </div>
          </div>

          {/* Campaign details (shows for single selected list) */}
          {selectedLists.length === 1 && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Campaign Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Domain</p>
                    <p className="font-medium text-gray-900">
                      {selectedLists[0].domain.domain}
                    </p>
                  </div>
                </div>
                {selectedSender && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {selectedSender.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {selectedSender.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {selectedSender.email}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recipients summary */}
          {selectedLists.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Recipients
              </h3>
              {selectedLists.length === 1 ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedLists[0].name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRecipientCount(selectedLists[0]).toLocaleString()}{" "}
                      recipients
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedLists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-700 truncate">
                        {list.name}
                      </span>
                      <span className="text-gray-400 shrink-0 ml-2">
                        {getRecipientCount(list).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-blue-700">
                      {totalRecipients.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedSender && (
        <PreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          subject={subject}
          body={body}
          senderName={selectedSender.name}
          senderEmail={selectedSender.email}
          preheader={preheader}
        />
      )}
    </>
  );
}
