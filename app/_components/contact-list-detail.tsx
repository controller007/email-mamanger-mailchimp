"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Badge } from "@/app/_components/ui/badge";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import { Progress } from "@/app/_components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserMinus,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  Edit,
  Upload,
  Download,
  Send,
  ChevronLeft,
  ChevronRight,
  Mail,
  Building2,
  Phone,
  Globe,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";

import {
  type ParsedContact,
  type InvalidRow,
  type ColumnMapping,
  type FieldKey,
  MAX_CONTACTS,
  generateBaseName,
  parseRawCSV,
  detectColumnMapping,
  applyMapping,
  chunkArray,
  isBadValidationResult,
  ColumnMappingEditor,
  ContactsPreviewTable,
  InvalidRowsPanel,
  SplitBadge,
  type ValidationResult,
} from "./csv-import";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  isSubscribed: boolean;
  isComplained: boolean;
  isBounced: boolean;
  createdAt: Date;
}

interface ImportProgress {
  status: "idle" | "running" | "done" | "error";
  totalContacts: number;
  savedContacts: number;
  currentStep: string;
  overflowLists: Array<{ id: string; name: string; count: number }>;
  error?: string;
}

interface ContactList {
  id: string;
  name: string;
  description?: string | null;
  domainId: string;
  domain: { domain: string };
  _count: { contacts: number; emailHistory: number };
}

interface ContactListDetailProps {
  list: ContactList;
  initialContacts: Contact[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

const ITEMS_PER_PAGE = 50;

// ── Status Badge ──────────────────────────────────────────────────────────────

function getStatusBadge(contact: Contact) {
  if (contact.isComplained)
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-200 text-[10px]">
        Complained
      </Badge>
    );
  if (contact.isBounced)
    return (
      <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px]">
        Bounced
      </Badge>
    );
  if (!contact.isSubscribed)
    return (
      <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px]">
        Unsubscribed
      </Badge>
    );
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px]">
      Subscribed
    </Badge>
  );
}

// ── Add Contact Dialog ────────────────────────────────────────────────────────

function AddContactDialog({
  listId,
  onSuccess,
}: {
  listId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contact-lists/${listId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: [
            {
              email: email.trim().toLowerCase(),
              firstName: firstName.trim() || undefined,
              lastName: lastName.trim() || undefined,
              company: company.trim() || undefined,
              phone: phone.trim() || undefined,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contact");
      toast.success("Contact added successfully.");
      setOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setCompany("");
      setPhone("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Contact
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a single contact to this list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                placeholder="Acme Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="+1 555 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !email}>
                {isLoading ? "Adding..." : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit Contact Dialog ───────────────────────────────────────────────────────

function EditContactDialog({
  listId,
  contact,
  onSuccess,
}: {
  listId: string;
  contact: Contact;
  onSuccess: (updated: Contact) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(contact.email);
  const [firstName, setFirstName] = useState(contact.firstName || "");
  const [lastName, setLastName] = useState(contact.lastName || "");
  const [company, setCompany] = useState(contact.company || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [isSubscribed, setIsSubscribed] = useState(contact.isSubscribed);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const openDialog = () => {
    setEmail(contact.email);
    setFirstName(contact.firstName || "");
    setLastName(contact.lastName || "");
    setCompany(contact.company || "");
    setPhone(contact.phone || "");
    setIsSubscribed(contact.isSubscribed);
    setError("");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contact-lists/${listId}/contacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          email: trimmedEmail,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          company: company.trim() || null,
          phone: phone.trim() || null,
          isSubscribed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update contact");
      toast.success("Contact updated.");
      setOpen(false);
      onSuccess({
        ...contact,
        email: trimmedEmail,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        company: company.trim() || null,
        phone: phone.trim() || null,
        isSubscribed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        onClick={openDialog}
        title="Edit contact"
      >
        <Edit className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {contact.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl"
                placeholder="email@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={isSubscribed ? "subscribed" : "unsubscribed"}
                onValueChange={(v) => setIsSubscribed(v === "subscribed")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscribed">Subscribed</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !email.trim()}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── CSV Import Dialog ─────────────────────────────────────────────────────────

function CsvImportDialog({
  listId,
  listName,
  domainId,
  currentCount,
  onSuccess,
}: {
  listId: string;
  listName: string;
  domainId: string;
  currentCount: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [csvContacts, setCsvContacts] = useState<ParsedContact[]>([]);
  const [csvInvalidRows, setCsvInvalidRows] = useState<InvalidRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [validateTotal, setValidateTotal] = useState(0);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_CONTACTS - currentCount;
  const willOverflow = csvContacts.length > remaining;
  const overflowCount = Math.max(0, csvContacts.length - remaining);
  const newListsNeeded =
    overflowCount > 0 ? Math.ceil(overflowCount / MAX_CONTACTS) : 0;
  const totalLists = newListsNeeded + (remaining > 0 ? 1 : 0);
  const hasInvalid = csvInvalidRows.length > 0;

  useEffect(() => {
    if (csvHeaders.length > 0 && csvRawRows.length > 0) {
      const { contacts, invalidRows } = applyMapping(
        csvHeaders,
        csvRawRows,
        columnMapping,
      );
      setCsvContacts(contacts);
      setCsvInvalidRows(invalidRows);
      setValidationResults([]);
    }
  }, [columnMapping]);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .csv file.");
      return;
    }
    setCsvFile(file);
    setValidationResults([]);
    setError("");
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

  const handleValidate = async () => {
    if (csvContacts.length === 0) return;
    setIsValidating(true);
    setError("");
    setValidateTotal(csvContacts.length);
    setValidationResults([]);
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
        setValidationResults((prev) => {
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
    setIsValidating(false);
  };

  // Handle inline edit + re-validation from InvalidRowsPanel
  const handleInvalidRowSave = (originalEmail: string, updated: InvalidRow) => {
    if (updated.reason === "__VALID__") {
      // Promote to valid contacts
      setCsvInvalidRows((prev) =>
        prev.filter((r) => r.email !== originalEmail),
      );
      setCsvContacts((prev) => {
        const already = prev.find((c) => c.email === updated.email);
        if (already) return prev;
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

  const handleImport = async () => {
    if (csvContacts.length === 0) return;
    const baseName = generateBaseName();
    const prog: ImportProgress = {
      status: "running",
      totalContacts: csvContacts.length,
      savedContacts: 0,
      currentStep: "",
      overflowLists: [],
    };
    setProgress({ ...prog });
    try {
      const batch1 = csvContacts.slice(0, remaining);
      if (batch1.length > 0) {
        prog.currentStep = `Adding ${batch1.length} contacts to "${listName}"…`;
        setProgress({ ...prog });
        const r1 = await fetch(`/api/contact-lists/${listId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: batch1 }),
        });
        if (!r1.ok) {
          const e = await r1.json();
          throw new Error(e.error || "Failed to import contacts");
        }
        prog.savedContacts += batch1.length;
        setProgress({ ...prog });
      }
      const overflow = csvContacts.slice(remaining);
      for (let i = 0; i < chunkArray(overflow, MAX_CONTACTS).length; i++) {
        const batch = chunkArray(overflow, MAX_CONTACTS)[i];
        const newName = `${baseName}${i > 0 ? ` ${i + 1}` : ""}`;
        prog.currentStep = `Creating list "${newName}"…`;
        setProgress({ ...prog });
        const r2 = await fetch("/api/contact-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            domainId,
            emails: batch.map((c) => c.email),
            contacts: batch,
          }),
        });
        if (!r2.ok) {
          const e = await r2.json();
          throw new Error(e.error || `Failed to create list "${newName}"`);
        }
        const newList = await r2.json();
        prog.overflowLists.push({
          id: newList.id,
          name: newName,
          count: batch.length,
        });
        prog.savedContacts += batch.length;
        setProgress({ ...prog });
      }
      prog.status = "done";
      setProgress({ ...prog });
      onSuccess();
    } catch (err) {
      prog.status = "error";
      prog.error = err instanceof Error ? err.message : "An error occurred";
      setProgress({ ...prog });
    }
  };

  const reset = () => {
    setOpen(false);
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRawRows([]);
    setColumnMapping([]);
    setCsvContacts([]);
    setCsvInvalidRows([]);
    setValidationResults([]);
    setValidateTotal(0);
    setIsDragging(false);
    setIsValidating(false);
    setError("");
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-3.5 w-3.5 mr-1.5" /> Import CSV
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) reset();
          else setOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {progress ? "Importing Contacts" : "Import CSV into " + listName}
            </DialogTitle>
            <DialogDescription>
              {progress
                ? progress.status === "done"
                  ? "Import complete!"
                  : "Saving contacts…"
                : "Upload a CSV file. Columns are auto-detected from your headers."}
            </DialogDescription>
          </DialogHeader>

          {progress ? (
            <div className="py-2 space-y-4">
              {progress.status === "running" && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
                    <p className="text-sm text-gray-700">
                      {progress.currentStep}
                    </p>
                  </div>
                  <Progress
                    value={
                      (progress.savedContacts / progress.totalContacts) * 100
                    }
                    className="h-2"
                  />
                  <p className="text-xs text-gray-500">
                    {progress.savedContacts} / {progress.totalContacts} contacts
                    saved
                  </p>
                </>
              )}
              {progress.status === "done" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-semibold text-sm">
                      {progress.totalContacts} contacts imported!
                    </p>
                  </div>
                  {progress.overflowLists.length > 0 && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Additional lists created for overflow contacts:</p>
                      {progress.overflowLists.map((l) => (
                        <p key={l.id} className="pl-3">
                          • {l.name} ({l.count} contacts)
                        </p>
                      ))}
                    </div>
                  )}
                  <Button onClick={reset} className="w-full">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Done
                  </Button>
                </div>
              )}
              {progress.status === "error" && (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{progress.error}</AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={() => setProgress(null)}>
                    Back
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileRef}
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
                        setValidationResults([]);
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
                    {willOverflow && (
                      <p className="text-xs text-blue-500 font-medium mt-0.5 flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Large CSVs are
                        automatically split into new lists
                      </p>
                    )}
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
                <>
                  {willOverflow && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-900">
                        <strong>
                          This list can hold {remaining} more contacts.
                        </strong>{" "}
                        The first <strong>{remaining}</strong> go to "{listName}
                        ", the remaining <strong>
                          {overflowCount}
                        </strong> into{" "}
                        <strong>
                          {newListsNeeded} new list
                          {newListsNeeded !== 1 ? "s" : ""}
                        </strong>
                        .
                      </AlertDescription>
                    </Alert>
                  )}
                  <ContactsPreviewTable
                    contacts={csvContacts}
                    validationResults={validationResults}
                    isValidating={isValidating}
                    validateTotal={validateTotal}
                    onValidate={handleValidate}
                    extraBadge={
                      willOverflow ? (
                        <SplitBadge listCount={totalLists} />
                      ) : undefined
                    }
                  />
                </>
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

              <DialogFooter>
                <Button variant="outline" onClick={reset}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={csvContacts.length === 0 || hasInvalid}
                >
                  {hasInvalid ? (
                    <>
                      <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                      Fix invalid emails first
                    </>
                  ) : willOverflow ? (
                    <>
                      <Layers className="mr-1.5 h-3.5 w-3.5" />
                      Import {csvContacts.length} contacts ({totalLists} lists)
                    </>
                  ) : (
                    `Import ${csvContacts.length} Contacts`
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── ContactListDetail ─────────────────────────────────────────────────────────

export function ContactListDetail({
  list,
  initialContacts,
  initialTotal,
  initialPage,
  initialTotalPages,
}: ContactListDetailProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [subscribedCount, setSubscribedCount] = useState(
    () =>
      initialContacts.filter(
        (c) => c.isSubscribed && !c.isBounced && !c.isComplained,
      ).length,
  );
  const [unsubscribedCount, setUnsubscribedCount] = useState(
    () => initialContacts.filter((c) => !c.isSubscribed).length,
  );
  const [bouncedCount, setBouncedCount] = useState(
    () => initialContacts.filter((c) => c.isBounced).length,
  );

  const isAllSelected =
    contacts.length > 0 && selectedIds.size === contacts.length;

  const fetchContacts = useCallback(
    async (page: number, searchQuery: string) => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ITEMS_PER_PAGE),
          ...(searchQuery ? { search: searchQuery } : {}),
        });
        const res = await fetch(`/api/contact-lists/${list.id}?${params}`);
        const data = await res.json();
        const fetched: Contact[] = data.contacts || [];
        setContacts(fetched);
        setTotal(data.pagination?.total ?? 0);
        setCurrentPage(data.pagination?.page ?? 1);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setSelectedIds(new Set());
        setSubscribedCount(
          fetched.filter(
            (c) => c.isSubscribed && !c.isBounced && !c.isComplained,
          ).length,
        );
        setUnsubscribedCount(fetched.filter((c) => !c.isSubscribed).length);
        setBouncedCount(fetched.filter((c) => c.isBounced).length);
      } catch (err) {
        console.error("Failed to fetch contacts:", err);
      }
    },
    [list.id],
  );

  const handleSearch = () => {
    setSearch(searchInput);
    fetchContacts(1, searchInput);
  };
  const handlePageChange = (page: number) => fetchContacts(page, search);
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(contacts.map((c) => c.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    const removedIds = Array.from(selectedIds);
    setContacts((prev) => prev.filter((c) => !removedIds.includes(c.id)));
    setTotal((prev) => Math.max(0, prev - removedIds.length));
    setSelectedIds(new Set());
    try {
      const res = await fetch(`/api/contact-lists/${list.id}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: removedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success(
        `Removed ${removedIds.length} contact${removedIds.length !== 1 ? "s" : ""}.`,
      );
    } catch {
      toast.error("Failed to delete contacts.");
    } finally {
      setIsDeleting(false);
      const targetPage =
        contacts.length - removedIds.length <= 0 && currentPage > 1
          ? currentPage - 1
          : currentPage;
      fetchContacts(targetPage, search);
    }
  };

  const handleDeleteOne = async (contactId: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    setTotal((prev) => Math.max(0, prev - 1));
    const res = await fetch(`/api/contact-lists/${list.id}/contacts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds: [contactId] }),
    });
    if (res.ok) toast.success("Contact removed.");
    else toast.error("Failed to remove contact.");
    const remainingOnPage = contacts.filter((c) => c.id !== contactId).length;
    fetchContacts(
      remainingOnPage === 0 && currentPage > 1 ? currentPage - 1 : currentPage,
      search,
    );
  };

  const handleContactUpdated = (updated: Contact) => {
    setContacts((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      setSubscribedCount(
        next.filter((c) => c.isSubscribed && !c.isBounced && !c.isComplained)
          .length,
      );
      setUnsubscribedCount(next.filter((c) => !c.isSubscribed).length);
      setBouncedCount(next.filter((c) => c.isBounced).length);
      return next;
    });
  };

  const handleExportCSV = () => {
    const headers = [
      "email",
      "firstName",
      "lastName",
      "company",
      "phone",
      "status",
    ];
    const rows = contacts.map((c) => [
      c.email,
      c.firstName || "",
      c.lastName || "",
      c.company || "",
      c.phone || "",
      c.isComplained
        ? "complained"
        : c.isBounced
          ? "bounced"
          : c.isSubscribed
            ? "subscribed"
            : "unsubscribed",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name.replace(/\s+/g, "-")}-contacts.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href="/contact-lists">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {list.name}
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              {list.description && (
                <p className="text-sm text-gray-500">{list.description}</p>
              )}
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Globe className="h-3 w-3" /> {list.domain.domain}
              </span>
              <span className="text-xs text-gray-400">
                {list._count.emailHistory} campaign
                {list._count.emailHistory !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link href={`/send-email?listId=${list.id}`}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send Campaign
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Contacts",
            value: total,
            icon: Users,
            gradient: "from-blue-600 to-blue-800",
            iconBg: "bg-blue-500/30",
          },
          {
            label: "Subscribed",
            value: subscribedCount,
            icon: UserCheck,
            gradient: "from-emerald-600 to-emerald-800",
            iconBg: "bg-emerald-500/30",
          },
          {
            label: "Unsubscribed",
            value: unsubscribedCount,
            icon: UserMinus,
            gradient: "from-gray-600 to-gray-800",
            iconBg: "bg-gray-500/30",
          },
          {
            label: "Bounced",
            value: bouncedCount,
            icon: AlertCircle,
            gradient: "from-orange-600 to-orange-800",
            iconBg: "bg-orange-500/30",
          },
        ].map(({ label, value, icon: Icon, gradient, iconBg }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${gradient}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold opacity-75 uppercase tracking-wider mb-1">
                  {label}
                </p>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              </div>
              <div className={`p-2 rounded-xl ${iconBg}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full border-8 border-white/5" />
          </div>
        ))}
      </div>

      {/* Contacts Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Contacts</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {total.toLocaleString()} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={contacts.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
            </Button>
            <CsvImportDialog
              listId={list.id}
              listName={list.name}
              domainId={list.domainId}
              currentCount={total}
              onSuccess={() => {
                fetchContacts(1, search);
                router.refresh();
              }}
            />
            <AddContactDialog
              listId={list.id}
              onSuccess={() => fetchContacts(currentPage, search)}
            />
          </div>
        </div>

        {/* Search + bulk */}
        <div className="flex items-center gap-3 flex-wrap px-5 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 shrink-0">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label
              htmlFor="select-all"
              className="text-xs text-gray-500 cursor-pointer select-none"
            >
              Select all ({contacts.length})
            </label>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                {selectedIds.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove selected
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search contacts…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-8 text-sm w-56 rounded-lg"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              className="h-8"
            >
              Search
            </Button>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                  fetchContacts(1, "");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              No contacts found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search
                ? "Try adjusting your search"
                : "Add contacts or import a CSV to get started"}
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[auto_1fr_280px_100px] gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <div />
              <div>Contact</div>
              <div>Details</div>
              <div>Status</div>
            </div>
            <div className="divide-y divide-gray-50">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`grid grid-cols-[auto_1fr_280px_100px] gap-3 px-5 py-3 items-center transition-colors ${selectedIds.has(contact.id) ? "bg-blue-50/40" : "hover:bg-gray-50/50"}`}
                  onMouseEnter={() => setHoveredId(contact.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleSelect(contact.id)}
                  />
                  <div className="min-w-0 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {[contact.firstName, contact.lastName]
                            .filter(Boolean)
                            .join(" ") || (
                            <span className="text-gray-400 font-normal italic text-xs">
                              No name
                            </span>
                          )}
                        </p>
                        <div
                          className={`flex items-center gap-0.5 transition-opacity duration-100 ${hoveredId === contact.id ? "opacity-100" : "opacity-0"}`}
                        >
                          <EditContactDialog
                            listId={list.id}
                            contact={contact}
                            onSuccess={handleContactUpdated}
                          />
                          <button
                            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove contact"
                            onClick={() => handleDeleteOne(contact.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="h-2.5 w-2.5 shrink-0" />
                        {contact.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 min-w-0">
                    <span className="truncate flex items-center gap-1 min-w-0">
                      {contact.company ? (
                        <>
                          <Building2 className="h-3 w-3 shrink-0 text-gray-300" />
                          {contact.company}
                        </>
                      ) : (
                        <span className="text-gray-300">No company</span>
                      )}
                    </span>
                    <span className="shrink-0 flex items-center gap-1">
                      {contact.phone ? (
                        <>
                          <Phone className="h-3 w-3 shrink-0 text-gray-300" />
                          {contact.phone}
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </span>
                  </div>
                  <div>{getStatusBadge(contact)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, total)} of{" "}
              {total.toLocaleString()} contacts
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-gray-600 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
