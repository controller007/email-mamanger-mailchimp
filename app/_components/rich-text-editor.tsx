"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Extension } from "@tiptap/core";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link2,
  Image as ImageIcon,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Palette,
  Braces,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Code,
  Type,
  HighlighterIcon,
  ChevronDown,
} from "lucide-react";

// ── Custom FontSize extension ─────────────────────────────────────────────────
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize?.replace("px", "") || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    } as any;
  },
});

// ── Custom LineHeight extension ────────────────────────────────────────────────
const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return { types: ["paragraph", "heading"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) => {
              if (!attrs.lineHeight) return {};
              return { style: `line-height: ${attrs.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }: any) =>
          this.options.types.every((type: string) =>
            commands.updateAttributes(type, { lineHeight }),
          ),
    } as any;
  },
});

// ─────────────────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
];

const FONT_SIZES = [
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "18",
  "20",
  "22",
  "24",
  "26",
  "28",
  "32",
  "36",
  "42",
  "48",
  "56",
  "64",
  "72",
];

const VARIABLES = [
  { label: "First Name", token: "{first_name}" },
  { label: "Last Name", token: "{last_name}" },
  { label: "Full Name", token: "{full_name}" },
  { label: "Email", token: "{email}" },
  { label: "Company", token: "{company}" },
];

const TEXT_COLORS = [
  "#000000",
  "#111827",
  "#374151",
  "#6B7280",
  "#9CA3AF",
  "#D1D5DB",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#EC4899",
  "#F43F5E",
  "#FFFFFF",
];

const BG_COLORS = [
  "transparent",
  "#FEF2F2",
  "#FFF7ED",
  "#FEFCE8",
  "#F0FDF4",
  "#F0FDFA",
  "#ECFEFF",
  "#EFF6FF",
  "#EEF2FF",
  "#F5F3FF",
  "#FDF4FF",
  "#FFF1F2",
  "#F9FAFB",
  "#F3F4F6",
  "#E5E7EB",
];

const LINE_HEIGHTS = ["1", "1.15", "1.25", "1.5", "1.75", "2", "2.5"];

// ─────────────────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" />;
}

function ToolBtn({
  onClick,
  active,
  title,
  children,
  disabled,
  className = "",
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`
        flex h-7 w-7 items-center justify-center rounded text-sm transition-colors shrink-0
        ${active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
        ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your email content here...",
  minHeight = 320,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  const [varOpen, setVarOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  // Track when content is being set programmatically to avoid feedback loops
  const isSyncingRef = useRef(false);
  const lastExternalContent = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    onUpdate: ({ editor }) => {
      if (isSyncingRef.current) return;
      const html = editor.getHTML();
      lastExternalContent.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none p-5",
        style: `min-height: ${minHeight}px;`,
      },
    },
    immediatelyRender: false,
  });

  // Sync external content changes (e.g. template selected) without breaking cursor
  useEffect(() => {
    if (!editor) return;
    if (content === lastExternalContent.current) return;
    if (content === editor.getHTML()) return;

    isSyncingRef.current = true;
    lastExternalContent.current = content;
    editor.commands.setContent(content || "", false);
    // Use setTimeout to ensure the command completes before we re-enable updates
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
  }, [content, editor]);

  const insertVariable = useCallback(
    (token: string) => {
      editor?.chain().focus().insertContent(token).run();
      setVarOpen(false);
    },
    [editor],
  );

  const setLink = () => {
    if (!linkUrl.trim()) return;
    const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    editor?.chain().focus().setLink({ href }).run();
    setLinkUrl("");
    setLinkOpen(false);
  };

  const insertImage = () => {
    if (!imageUrl.trim()) return;
    editor?.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setImageOpen(false);
  };

  const insertTable = (rows: number, cols: number) => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
    setTableOpen(false);
  };

  if (!editor) return null;

  const currentFontFamily = editor.getAttributes("textStyle").fontFamily || "";
  const currentFontSize = editor.getAttributes("textStyle").fontSize || "14";
  const currentColor = editor.getAttributes("textStyle").color || "";

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-gray-50/80 p-1.5 space-y-1">
        {/* Row 1: History · Headings · Font family · Font size */}
        <div className="flex flex-wrap items-center gap-0.5">
          {/* History */}
          <ToolBtn
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo (Ctrl+Z)"
            disabled={!editor.can().undo()}
          >
            <Undo className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo (Ctrl+Y)"
            disabled={!editor.can().redo()}
          >
            <Redo className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* Headings */}
          <ToolBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* Font Family */}
          <Select
            value={currentFontFamily || "__default__"}
            onValueChange={(val) => {
              if (val === "__default__")
                editor.chain().focus().unsetFontFamily().run();
              else editor.chain().focus().setFontFamily(val).run();
            }}
          >
            <SelectTrigger className="h-7 w-[130px] text-xs border-gray-200 bg-white">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.label} value={f.value || "__default__"}>
                  <span style={{ fontFamily: f.value || "inherit" }}>
                    {f.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select
            value={String(currentFontSize)}
            onValueChange={(val) =>
              (editor.chain().focus() as any).setFontSize(val).run()
            }
          >
            <SelectTrigger className="h-7 w-[68px] text-xs border-gray-200 bg-white">
              <SelectValue placeholder="14" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Divider />

          {/* Text Color */}
          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Text color"
                className="flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100 cursor-pointer relative shrink-0"
              >
                <Type className="h-3.5 w-3.5" />
                <span
                  className="absolute bottom-0.5 left-1.5 right-1.5 h-[3px] rounded-full"
                  style={{ backgroundColor: currentColor || "#000" }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2.5">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Text Color
              </p>
              <div className="grid grid-cols-6 gap-1 mb-2">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setColorOpen(false);
                    }}
                    className="h-7 w-7 rounded border border-gray-200 transition-transform hover:scale-110 hover:shadow-md"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-700 w-full text-left border-t pt-1.5"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setColorOpen(false);
                }}
              >
                ✕ Reset color
              </button>
            </PopoverContent>
          </Popover>

          {/* Line Height */}
          <Select
            value="1.5"
            onValueChange={(val) =>
              (editor.chain().focus() as any).setLineHeight(val).run()
            }
          >
            <SelectTrigger
              className="h-7 w-[52px] text-xs border-gray-200 bg-white px-1.5"
              title="Line height"
            >
              <span className="text-xs">↕</span>
            </SelectTrigger>
            <SelectContent>
              {LINE_HEIGHTS.map((lh) => (
                <SelectItem key={lh} value={lh}>
                  {lh}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: Bold · Italic · Underline · Strike · Subscript · Superscript · Code · Alignment · Lists · Blockquote · Divider · Link · Image · Table · Variables */}
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Inline Code"
          >
            <Code className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            active={editor.isActive("subscript")}
            title="Subscript"
          >
            <SubscriptIcon className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            active={editor.isActive("superscript")}
            title="Superscript"
          >
            <SuperscriptIcon className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* Alignment */}
          <ToolBtn
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            active={editor.isActive({ textAlign: "justify" })}
            title="Justify"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          {/* Lists */}
          <ToolBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Ordered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive("taskList")}
            title="Task List"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </ToolBtn>

          <Divider />

          <ToolBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Blockquote"
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Divider"
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            title="Code Block"
          >
            <span className="text-xs font-mono font-bold">{"{}"}</span>
          </ToolBtn>

          <Divider />

          {/* Link */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Insert Link"
                className={`flex h-7 w-7 items-center justify-center rounded text-sm transition-colors shrink-0 cursor-pointer
                  ${editor.isActive("link") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Insert Link
              </p>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setLink()}
                className="text-sm mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={setLink} className="flex-1">
                  Insert
                </Button>
                {editor.isActive("link") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setLinkOpen(false);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Image */}
          <Popover open={imageOpen} onOpenChange={setImageOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Insert Image"
                className="flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100 cursor-pointer shrink-0"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Insert Image URL
              </p>
              <Input
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && insertImage()}
                className="text-sm mb-2"
                autoFocus
              />
              <Button size="sm" onClick={insertImage} className="w-full">
                Insert Image
              </Button>
            </PopoverContent>
          </Popover>

          {/* Table */}
          <Popover open={tableOpen} onOpenChange={setTableOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Insert Table"
                className={`flex h-7 w-7 items-center justify-center rounded text-sm transition-colors shrink-0 cursor-pointer ${editor.isActive("table") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Insert Table
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ["2×2", 2, 2],
                  ["2×3", 2, 3],
                  ["3×3", 3, 3],
                  ["3×4", 3, 4],
                  ["4×4", 4, 4],
                  ["5×5", 5, 5],
                ].map(([label, rows, cols]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => insertTable(Number(rows), Number(cols))}
                    className="text-xs border border-gray-200 rounded px-2 py-1.5 hover:bg-blue-50 hover:border-blue-300 transition-colors font-medium"
                  >
                    {String(label)}
                  </button>
                ))}
              </div>
              {editor.isActive("table") && (
                <div className="mt-2 pt-2 border-t space-y-1">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Table Actions
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      [
                        "Add Col →",
                        () => editor.chain().focus().addColumnAfter().run(),
                      ],
                      [
                        "Add Row ↓",
                        () => editor.chain().focus().addRowAfter().run(),
                      ],
                      [
                        "Del Col",
                        () => editor.chain().focus().deleteColumn().run(),
                      ],
                      [
                        "Del Row",
                        () => editor.chain().focus().deleteRow().run(),
                      ],
                      [
                        "Del Table",
                        () => editor.chain().focus().deleteTable().run(),
                      ],
                      [
                        "Merge Cells",
                        () => editor.chain().focus().mergeCells().run(),
                      ],
                    ].map(([label, action]) => (
                      <button
                        key={String(label)}
                        type="button"
                        onClick={action as () => void}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        {String(label)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Divider />

          {/* Variables */}
          <Popover open={varOpen} onOpenChange={setVarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Insert Variable"
                className="flex h-7 items-center gap-1 rounded px-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer shrink-0"
              >
                <Braces className="h-3 w-3" />
                Variables
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2.5">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Insert Dynamic Variable
              </p>
              <div className="space-y-0.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertVariable(v.token)}
                    className="w-full text-left rounded px-2 py-2 text-xs hover:bg-blue-50 flex items-center justify-between group transition-colors"
                  >
                    <span className="font-medium text-gray-700">{v.label}</span>
                    <code className="text-gray-400 group-hover:text-blue-600 text-xs font-mono">
                      {v.token}
                    </code>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400 border-t pt-2">
                Replaced with each contact's data at send time.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Bubble Menu ───────────────────────────────────────────────────── */}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 80, placement: "top" }}
        >
          <div className="flex bg-gray-900 rounded-lg shadow-2xl p-1 gap-0.5 border border-gray-700">
            {[
              {
                action: () => editor.chain().focus().toggleBold().run(),
                active: editor.isActive("bold"),
                icon: <Bold className="h-3.5 w-3.5" />,
                title: "Bold",
              },
              {
                action: () => editor.chain().focus().toggleItalic().run(),
                active: editor.isActive("italic"),
                icon: <Italic className="h-3.5 w-3.5" />,
                title: "Italic",
              },
              {
                action: () => editor.chain().focus().toggleUnderline().run(),
                active: editor.isActive("underline"),
                icon: <UnderlineIcon className="h-3.5 w-3.5" />,
                title: "Underline",
              },
              {
                action: () => editor.chain().focus().toggleStrike().run(),
                active: editor.isActive("strike"),
                icon: <Strikethrough className="h-3.5 w-3.5" />,
                title: "Strike",
              },
            ].map((btn, i) => (
              <button
                key={i}
                type="button"
                title={btn.title}
                onClick={btn.action}
                className={`h-7 w-7 flex items-center justify-center rounded text-xs transition-colors
                  ${btn.active ? "bg-blue-500 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
              >
                {btn.icon}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-700 mx-0.5 self-center" />
            <button
              type="button"
              onClick={() => {
                const url = window.prompt("Enter URL:");
                if (url)
                  editor
                    .chain()
                    .focus()
                    .setLink({
                      href: url.startsWith("http") ? url : `https://${url}`,
                    })
                    .run();
              }}
              className={`h-7 w-7 flex items-center justify-center rounded text-xs transition-colors
                ${editor.isActive("link") ? "bg-blue-500 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
              title="Link"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </BubbleMenu>
      )}

      {/* ── Editor Area ───────────────────────────────────────────────────── */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/80 flex items-center justify-between gap-4 text-xs text-gray-400">
        <span>
          Tip:{" "}
          <code className="text-blue-500 bg-blue-50 px-1 rounded text-xs">
            {"{first_name}"}
          </code>{" "}
          personalises each email
        </span>
        <div className="flex items-center gap-3">
          <span>
            {editor?.storage?.characterCount?.characters?.() ??
              editor?.getText().length ??
              0}{" "}
            chars
          </span>
          <span>
            {editor?.storage?.characterCount?.words?.() ??
              editor?.getText().split(/\s+/).filter(Boolean).length ??
              0}{" "}
            words
          </span>
        </div>
      </div>
    </div>
  );
}
