"use client";
/**
 * RichTextEditor — mini inline rich text editor with Bold/Italic/Underline/Strikethrough/Link.
 * Uses contentEditable + execCommand for simplicity (good enough for email builder).
 * Stores HTML string in state and calls onChange(html) on every input.
 */
import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

interface RichTextEditorProps {
  value: string; // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  minHeight = 80,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const savedSelection = useRef<Range | null>(null);

  // Sync external value → DOM (only when not typing)
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange]);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML || "");
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedSelection.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
  };

  const insertLink = () => {
    restoreSelection();
    if (linkUrl) exec("createLink", linkUrl);
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const btnClass =
    "p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-blue-500">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}
          className={btnClass}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}
          className={btnClass}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("underline")}
          className={btnClass}
          title="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("strikeThrough")}
          className={btnClass}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyLeft")}
          className={btnClass}
          title="Align Left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyCenter")}
          className={btnClass}
          title="Center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyRight")}
          className={btnClass}
          title="Align Right"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
          }}
          onClick={() => setShowLinkInput((v) => !v)}
          className={btnClass}
          title="Insert Link"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div className="flex gap-1 px-2 py-1.5 bg-blue-50 border-b border-blue-200">
          <input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && insertLink()}
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="button"
            onClick={insertLink}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="px-3 py-2 text-sm text-gray-800 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />
    </div>
  );
}
