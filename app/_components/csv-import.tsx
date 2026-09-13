"use client";

/**
 * csv-import-shared.tsx
 *
 * Shared CSV parsing, column-mapping, validation, and UI primitives used by:
 *  - CreateContactListDialog  (create-contact-list-dialog.tsx)
 *  - ContactListDetail        (contact-list-detail.tsx  →  CsvImportDialog)
 */

import { useState } from "react";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import {
  AlertCircle,
  X,
  Edit2,
  Check,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Trash2,
  Info,
  Users,
  Layers,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedContact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
}

export interface ValidationResult {
  email: string;
  isValid: boolean;
  hasMxRecord: boolean;
  isReachable: boolean;
  error?: string;
}

export type FieldKey =
  | "email"
  | "firstName"
  | "lastName"
  | "company"
  | "phone"
  | "ignore";

export interface ColumnMapping {
  csvHeader: string;
  mappedTo: FieldKey;
  sample: string[];
}

export interface InvalidRow {
  row: number;
  email: string;
  reason: string;
  // editable metadata
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_CONTACTS = 100;

// Include-only domain filter: "gmail" keeps just @gmail.com addresses;
// "other" keeps everything EXCEPT gmail. `null` means no filter applied
// (everything kept) — this is a single-select control, not independent
// toggles.
export type IncludeDomainMode = "gmail" | "other" | "custom" | null;

export const GMAIL_DOMAIN = "gmail.com";

export const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "company", label: "Company" },
  { value: "phone", label: "Phone" },
  { value: "ignore", label: "Ignore" },
];

const ADJECTIVES = [
  "Alpha",
  "Bravo",
  "Cedar",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golden",
  "Harbor",
  "Indigo",
  "Jade",
  "Kilo",
  "Lunar",
  "Maple",
  "Noble",
  "Ocean",
  "Prime",
  "Quartz",
  "Ruby",
  "Sierra",
  "Tidal",
  "Ultra",
  "Vapor",
  "Willow",
  "Xenon",
  "Yellow",
  "Zenith",
];
const NOUNS = [
  "Batch",
  "Crew",
  "Draft",
  "Edge",
  "Fleet",
  "Group",
  "Hub",
  "Index",
  "Jet",
  "Keystone",
  "Layer",
  "Matrix",
  "Node",
  "Orbit",
  "Pack",
  "Queue",
  "Relay",
  "Segment",
  "Tier",
  "Unit",
  "Vault",
  "Wave",
  "Axis",
  "Bloom",
  "Crest",
];
/**
 * Generates a short, URL/display-safe unique suffix.
 * Uses crypto.randomUUID() when available (browser + modern Node),
 * falling back to Math.random() — never requires a DB call, so
 * uniqueness is "practically guaranteed" rather than DB-enforced.
 */
const UNIQUE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
export const generateUniqueSuffix = (length = 5) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, length);
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += UNIQUE_CHARS[Math.floor(Math.random() * UNIQUE_CHARS.length)];
  }
  return out;
};

/**
 * Generates a friendly, (practically) unique base name for a new
 * contact list, e.g. "Fierce Chicken #a8x2q".
 *
 * The unique suffix guarantees two contact lists created at the same
 * moment (or from two different imports) never collide, without any
 * database lookup.
 */
export const generateBaseName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun} #${generateUniqueSuffix()}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string) {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Splits a flat list of email addresses into those kept vs. dropped based on
 * an include-only domain mode, case-insensitive. Used by both the paste and
 * CSV import flows:
 *   - null:     keep everything (no filter)
 *   - "gmail":  keep only @gmail.com
 *   - "other":  keep everything EXCEPT @gmail.com
 *   - "custom": keep only the given customDomain (bex only)
 */
export function filterByIncludeMode(
  emails: string[],
  mode: IncludeDomainMode,
  customDomain?: string,
): { kept: string[]; excluded: string[] } {
  if (!mode) return { kept: emails, excluded: [] };

  const matchesGmail = (d: string) => d === GMAIL_DOMAIN;
  const customLower = customDomain?.trim().toLowerCase();

  const isKept = (domain: string): boolean => {
    switch (mode) {
      case "gmail":
        return matchesGmail(domain);
      case "other":
        return !matchesGmail(domain);
      case "custom":
        return !!customLower && domain === customLower;
      default:
        return true;
    }
  };

  const kept: string[] = [];
  const excluded: string[] = [];
  for (const email of emails) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && isKept(domain)) kept.push(email);
    else excluded.push(email);
  }
  return { kept, excluded };
}

/** Same as `filterByIncludeMode` but operates on ParsedContact rows. */
export function filterContactsByIncludeMode(
  contacts: ParsedContact[],
  mode: IncludeDomainMode,
  customDomain?: string,
): { kept: ParsedContact[]; excluded: ParsedContact[] } {
  if (!mode) return { kept: contacts, excluded: [] };
  const { kept: keptEmails } = filterByIncludeMode(
    contacts.map((c) => c.email),
    mode,
    customDomain,
  );
  const keptSet = new Set(keptEmails);
  return {
    kept: contacts.filter((c) => keptSet.has(c.email)),
    excluded: contacts.filter((c) => !keptSet.has(c.email)),
  };
}

/** Returns true only when the result is definitively bad (not a timeout). */
export function isBadValidationResult(r: ValidationResult) {
  if (r.error === "Validation timeout") return false;
  return r.isValid && (!r.hasMxRecord || !r.isReachable);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV parsing
// ─────────────────────────────────────────────────────────────────────────────

/** RFC-4180 CSV parser — handles quoted fields, embedded commas + newlines. */
export function parseRawCSV(text: string): {
  headers: string[];
  rows: string[][];
} {
  const allRows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuote) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        row.push(field.trim());
        field = "";
      } else if (ch === "\n") {
        row.push(field.trim());
        field = "";
        allRows.push(row);
        row = [];
      } else if (ch === "\r") {
        /* skip */
      } else {
        field += ch;
      }
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) allRows.push(row);
  if (allRows.length < 2) return { headers: [], rows: [] };
  const headers = allRows[0].map((h) => h.replace(/^"|"$/g, ""));
  return { headers, rows: allRows.slice(1) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Column auto-detection
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_PATTERNS: Record<FieldKey, RegExp[]> = {
  email: [
    /^e[-_]?mail/i,
    /^email.address/i,
    /^e-mail/i,
    /^mail$/i,
    /^contact.email/i,
    /^user.email/i,
  ],
  firstName: [
    /^first[-_\s]?name/i,
    /^firstname/i,
    /^fname/i,
    /^given[-_\s]?name/i,
    /^first$/i,
    /^forename/i,
  ],
  lastName: [
    /^last[-_\s]?name/i,
    /^lastname/i,
    /^lname/i,
    /^surname/i,
    /^family[-_\s]?name/i,
    /^last$/i,
  ],
  company: [
    /^company/i,
    /^organisation/i,
    /^organization/i,
    /^org$/i,
    /^employer/i,
    /^business/i,
    /^firm/i,
    /^workplace/i,
  ],
  phone: [
    /^phone/i,
    /^mobile/i,
    /^cell/i,
    /^tel(ephone)?/i,
    /^contact.number/i,
    /^phone.number/i,
  ],
  ignore: [],
};
const FULL_NAME_RE =
  /^(full[-_\s]?name|name|display[-_\s]?name|screen[-_\s]?name)$/i;

export function detectColumnMapping(
  headers: string[],
  rows: string[][],
): ColumnMapping[] {
  const usedFields = new Set<FieldKey>();
  return headers.map((header, colIdx) => {
    const sample = rows
      .slice(0, 5)
      .map((r) => r[colIdx] || "")
      .filter(Boolean)
      .slice(0, 3);
    const h = header.trim();
    const scores: Record<FieldKey, number> = {
      email: 0,
      firstName: 0,
      lastName: 0,
      company: 0,
      phone: 0,
      ignore: 0,
    };
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [
      FieldKey,
      RegExp[],
    ][]) {
      for (const p of patterns) {
        if (p.test(h)) {
          scores[field] += 10;
          break;
        }
      }
    }
    const emailLike = sample.filter((s) => isValidEmail(s)).length;
    if (emailLike > 0) scores.email += emailLike * 5;
    const phoneLike = sample.filter((s) => /^[\d\s+\-()]{7,}$/.test(s)).length;
    if (phoneLike > 0) scores.phone += phoneLike * 3;
    if (FULL_NAME_RE.test(h) && scores.firstName < 5) scores.firstName += 6;
    let bestField: FieldKey = "ignore",
      bestScore = 0;
    for (const [field, score] of Object.entries(scores) as [
      FieldKey,
      number,
    ][]) {
      if (field === "ignore") continue;
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }
    if (bestField !== "ignore" && usedFields.has(bestField))
      bestField = "ignore";
    if (bestField !== "ignore") usedFields.add(bestField);
    return { csvHeader: h, mappedTo: bestField, sample };
  });
}

export function applyMapping(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping[],
): { contacts: ParsedContact[]; invalidRows: InvalidRow[] } {
  const emailColIdx = mapping.findIndex((m) => m.mappedTo === "email");
  if (emailColIdx === -1) return { contacts: [], invalidRows: [] };
  const getCol = (row: string[], field: FieldKey) => {
    const idx = mapping.findIndex((m) => m.mappedTo === field);
    return idx >= 0 ? (row[idx] || "").trim() : undefined;
  };
  const contacts: ParsedContact[] = [];
  const invalidRows: InvalidRow[] = [];
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    const rawEmail = (row[emailColIdx] || "").trim().toLowerCase();
    if (!rawEmail) return;
    if (!isValidEmail(rawEmail)) {
      invalidRows.push({
        row: i + 2,
        email: rawEmail,
        reason: "Invalid email format",
        firstName: getCol(row, "firstName"),
        lastName: getCol(row, "lastName"),
        company: getCol(row, "company"),
        phone: getCol(row, "phone"),
      });
      return;
    }
    if (seen.has(rawEmail)) {
      invalidRows.push({ row: i + 2, email: rawEmail, reason: "Duplicate" });
      return;
    }
    seen.add(rawEmail);
    let firstName = getCol(row, "firstName");
    const lastName = getCol(row, "lastName");
    if (firstName && !lastName && firstName.includes(" "))
      firstName = firstName.split(" ")[0];
    contacts.push({
      email: rawEmail,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      company: getCol(row, "company") || undefined,
      phone: getCol(row, "phone") || undefined,
    });
  });
  return { contacts, invalidRows };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable UI components
// ─────────────────────────────────────────────────────────────────────────────

/** Shield icon with tooltip showing MX validation result. */
export function ValidationBadge({ result }: { result: ValidationResult }) {
  const isTimeout = result.error === "Validation timeout";
  const isGood = result.isValid && result.hasMxRecord && result.isReachable;
  const tip =
    result.error || (isGood ? "MX verified & reachable" : "Failed MX check");
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help">
            {isTimeout ? (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            ) : isGood ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ShieldX className="h-3.5 w-3.5 text-red-500" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Column mapping editor table. */
export function ColumnMappingEditor({
  columnMapping,
  onUpdate,
}: {
  columnMapping: ColumnMapping[];
  onUpdate: (idx: number, field: FieldKey) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label className="text-gray-700">Column Mapping</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[200px]">
              Auto-detected from your CSV headers. Adjust if anything is wrong.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_1fr] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          <div>CSV Column</div>
          <div>Maps To</div>
          <div>Sample Values</div>
        </div>
        <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
          {columnMapping.map((col, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-[1fr_140px_1fr] gap-2 px-3 py-2 items-center text-xs ${col.mappedTo === "ignore" ? "opacity-50" : ""}`}
            >
              <span
                className="font-medium text-gray-700 truncate"
                title={col.csvHeader}
              >
                {col.csvHeader}
              </span>
              <Select
                value={col.mappedTo}
                onValueChange={(v) => onUpdate(idx, v as FieldKey)}
              >
                <SelectTrigger className="h-7 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span
                className="text-gray-400 truncate"
                title={col.sample.join(", ")}
              >
                {col.sample.join(", ") || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Preview table for valid parsed contacts. */
export function ContactsPreviewTable({
  contacts,
  validationResults,
  isValidating,
  validateTotal,
  onValidate,
  extraBadge,
}: {
  contacts: ParsedContact[];
  validationResults: ValidationResult[];
  isValidating: boolean;
  validateTotal: number;
  onValidate: () => void;
  extraBadge?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-green-700">
          <Users className="h-3.5 w-3.5" />
          {contacts.length} valid contact{contacts.length !== 1 ? "s" : ""}
          {extraBadge}
        </Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs bg-blue-600 text-white hover:bg-blue-500 border-blue-600 hover:text-white"
          onClick={onValidate}
          disabled={isValidating}
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              {validationResults.length}/{validateTotal}
            </>
          ) : (
            <>
              <ShieldCheck className="mr-1.5 h-3 w-3" />
              Validate Emails
            </>
          )}
        </Button>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">
                Email
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">
                Name
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">
                Company
              </th>
              {validationResults.length > 0 && (
                <th className="px-3 py-2 text-left font-medium text-gray-500">
                  Score
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.slice(0, 50).map((c, i) => {
              const vr = validationResults.find((r) => r.email === c.email);
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-gray-700 truncate max-w-[180px]">
                    {c.email}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">
                    {c.company || <span className="text-gray-300">—</span>}
                  </td>
                  {validationResults.length > 0 && (
                    <td className="px-3 py-1.5">
                      {vr ? (
                        <ValidationBadge result={vr} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {contacts.length > 50 && (
          <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            +{contacts.length - 50} more rows…
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InvalidRowsPanel  — with inline edit + per-row re-validation
// ─────────────────────────────────────────────────────────────────────────────

interface EditingState {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
}

interface InvalidRowItemProps {
  row: InvalidRow;
  onRemove: (email: string) => void;
  onSave: (original: string, updated: InvalidRow) => void;
}

function InvalidRowItem({ row, onRemove, onSave }: InvalidRowItemProps) {
  const [editing, setEditing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [fields, setFields] = useState<EditingState>({
    email: row.email,
    firstName: row.firstName || "",
    lastName: row.lastName || "",
    company: row.company || "",
    phone: row.phone || "",
  });

  const handleSave = async () => {
    const trimmedEmail = fields.email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setIsValidating(true);
    let reason = row.reason;
    let finalEmail = trimmedEmail;

    // If the email changed or we want to re-validate, hit the API
    if (!isValidEmail(trimmedEmail)) {
      reason = "Invalid email format";
      setIsValidating(false);
      onSave(row.email, {
        ...row,
        email: finalEmail,
        reason,
        firstName: fields.firstName || undefined,
        lastName: fields.lastName || undefined,
        company: fields.company || undefined,
        phone: fields.phone || undefined,
      });
      setEditing(false);
      return;
    }

    try {
      const res = await fetch("/api/validate-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [trimmedEmail] }),
      });
      if (res.ok) {
        const results: ValidationResult[] = await res.json();
        const result = results[0];
        if (result && !isBadValidationResult(result)) {
          // Email is now valid — tell parent to promote it to valid contacts
          onSave(row.email, {
            ...row,
            email: trimmedEmail,
            reason: "__VALID__", // sentinel: parent should remove from invalid + add to contacts
            firstName: fields.firstName || undefined,
            lastName: fields.lastName || undefined,
            company: fields.company || undefined,
            phone: fields.phone || undefined,
          });
          setEditing(false);
          setIsValidating(false);
          return;
        }
        reason = result?.error || "Failed MX validation";
      }
    } catch {
      reason = "Validation failed";
    }

    onSave(row.email, {
      ...row,
      email: finalEmail,
      reason,
      firstName: fields.firstName || undefined,
      lastName: fields.lastName || undefined,
      company: fields.company || undefined,
      phone: fields.phone || undefined,
    });
    setEditing(false);
    setIsValidating(false);
  };

  if (editing) {
    return (
      <div className="px-3 py-2 text-xs bg-red-50/80 space-y-2">
        {/* Email row */}
        <div className="flex items-center gap-1.5">
          <span className="text-red-500 font-medium w-16 shrink-0">Email</span>
          <Input
            value={fields.email}
            onChange={(e) =>
              setFields((p) => ({ ...p, email: e.target.value }))
            }
            className="h-6 text-xs rounded-md border-red-200 focus:border-red-400 flex-1"
            placeholder="email@example.com"
          />
        </div>
        {/* Name + company + phone in a compact grid */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 w-16 shrink-0">First</span>
            <Input
              value={fields.firstName}
              onChange={(e) =>
                setFields((p) => ({ ...p, firstName: e.target.value }))
              }
              className="h-6 text-xs rounded-md flex-1"
              placeholder="First name"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 w-16 shrink-0">Last</span>
            <Input
              value={fields.lastName}
              onChange={(e) =>
                setFields((p) => ({ ...p, lastName: e.target.value }))
              }
              className="h-6 text-xs rounded-md flex-1"
              placeholder="Last name"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 w-16 shrink-0">Company</span>
            <Input
              value={fields.company}
              onChange={(e) =>
                setFields((p) => ({ ...p, company: e.target.value }))
              }
              className="h-6 text-xs rounded-md flex-1"
              placeholder="Company"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 w-16 shrink-0">Phone</span>
            <Input
              value={fields.phone}
              onChange={(e) =>
                setFields((p) => ({ ...p, phone: e.target.value }))
              }
              className="h-6 text-xs rounded-md flex-1"
              placeholder="Phone"
            />
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center justify-end gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-2 py-1 rounded-md text-xs text-gray-500 hover:bg-red-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isValidating || !fields.email.trim()}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Checking…
              </>
            ) : (
              <>
                <Check className="h-3 w-3" /> Save & revalidate
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-1.5 text-xs">
      <div className="min-w-0">
        <span className="text-red-700 font-medium truncate">
          {row.email || "(empty)"}
        </span>
        {row.row > 0 && (
          <span className="text-red-400 ml-1.5">row {row.row}</span>
        )}
        <span className="text-red-400 ml-1.5">· {row.reason}</span>
      </div>
      <div className="flex items-center gap-0.5 ml-2 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1 hover:bg-red-200 rounded-full transition-colors"
          title="Edit row"
        >
          <Edit2 className="h-3 w-3 text-red-500" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(row.email)}
          className="p-1 hover:bg-red-200 rounded-full transition-colors"
          title="Dismiss"
        >
          <X className="h-3 w-3 text-red-600" />
        </button>
      </div>
    </div>
  );
}

/**
 * InvalidRowsPanel
 *
 * Renders the list of invalid / skipped rows.
 * Supports inline editing with per-row re-validation.
 *
 * `onSave` receives the original email and the updated InvalidRow.
 * If updated.reason === "__VALID__" the parent should move the row to valid contacts.
 */
export function InvalidRowsPanel({
  invalidRows,
  onRemove,
  onClearAll,
  onSave,
}: {
  invalidRows: InvalidRow[];
  onRemove: (email: string) => void;
  onClearAll: () => void;
  onSave: (originalEmail: string, updated: InvalidRow) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-red-600 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Invalid / Skipped ({invalidRows.length})
        </Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={onClearAll}
        >
          <Trash2 className="mr-1 h-3 w-3" /> Clear all invalid
        </Button>
      </div>
      <div className="max-h-56 overflow-y-auto border border-red-200 bg-red-50 rounded-lg divide-y divide-red-100">
        {invalidRows.map((row, i) => (
          <InvalidRowItem
            key={`${row.email}-${i}`}
            row={row}
            onRemove={onRemove}
            onSave={onSave}
          />
        ))}
      </div>
      <p className="text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Remove or dismiss all invalid rows before importing.
      </p>
    </div>
  );
}

/**
 * IncludeDomainFilterControl
 *
 * Single-select include-only filter: "Gmail only" / "All other extensions"
 * (everything except gmail). Clicking the active option again clears the
 * filter. `allowCustom` (bex only) adds a 3rd custom-domain option — a paid
 * feature on the other products, so they don't render it.
 */
export function IncludeDomainFilterControl({
  mode,
  onChange,
  customDomain,
  onCustomDomainChange,
  allowCustom = false,
  keptCount,
  totalCount,
}: {
  mode: IncludeDomainMode;
  onChange: (mode: IncludeDomainMode) => void;
  customDomain?: string;
  onCustomDomainChange?: (domain: string) => void;
  allowCustom?: boolean;
  keptCount?: number;
  totalCount?: number;
}) {
  const select = (next: Exclude<IncludeDomainMode, null>) => {
    onChange(mode === next ? null : next);
  };

  const showCount =
    mode && typeof keptCount === "number" && typeof totalCount === "number";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-gray-700">
          <ShieldX className="h-3.5 w-3.5" /> Filter by email extension
        </Label>
        {showCount && (
          <span className="text-xs text-amber-600 font-medium">
            {keptCount} of {totalCount} kept
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { key: "gmail" as const, label: "Include only Gmail" },
            { key: "other" as const, label: "Include all other extensions" },
          ]
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => select(opt.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              mode === opt.key
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {allowCustom && (
          <button
            type="button"
            onClick={() => select("custom")}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              mode === "custom"
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            Include only custom domain
          </button>
        )}
      </div>
      {allowCustom && mode === "custom" && (
        <Input
          placeholder="e.g. mycompany.com"
          value={customDomain ?? ""}
          onChange={(e) => onCustomDomainChange?.(e.target.value)}
          className="h-7 text-xs rounded-lg max-w-xs"
        />
      )}
    </div>
  );
}

/** Overflow split badge shown beside the valid-contact count. */
export function SplitBadge({ listCount }: { listCount: number }) {
  return (
    <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px] ml-1">
      <Layers className="h-2.5 w-2.5 mr-0.5" />
      {listCount} lists
    </Badge>
  );
}
