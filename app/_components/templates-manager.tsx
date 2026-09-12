"use client";

/**
 * templates-manager.tsx
 * Keeps all existing functionality + adds URL param handling:
 *   ?editId=<savedTemplateId>       → open that template in the visual/text builder
 *   ?duplicateBuiltin=<builtinId>   → duplicate a built-in template then open it
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Textarea } from "@/app/_components/ui/textarea";
import { Badge } from "@/app/_components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/_components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select";
import { Alert, AlertDescription } from "@/app/_components/ui/alert";
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle,
  X,
  Monitor,
  Smartphone,
  Wand2,
  Type,
  Clock,
  Braces,
} from "lucide-react";
import RichTextEditor from "@/app/_components/rich-text-editor";
import { BUILTIN_TEMPLATES } from "@/app/_lib/email/templates";
import VisualEmailBuilder, { DesignJson, EmailBlock } from "./email-builder";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string;
  name: string;
  description?: string | null;
  subject?: string | null;
  body: string;
  designJson?: string | null;
  category: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

type EditorMode = "visual" | "text";

const CATEGORIES = [
  { value: "all", label: "All Templates" },
  { value: "custom", label: "Custom" },
  { value: "newsletter", label: "Newsletter" },
  { value: "promo", label: "Promotional" },
  { value: "welcome", label: "Welcome" },
  { value: "announcement", label: "Announcement" },
  { value: "transactional", label: "Transactional" },
];

const CATEGORY_COLORS: Record<string, string> = {
  custom: "bg-gray-100 text-gray-700 border-gray-200",
  newsletter: "bg-blue-100 text-blue-700 border-blue-200",
  promo: "bg-orange-100 text-orange-700 border-orange-200",
  welcome: "bg-green-100 text-green-700 border-green-200",
  announcement: "bg-purple-100 text-purple-700 border-purple-200",
  transactional: "bg-teal-100 text-teal-700 border-teal-200",
};

// ── Preview HTML builder ──────────────────────────────────────────────────────

function buildPreviewHtml(body: string) {
  if (body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html"))
    return body;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.wrapper{padding:32px 16px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.1)}.body-content{padding:40px 48px;color:#374151;font-size:15px;line-height:1.7}.footer{padding:20px 48px;border-top:1px solid #e5e7eb;text-align:center}.footer p{font-size:12px;color:#9ca3af}.footer a{color:#6b7280;text-decoration:underline}.body-content h1{font-size:28px;font-weight:700;margin-bottom:16px;color:#111827}.body-content h2{font-size:22px;font-weight:600;margin-bottom:14px;color:#111827}.body-content p{margin-bottom:16px}.body-content ul,.body-content ol{margin-bottom:16px;padding-left:24px}.body-content li{margin-bottom:6px}.body-content a{color:#2563eb}.body-content strong{font-weight:700}.body-content img{max-width:100%;border-radius:6px}.body-content table{width:100%;border-collapse:collapse;margin-bottom:16px}.body-content td,.body-content th{padding:10px 12px;border:1px solid #e5e7eb}.body-content th{background:#f9fafb;font-weight:600}</style></head><body><div class="wrapper"><div class="container"><div class="body-content">${body}</div><div class="footer"><p>Your Brand · <a href="#">Unsubscribe</a></p></div></div></div></body></html>`;
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
}) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-white rounded-t-xl shrink-0">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm font-semibold text-gray-900 truncate pr-4 flex items-center gap-2">
              {template.name}
              {template.designJson && (
                <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  <Wand2 className="h-2.5 w-2.5" /> Visual
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              {template.subject
                ? `Subject: ${template.subject}`
                : "Template preview"}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(["desktop", "mobile"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
                >
                  {m === "desktop" ? (
                    <Monitor className="h-3.5 w-3.5" />
                  ) : (
                    <Smartphone className="h-3.5 w-3.5" />
                  )}
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {template.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-900">
                Your Brand
              </span>
              <p className="text-sm font-medium text-gray-800 truncate">
                {template.subject || "(No subject set)"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-200 p-6 flex justify-center">
          {viewMode === "mobile" ? (
            <div
              className="relative bg-gray-900 rounded-[2.5rem] p-3 pb-4 shadow-2xl"
              style={{ width: 410 }}
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-700 rounded-full" />
              <div className="bg-white rounded-[2rem] overflow-hidden mt-3">
                <iframe
                  srcDoc={buildPreviewHtml(template.body)}
                  title="Mobile preview"
                  className="w-full border-0 block"
                  style={{ height: 640 }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl">
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  {["bg-red-400", "bg-yellow-400", "bg-green-400"].map(
                    (c, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${c}`}
                      />
                    ),
                  )}
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-0.5 text-xs text-gray-400">
                  Template Preview
                </div>
              </div>
              <iframe
                srcDoc={buildPreviewHtml(template.body)}
                title="Desktop preview"
                className="w-full border-0 block"
                style={{ height: 680 }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Editor Mode Picker ────────────────────────────────────────────────────────

function EditorModePicker({
  onSelect,
}: {
  onSelect: (mode: EditorMode) => void;
}) {
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="min-w-[700px]">
        <DialogHeader>
          <DialogTitle>Choose your editor</DialogTitle>
          <DialogDescription>
            Pick how you'd like to build this template.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => onSelect("visual")}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center">
              <Wand2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 mb-1">
                Visual Builder
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Drag-and-drop blocks, visual styling, pixel-perfect layouts.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              ✨ Recommended
            </span>
          </button>

          <button
            onClick={() => onSelect("text")}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition-all group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center">
              <Type className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 mb-1">
                Rich Text Editor
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Classic text editor with formatting. Best for transactional
                emails.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
              <Type className="h-2.5 w-2.5" /> Simple
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Text Template Form ────────────────────────────────────────────────────────

function TextTemplateForm({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: EmailTemplate | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("custom");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && editing) {
      setName(editing.name);
      setDescription(editing.description || "");
      setSubject(editing.subject || "");
      setBody(editing.body);
      setCategory(editing.category);
    } else if (open && !editing) {
      setName("");
      setDescription("");
      setSubject("");
      setBody("");
      setCategory("custom");
    }
    setError("");
  }, [open, editing]);

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      setError("Name and body are required.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          subject: subject.trim() || undefined,
          body,
          category,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error saving template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[92vh] flex flex-col p-0 gap-0">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <DialogTitle>
              {editing ? "Edit Template" : "New Text Template"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              Plain text / rich formatting mode
            </DialogDescription>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Template Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Welcome Email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              Description{" "}
              <span className="text-gray-400 font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Default Subject{" "}
              <span className="text-gray-400 font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Welcome to {company}!"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email Content *</Label>
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Write your email body..."
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !body.trim()}
          >
            {isSaving
              ? "Saving..."
              : editing
                ? "Save Changes"
                : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: EmailTemplate;
  onPreview: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const isVisual = !!template.designJson;

  return (
    <div className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col">
      <div
        className="h-36 bg-gray-50 border-b border-gray-100 overflow-hidden cursor-pointer relative"
        onClick={onPreview}
      >
        <div
          className="absolute inset-0 scale-[0.35] origin-top-left pointer-events-none"
          style={{ width: "286%", height: "286%" }}
        >
          <iframe
            srcDoc={buildPreviewHtml(template.body)}
            title="thumbnail"
            className="w-full border-0 block"
            style={{ height: 520 }}
            sandbox="allow-same-origin"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20 group-hover:opacity-0 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
            <Eye className="h-3.5 w-3.5 text-gray-700" />
            <span className="text-xs font-semibold text-gray-700">Preview</span>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-sm text-gray-900 truncate flex-1">
            {template.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {isVisual && (
              <span className="inline-flex items-center gap-0.5 bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                <Wand2 className="h-2 w-2" /> Visual
              </span>
            )}
            <Badge
              className={`text-[10px] px-1.5 py-0.5 ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom}`}
            >
              {template.category}
            </Badge>
          </div>
        </div>

        {template.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {template.description}
          </p>
        )}
        {template.subject && (
          <p className="text-[10px] text-gray-400 truncate mb-2">
            Subject: {template.subject}
          </p>
        )}

        <div className="flex items-center gap-1 mt-auto pt-2 border-t border-gray-50">
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mr-auto">
            <Clock className="h-2.5 w-2.5" />
            {new Date(template.updatedAt).toLocaleDateString()}
          </span>
          {!template.isBuiltIn && (
            <>
              <button
                onClick={onEdit}
                title="Edit"
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDuplicate}
                title="Duplicate"
                className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                title="Delete"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {template.isBuiltIn && (
            <button
              onClick={onDuplicate}
              title="Duplicate to edit"
              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  template,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  open: boolean;
  template: EmailTemplate | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Template?</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{template?.name}</strong>. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main TemplatesManager ─────────────────────────────────────────────────────

export function TemplatesManager() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTab, setFilterTab] = useState<"all" | "custom" | "builtin">(
    "all",
  );

  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [showPreview, setShowPreview] = useState(false);

  const [showModePicker, setShowModePicker] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [showTextForm, setShowTextForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // Prevents URL param effect from running twice in StrictMode
  const urlParamHandled = useRef(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) setTemplates(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── URL param handling (Task 3 companion) ─────────────────────────────────
  // After templates load, check for ?editId or ?duplicateBuiltin
  useEffect(() => {
    if (isLoading || urlParamHandled.current) return;

    const editId = searchParams.get("editId");
    const duplicateBuiltinId = searchParams.get("duplicateBuiltin");

    if (editId) {
      urlParamHandled.current = true;
      const target = templates.find((t) => t.id === editId);
      if (target) {
        handleEdit(target);
      }
      // Clear param from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("editId");
      router.replace(`/templates${params.toString() ? `?${params}` : ""}`);
    } else if (duplicateBuiltinId) {
      urlParamHandled.current = true;
      const builtin = BUILTIN_TEMPLATES.find(
        (t) => t.id === duplicateBuiltinId,
      );
      if (builtin) {
        // Duplicate it then open in visual builder
        (async () => {
          try {
            const res = await fetch("/api/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `${builtin.name} (Copy)`,
                description: builtin.description,
                subject: builtin.subject,
                body: builtin.body,
                designJson: builtin.designJson,
                category: builtin.category,
              }),
            });
            if (!res.ok) throw new Error("Duplicate failed");
            const newTemplate: EmailTemplate = await res.json();
            await fetchTemplates();
            showToast("Built-in template duplicated — opening editor…");
            // Open visual builder with the new copy
            setEditingTemplate(newTemplate);
            setEditorMode("visual");
            setShowVisualBuilder(true);
          } catch (e) {
            showToast(
              e instanceof Error ? e.message : "Duplicate failed",
              "error",
            );
          }
        })();
      }
      // Clear param from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("duplicateBuiltin");
      router.replace(`/templates${params.toString() ? `?${params}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, templates]);

  // ── Create ────────────────────────────────────────────────────────────────

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setShowModePicker(true);
  };

  const handleModeSelected = (mode: EditorMode) => {
    setEditorMode(mode);
    setShowModePicker(false);
    if (mode === "visual") setShowVisualBuilder(true);
    else setShowTextForm(true);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    if (template.designJson) {
      setEditorMode("visual");
      setShowVisualBuilder(true);
    } else {
      setEditorMode("text");
      setShowTextForm(true);
    }
  };

  // ── Visual Builder Save ───────────────────────────────────────────────────

  const handleVisualSave = async (
    html: string,
    designJson: string,
    name: string,
  ) => {
    setIsSaving(true);
    try {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : "/api/templates";
      const method = editingTemplate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          body: html,
          designJson,
          category: editingTemplate?.category || "custom",
          subject: editingTemplate?.subject || undefined,
          description: editingTemplate?.description || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }
      await fetchTemplates();
      setShowVisualBuilder(false);
      setEditingTemplate(null);
      showToast(editingTemplate ? "Template updated!" : "Template created!");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Duplicate ─────────────────────────────────────────────────────────────

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: template.description,
          subject: template.subject,
          body: template.body,
          designJson: template.designJson,
          category: template.category,
        }),
      });
      if (!res.ok) throw new Error("Duplicate failed");
      await fetchTemplates();
      showToast("Template duplicated!");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Duplicate failed", "error");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/templates/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchTemplates();
      showToast("Template deleted.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const allTemplates = [
    ...templates,
    ...(filterTab !== "custom"
      ? BUILTIN_TEMPLATES.map((t) => ({
          ...t,
          isBuiltIn: true,
          designJson: t.designJson || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      : []),
  ];

  const filtered = allTemplates.filter((t) => {
    if (filterTab === "custom" && t.isBuiltIn) return false;
    if (filterTab === "builtin" && !t.isBuiltIn) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getInitialBlocks = (): EmailBlock[] | undefined => {
    if (!editingTemplate?.designJson) return undefined;
    try {
      const parsed: DesignJson = JSON.parse(editingTemplate.designJson);
      return parsed.blocks;
    } catch {
      return undefined;
    }
  };

  // ── Visual builder full-screen mode ──────────────────────────────────────

  if (showVisualBuilder) {
    return (
      <VisualEmailBuilder
        initialBlocks={getInitialBlocks()}
        initialDesignJson={editingTemplate?.designJson}
        templateName={editingTemplate?.name || "New Template"}
        onSave={handleVisualSave}
        onBack={() => {
          setShowVisualBuilder(false);
          setEditingTemplate(null);
        }}
        isSaving={isSaving}
      />
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {templates.length} custom template
            {templates.length !== 1 ? "s" : ""} · Visual & text editors
          </p>
        </div>
        <Button onClick={handleNewTemplate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
            {[
              { key: "all", label: "All" },
              { key: "custom", label: "My Templates" },
              { key: "builtin", label: "Built-in" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="h-36 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-50 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
          <LayoutTemplate className="mx-auto h-12 w-12 text-gray-200 mb-4" />
          <p className="text-base font-semibold text-gray-600 mb-1">
            {search || filterCategory !== "all"
              ? "No templates match your search"
              : "No templates yet"}
          </p>
          <p className="text-sm text-gray-400 mb-6">
            {search
              ? "Try different search terms or clear filters."
              : "Create your first template to get started."}
          </p>
          {!search && (
            <Button onClick={handleNewTemplate}>
              <Plus className="mr-1.5 h-4 w-4" /> Create Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template as EmailTemplate}
              onPreview={() => {
                setPreviewTemplate(template as EmailTemplate);
                setShowPreview(true);
              }}
              onEdit={() => handleEdit(template as EmailTemplate)}
              onDuplicate={() => handleDuplicate(template as EmailTemplate)}
              onDelete={() => setDeleteTarget(template as EmailTemplate)}
            />
          ))}
        </div>
      )}

      {/* Variables banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Braces className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 mb-0.5">
            Dynamic variables in templates
          </p>
          <p className="text-xs text-blue-600">
            Use{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">
              {"{first_name}"}
            </code>
            ,{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">
              {"{last_name}"}
            </code>
            ,{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">
              {"{email}"}
            </code>
            ,{" "}
            <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">
              {"{company}"}
            </code>{" "}
            anywhere in your templates.
          </p>
        </div>
      </div>

      {/* Modals */}
      {showModePicker && <EditorModePicker onSelect={handleModeSelected} />}

      <TextTemplateForm
        open={showTextForm}
        onClose={() => {
          setShowTextForm(false);
          setEditingTemplate(null);
        }}
        onSaved={() => {
          fetchTemplates();
          showToast(
            editingTemplate ? "Template updated!" : "Template created!",
          );
        }}
        editing={editingTemplate}
      />

      <PreviewModal
        open={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewTemplate(null);
        }}
        template={previewTemplate}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        template={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
