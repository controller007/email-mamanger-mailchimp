"use client";
import React, { useState } from "react";
import { AlignLeft, AlignCenter, AlignRight, Braces } from "lucide-react";
import { VARIABLES } from "../types";
import { RichTextEditor } from "./rich-text-editor";

// ── ColorInput ────────────────────────────────────────────────────────────────
export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 font-mono"
        />
      </div>
    </div>
  );
}

// ── SliderInput ───────────────────────────────────────────────────────────────
export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <label className="text-xs text-gray-500 font-medium">{label}</label>
        <span className="text-xs font-mono text-gray-600">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-blue-600"
      />
    </div>
  );
}

// ── TextInput ─────────────────────────────────────────────────────────────────
export function TextInput({
  label,
  value,
  onChange,
  multiline = false,
  placeholder = "",
  richText = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  richText?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      {richText ? (
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

// ── AlignButtons ──────────────────────────────────────────────────────────────
export function AlignButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "left" | "center" | "right") => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">Alignment</label>
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <button
            key={a}
            onClick={() => onChange(a)}
            className={`flex-1 py-1.5 rounded text-xs font-medium border ${value === a ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
          >
            {a === "left" ? (
              <AlignLeft className="h-3.5 w-3.5 mx-auto" />
            ) : a === "center" ? (
              <AlignCenter className="h-3.5 w-3.5 mx-auto" />
            ) : (
              <AlignRight className="h-3.5 w-3.5 mx-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── VariableInsertButtons ─────────────────────────────────────────────────────
export function VariableInsertButtons({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs font-medium text-blue-700"
        >
          <Braces className="h-3 w-3" /> Insert Variable
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                onClick={() => {
                  onInsert(v.token);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="font-medium text-gray-700">{v.label}</span>
                <code className="text-gray-400 font-mono">{v.token}</code>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-2">
      {children}
    </p>
  );
}
