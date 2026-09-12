"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import {
  AlertCircle,
  X,
  Plus,
  Globe,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Trash2,
  Loader2,
} from "lucide-react";
import type { Domain, Sender } from "@prisma/client";
import {
  // Types
  type ParsedContact,
  type InvalidRow,
  type ColumnMapping,
  type FieldKey,
  type ValidationResult,
  // Helpers
  MAX_CONTACTS,
  generateBaseName,
  parseRawCSV,
  detectColumnMapping,
  applyMapping,
  chunkArray,
  isValidEmail,
  isBadValidationResult,
  // UI
  ColumnMappingEditor,
  ContactsPreviewTable,
  InvalidRowsPanel,
  SplitBadge,
  ValidationBadge,
} from "./csv-import";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreatedList {
  id: string;
  name: string;
  count: number;
}

interface BatchProgress {
  total: number;
  completed: number;
  current: number;
  totalBatches: number;
  lists: CreatedList[];
  status: "idle" | "running" | "done" | "error";
  error?: string;
}

interface CreateContactListDialogProps {
  children: React.ReactNode;
  verifiedDomains: Array<Domain & { senders: Sender[] }>;
  defaultDomainId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseEmailsFromText(input: string): {
  valid: string[];
  invalid: string[];
} {
  const raw = input
    .split(/[,;\s\n\t]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .filter((e, i, arr) => arr.indexOf(e) === i);
  const valid: string[] = [],
    invalid: string[] = [];
  raw.forEach((e) => (isValidEmail(e) ? valid.push(e) : invalid.push(e)));
  return { valid, invalid };
}

// ── Batch progress view ───────────────────────────────────────────────────────

function BatchProgressView({ progress }: { progress: BatchProgress }) {
  const pct = Math.round((progress.completed / progress.total) * 100);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
          <Layers className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">
            {progress.status === "done"
              ? "Import Complete!"
              : `Creating list ${progress.current} of ${progress.totalBatches}…`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {progress.completed} of {progress.total} contacts saved
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{pct}% complete</span>
          <span>
            {progress.totalBatches} list{progress.totalBatches !== 1 ? "s" : ""}{" "}
            total
          </span>
        </div>
        <Progress
          value={pct}
          className={`h-2 ${progress.status === "done" ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500 [&>div]:transition-all [&>div]:duration-300"}`}
        />
      </div>
      {progress.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{progress.error}</AlertDescription>
        </Alert>
      )}
      {progress.lists.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Lists Created
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {progress.lists.map((list, i) => (
              <div
                key={list.id}
                className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-100 rounded-xl"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {list.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {list.count} contact{list.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                  List {i + 1}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {progress.status === "running" && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          Please keep this window open while contacts are being saved…
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

export function CreateContactListDialog({
  children,
  verifiedDomains,
  defaultDomainId,
}: CreateContactListDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(generateBaseName());
  const [domainId, setDomainId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"paste" | "csv">("paste");
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null,
  );
  const router = useRouter();

  // ── Paste tab ──────────────────────────────────────────────────────────────
  const [emailsInput, setEmailsInput] = useState("");
  const [validEmails, setValidEmails] = useState<string[]>([]);
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [pasteValidateTotal, setPasteValidateTotal] = useState(0);

  // ── CSV tab ────────────────────────────────────────────────────────────────
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [csvContacts, setCsvContacts] = useState<ParsedContact[]>([]);
  const [csvInvalidRows, setCsvInvalidRows] = useState<InvalidRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidatingCsv, setIsValidatingCsv] = useState(false);
  const [csvValidationResults, setCsvValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [csvValidateTotal, setCsvValidateTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeContacts: ParsedContact[] =
    activeTab === "paste"
      ? validEmails.map((email) => ({ email }))
      : csvContacts;
  const contactCount = activeContacts.length;
  const needsSplitting = contactCount > MAX_CONTACTS;
  const batchCount = needsSplitting
    ? Math.ceil(contactCount / MAX_CONTACTS)
    : 1;
  const hasInvalidContacts =
    activeTab === "paste"
      ? invalidEmails.length > 0
      : csvInvalidRows.length > 0;

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("domain");
      setDomainId(verifiedDomains.find((d) => d.domain === saved)?.id || "");
      setName(generateBaseName());
      setBatchProgress(null);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (
        defaultDomainId &&
        verifiedDomains.find((d) => d.id === defaultDomainId)
      ) {
        setDomainId(defaultDomainId);
      } else {
        const saved = localStorage.getItem("domain");
        setDomainId(verifiedDomains.find((d) => d.domain === saved)?.id || "");
      }
      setName(generateBaseName());
      setBatchProgress(null);
    }
  }, [open, defaultDomainId, verifiedDomains]);

  useEffect(() => {
    if (csvHeaders.length > 0 && csvRawRows.length > 0) {
      const { contacts, invalidRows } = applyMapping(
        csvHeaders,
        csvRawRows,
        columnMapping,
      );
      setCsvContacts(contacts);
      setCsvInvalidRows(invalidRows);
      setCsvValidationResults([]);
    }
  }, [columnMapping]);

  // ── Paste handlers ─────────────────────────────────────────────────────────
  const handleEmailsInputChange = (value: string) => {
    setEmailsInput(value);
    setValidationResults([]);
    if (!value.trim()) {
      setValidEmails([]);
      setInvalidEmails([]);
      return;
    }
    const { valid, invalid } = parseEmailsFromText(value);
    setValidEmails(valid);
    setInvalidEmails(invalid);
  };

  const isBadResult = (r: ValidationResult) => {
    if (r.error === "Validation timeout") return false;
    return r.isValid && (!r.hasMxRecord || !r.isReachable);
  };

  const handleValidatePaste = async () => {
    if (validEmails.length === 0) return;
    setIsValidating(true);
    setError("");
    setPasteValidateTotal(validEmails.length);
    setValidationResults([]);
    for (const batch of chunkArray(validEmails, 100)) {
      try {
        const res = await fetch("/api/validate-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: batch }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as any).error || "Validation failed");
        }
        const results: ValidationResult[] = await res.json();
        setValidationResults((prev) => {
          const map = new Map(prev.map((r) => [r.email, r]));
          results.forEach((r) => map.set(r.email, r));
          return Array.from(map.values());
        });
        const bad = results.filter(isBadResult).map((r) => r.email);
        if (bad.length > 0) {
          setValidEmails((prev) => prev.filter((e) => !bad.includes(e)));
          setInvalidEmails((prev) => [
            ...prev,
            ...bad.filter((e) => !prev.includes(e)),
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Validation failed");
        break;
      }
    }
    setIsValidating(false);
  };

  // ── CSV handlers ───────────────────────────────────────────────────────────
  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .csv file.");
      return;
    }
    setCsvFile(file);
    setCsvValidationResults([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseRawCSV(text);
      if (headers.length === 0) {
        setError("Could not parse CSV — empty file?");
        return;
      }
      setCsvHeaders(headers);
      setCsvRawRows(rows);
      const mapping = detectColumnMapping(headers, rows);
      setColumnMapping(mapping);
      const { contacts, invalidRows } = applyMapping(headers, rows, mapping);
      setCsvContacts(contacts);
      setCsvInvalidRows(invalidRows);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const updateMapping = (colIdx: number, newField: FieldKey) => {
    setColumnMapping((prev) => {
      const next = [...prev];
      if (newField !== "ignore") {
        const existingIdx = next.findIndex(
          (m, i) => i !== colIdx && m.mappedTo === newField,
        );
        if (existingIdx >= 0)
          next[existingIdx] = { ...next[existingIdx], mappedTo: "ignore" };
      }
      next[colIdx] = { ...next[colIdx], mappedTo: newField };
      return next;
    });
  };

  const handleValidateCsv = async () => {
    if (csvContacts.length === 0) return;
    setIsValidatingCsv(true);
    setError("");
    setCsvValidateTotal(csvContacts.length);
    setCsvValidationResults([]);
    for (const batch of chunkArray(
      csvContacts.map((c) => c.email),
      100,
    )) {
      try {
        const res = await fetch("/api/validate-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: batch }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as any).error || "Validation failed");
        }
        const results: ValidationResult[] = await res.json();
        setCsvValidationResults((prev) => {
          const map = new Map(prev.map((r) => [r.email, r]));
          results.forEach((r) => map.set(r.email, r));
          return Array.from(map.values());
        });
        const bad = results.filter(isBadValidationResult);
        if (bad.length > 0) {
          const badSet = new Set(bad.map((r) => r.email));
          setCsvContacts((prev) => prev.filter((c) => !badSet.has(c.email)));
          setCsvInvalidRows((prev) => {
            const existing = new Set(prev.map((r) => r.email));
            return [
              ...prev,
              ...bad
                .filter((r) => !existing.has(r.email))
                .map((r) => ({
                  row: 0,
                  email: r.email,
                  reason: r.error || "Failed MX validation",
                })),
            ];
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Validation failed");
        break;
      }
    }
    setIsValidatingCsv(false);
  };

  // Handle inline edit + re-validation result from InvalidRowsPanel
  const handleInvalidRowSave = (originalEmail: string, updated: InvalidRow) => {
    if (updated.reason === "__VALID__") {
      setCsvInvalidRows((prev) =>
        prev.filter((r) => r.email !== originalEmail),
      );
      setCsvContacts((prev) => {
        if (prev.find((c) => c.email === updated.email)) return prev;
        return [
          ...prev,
          {
            email: updated.email,
            firstName: updated.firstName,
            lastName: updated.lastName,
            company: updated.company,
            phone: updated.phone,
          },
        ];
      });
    } else {
      setCsvInvalidRows((prev) =>
        prev.map((r) => (r.email === originalEmail ? updated : r)),
      );
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!domainId) {
      setError("Please select a domain.");
      return;
    }
    if (hasInvalidContacts) {
      setError("Please remove all invalid contacts before saving.");
      return;
    }
    if (activeContacts.length === 0) {
      setError("Please add at least one valid contact.");
      return;
    }

    setIsLoading(true);
    const batches = chunkArray(activeContacts, MAX_CONTACTS);
    const baseName = name.trim();

    if (batches.length === 1) {
      try {
        const listRes = await fetch("/api/contact-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: baseName,
            domainId,
            emails: batches[0].map((c) => c.email),
            contacts: batches[0],
          }),
        });
        const listData = await listRes.json();
        if (!listRes.ok)
          throw new Error(listData.error || "Failed to create contact list");
        resetAndClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const progress: BatchProgress = {
      total: activeContacts.length,
      completed: 0,
      current: 0,
      totalBatches: batches.length,
      lists: [],
      status: "running",
    };
    setBatchProgress({ ...progress });
    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchName = i === 0 ? baseName : `${baseName} - ${i + 1}`;
        progress.current = i + 1;
        setBatchProgress({ ...progress });
        const listRes = await fetch("/api/contact-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: batchName,
            domainId,
            emails: batch.map((c) => c.email),
            contacts: batch,
          }),
        });
        const listData = await listRes.json();
        if (!listRes.ok)
          throw new Error(listData.error || `Failed to create list ${i + 1}`);
        progress.completed += batch.length;
        progress.lists.push({
          id: listData.id,
          name: batchName,
          count: batch.length,
        });
        setBatchProgress({ ...progress });
      }
      progress.status = "done";
      setBatchProgress({ ...progress });
      router.refresh();
    } catch (err) {
      progress.status = "error";
      progress.error = err instanceof Error ? err.message : "An error occurred";
      setBatchProgress({ ...progress });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setName("");
    setDomainId("");
    setEmailsInput("");
    setValidEmails([]);
    setInvalidEmails([]);
    setValidationResults([]);
    setPasteValidateTotal(0);
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRawRows([]);
    setColumnMapping([]);
    setCsvContacts([]);
    setCsvInvalidRows([]);
    setCsvValidationResults([]);
    setCsvValidateTotal(0);
    setActiveTab("paste");
    setBatchProgress(null);
  };

  const canSubmit =
    !isLoading &&
    domainId &&
    verifiedDomains.length > 0 &&
    activeContacts.length > 0 &&
    !hasInvalidContacts;
  const isDone = batchProgress?.status === "done";
  const isRunning = batchProgress?.status === "running";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isRunning) return;
        if (!v) resetAndClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {batchProgress ? "Importing Contacts" : "Create Contact List"}
          </DialogTitle>
          <DialogDescription>
            {batchProgress
              ? isDone
                ? `All ${batchProgress.totalBatches} lists created successfully.`
                : `Splitting ${contactCount} contacts across ${batchProgress.totalBatches} lists…`
              : `Create a new contact list. Maximum ${MAX_CONTACTS} contacts per list — larger imports are auto-split.`}
          </DialogDescription>
        </DialogHeader>

        {batchProgress ? (
          <div className="py-2">
            <BatchProgressView progress={batchProgress} />
            {isDone && (
              <div className="mt-5 flex justify-end">
                <Button onClick={resetAndClose}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                </Button>
              </div>
            )}
            {batchProgress.status === "error" && (
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBatchProgress(null);
                    setIsLoading(false);
                  }}
                >
                  Back
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {verifiedDomains.length === 0 && (
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  <strong>No verified domains.</strong> Add and verify a domain
                  before creating contact lists.
                </AlertDescription>
              </Alert>
            )}

            {/* Domain */}
            <div className="space-y-2">
              <Label>Select Domain *</Label>
              <Select
                value={domainId}
                onValueChange={setDomainId}
                disabled={isLoading || verifiedDomains.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a verified domain" />
                </SelectTrigger>
                <SelectContent>
                  {verifiedDomains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>{domain.domain}</span>
                        <Badge variant="outline" className="text-xs">
                          {domain.senders.length} sender
                          {domain.senders.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>Base List Name *</Label>
              <Input
                placeholder="e.g., Newsletter Subscribers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
              {needsSplitting && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Lists will be named: <strong>{name}</strong>,{" "}
                  <strong>{name} - 2</strong>…
                </p>
              )}
            </div>

            {/* Split notice */}
            {/* {needsSplitting ? (
              <Alert className="border-blue-200 bg-blue-50">
                <Layers className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Auto-split enabled.</strong> Your {contactCount}{" "}
                  contacts will be split into{" "}
                  <strong>{batchCount} lists</strong> of up to {MAX_CONTACTS}{" "}
                  each.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>{MAX_CONTACTS} contact maximum per list.</strong>{" "}
                  Larger imports are split automatically.
                </AlertDescription>
              </Alert>
            )} */}

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "paste" | "csv")}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="paste">Paste Emails</TabsTrigger>
                <TabsTrigger value="csv">Import CSV</TabsTrigger>
              </TabsList>

              {/* ── PASTE TAB ──────────────────────────────────── */}
              <TabsContent value="paste" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label>Email Addresses *</Label>
                  <Textarea
                    placeholder={
                      "Paste emails separated by commas, spaces, or new lines:\nexample@domain.com, user@company.com\nanother@email.com"
                    }
                    value={emailsInput}
                    onChange={(e) => handleEmailsInputChange(e.target.value)}
                    rows={10}
                    disabled={isLoading} 
                  className="min-h-[400px]"
                  />
                  <p className="text-xs text-gray-400">
                    Separate with commas, spaces, or new lines.
                  </p>
                </div>

                {validEmails.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-green-700 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Valid (
                        {validEmails.length})
                        {needsSplitting && (
                          <SplitBadge listCount={batchCount} />
                        )}
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-blue-600 text-white hover:bg-blue-500 border-blue-600 hover:text-white"
                        onClick={handleValidatePaste}
                        disabled={isValidating}
                      >
                        {isValidating ? (
                          <>
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            {validationResults.length}/{pasteValidateTotal}
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-1.5 h-3 w-3" />
                            Validate Emails
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="max-h-36 overflow-y-auto p-2.5 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex flex-wrap gap-1.5">
                        {validEmails.slice(0, 30).map((email, i) => {
                          const vr = validationResults.find(
                            (r) => r.email === email,
                          );
                          return (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs flex items-center gap-1 pr-0.5"
                            >
                              {email}
                              {vr && <ValidationBadge result={vr} />}
                              <button
                                type="button"
                                onClick={() => {
                                  setValidEmails((p) =>
                                    p.filter((e) => e !== email),
                                  );
                                  setValidationResults((p) =>
                                    p.filter((r) => r.email !== email),
                                  );
                                }}
                                className="ml-0.5 hover:bg-gray-300 rounded-full p-0.5"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          );
                        })}
                        {validEmails.length > 30 && (
                          <Badge variant="secondary" className="text-xs">
                            +{validEmails.length - 30} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {invalidEmails.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-red-600">
                        Invalid ({invalidEmails.length})
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setInvalidEmails([])}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Clear all invalid
                      </Button>
                    </div>
                    <div className="max-h-28 overflow-y-auto p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex flex-wrap gap-1">
                        {invalidEmails.map((email, i) => (
                          <Badge
                            key={i}
                            variant="destructive"
                            className="text-xs flex items-center gap-1"
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() =>
                                setInvalidEmails((p) =>
                                  p.filter((e) => e !== email),
                                )
                              }
                              className="ml-0.5 hover:bg-red-700 rounded-full p-0.5"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Remove all invalid emails before saving.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* ── CSV TAB ────────────────────────────────────── */}
              <TabsContent value="csv" className="space-y-3 mt-4">
                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {csvFile ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <FileText className="h-7 w-7 text-blue-600" />
                      <p className="text-sm font-medium text-gray-900">
                        {csvFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {csvContacts.length} contacts detected
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCsvFile(null);
                          setCsvHeaders([]);
                          setCsvRawRows([]);
                          setColumnMapping([]);
                          setCsvContacts([]);
                          setCsvInvalidRows([]);
                          setCsvValidationResults([]);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 mt-0.5"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload className="h-7 w-7 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">
                        Drop your CSV here or click to browse
                      </p>
                      <p className="text-xs text-gray-400">
                        Columns are auto-detected from your headers
                      </p>
                      <p className="text-xs text-blue-500 font-medium mt-0.5 flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Large CSVs are
                        automatically split
                      </p>
                    </div>
                  )}
                </div>

                {/* Column mapping */}
                {columnMapping.length > 0 && (
                  <ColumnMappingEditor
                    columnMapping={columnMapping}
                    onUpdate={updateMapping}
                  />
                )}

                {/* Valid contacts preview */}
                {csvContacts.length > 0 && (
                  <ContactsPreviewTable
                    contacts={csvContacts}
                    validationResults={csvValidationResults}
                    isValidating={isValidatingCsv}
                    validateTotal={csvValidateTotal}
                    onValidate={handleValidateCsv}
                    extraBadge={
                      needsSplitting ? (
                        <SplitBadge listCount={batchCount} />
                      ) : undefined
                    }
                  />
                )}

                {/* Invalid rows */}
                {csvInvalidRows.length > 0 && (
                  <InvalidRowsPanel
                    invalidRows={csvInvalidRows}
                    onRemove={(email) =>
                      setCsvInvalidRows((prev) =>
                        prev.filter((r) => r.email !== email),
                      )
                    }
                    onClearAll={() => setCsvInvalidRows([])}
                    onSave={handleInvalidRowSave}
                  />
                )}
              </TabsContent>
            </Tabs>

            {/* Contact count progress */}
            {contactCount > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  {needsSplitting ? (
                    <>
                      <span className="text-blue-700 font-medium flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {contactCount} contacts →{" "}
                        <strong>{batchCount} lists</strong>
                      </span>
                      <span className="text-gray-400">
                        All contacts will be saved
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500">
                      {contactCount} of {MAX_CONTACTS} max contacts
                    </span>
                  )}
                </div>
                <Progress
                  value={Math.min((contactCount / MAX_CONTACTS) * 100, 100)}
                  className="h-1.5 [&>div]:bg-blue-500"
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating…
                  </>
                ) : hasInvalidContacts ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Fix invalid contacts first
                  </>
                ) : needsSplitting ? (
                  <>
                    <Layers className="mr-2 h-4 w-4" />
                    Import {contactCount} contacts ({batchCount} lists)
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create List ({contactCount} contacts)
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
