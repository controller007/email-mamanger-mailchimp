"use client";
import React, { useState } from "react";
import {
  LayoutTemplate,
  Star,
  Columns,
  AtSign,
  Type,
  AlignLeft,
  CheckSquare,
  Quote,
  Code,
  Table,
  Image as ImageIcon,
  Zap,
  Video,
  Share2,
  BarChart2,
  Gift,
  Minus,
  ChevronDown,
  Copy,
  Braces,
} from "lucide-react";
import type { BlockType } from "../types";
import { VARIABLES } from "../types";
import { BLOCK_CATALOGUE } from "../lib/bloack-catalogue";

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutTemplate: <LayoutTemplate className="h-4 w-4" />,
  Star: <Star className="h-4 w-4" />,
  Columns: <Columns className="h-4 w-4" />,
  AtSign: <AtSign className="h-4 w-4" />,
  Type: <Type className="h-4 w-4" />,
  AlignLeft: <AlignLeft className="h-4 w-4" />,
  CheckSquare: <CheckSquare className="h-4 w-4" />,
  Quote: <Quote className="h-4 w-4" />,
  Code: <Code className="h-4 w-4" />,
  Table: <Table className="h-4 w-4" />,
  Image: <ImageIcon className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Video: <Video className="h-4 w-4" />,
  Share2: <Share2 className="h-4 w-4" />,
  BarChart2: <BarChart2 className="h-4 w-4" />,
  Gift: <Gift className="h-4 w-4" />,
  Minus: <Minus className="h-4 w-4" />,
  ChevronDown: <ChevronDown className="h-4 w-4" />,
};

interface SidebarProps {
  onAddBlock: (type: BlockType) => void;
  onDragStart: (e: React.DragEvent, type: BlockType) => void;
}

export function Sidebar({ onAddBlock, onDragStart }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"blocks" | "variables">("blocks");
  const [search, setSearch] = useState("");

  const filtered = BLOCK_CATALOGUE.map((cat) => ({
    ...cat,
    blocks: cat.blocks.filter(
      (b) =>
        !search ||
        b.label.toLowerCase().includes(search.toLowerCase()) ||
        b.desc.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.blocks.length > 0);

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0">
        {(["blocks", "variables"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${activeTab === tab ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "blocks" && (
        <>
          <div className="p-2 border-b border-gray-100 shrink-0">
            <input
              type="text"
              placeholder="Search blocks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {filtered.map((cat) => (
              <div key={cat.category}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
                  {cat.category}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {cat.blocks.map((b) => (
                    <div
                      key={b.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, b.type)}
                      onClick={() => onAddBlock(b.type)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all group text-center"
                      title={b.desc}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
                        {ICON_MAP[b.iconName] || <Zap className="h-4 w-4" />}
                      </div>
                      <span className="text-[10px] font-medium text-gray-600 group-hover:text-blue-700 leading-tight">
                        {b.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "variables" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Click a variable to copy it, then paste it into any text field.
          </p>
          {VARIABLES.map((v) => (
            <button
              key={v.token}
              onClick={() => navigator.clipboard?.writeText(v.token)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-700">
                  {v.label}
                </span>
                <Copy className="h-3 w-3 text-gray-300 group-hover:text-blue-500" />
              </div>
              <code className="text-[11px] text-blue-600 font-mono">
                {v.token}
              </code>
              <p className="text-[10px] text-gray-400 mt-0.5">
                e.g. {v.example}
              </p>
            </button>
          ))}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-[11px] text-amber-700 font-medium mb-1">
              💡 How to use
            </p>
            <p className="text-[11px] text-amber-600">
              Copy a token and paste it into any text field. Each recipient will
              see their own data when the email is sent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
