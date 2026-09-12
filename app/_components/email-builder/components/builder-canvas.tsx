"use client";
/**
 * BuilderCanvas — the centre drag-drop area.
 *
 * Key fixes vs original:
 * 1. Drag from sidebar uses a stable "dragType" ref so drops on existing blocks work.
 * 2. Drop zones are separate divs between blocks (not on the block itself), avoiding double-drop.
 * 3. First-block double-drop was caused by two overlapping onDrop handlers — fixed by a single unified zone when empty.
 * 4. Block reorder drag uses separate data key "reorderIdx" so it never conflicts with sidebar drags.
 */
import React, { useRef, useCallback, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  GripVertical,
  Plus,
} from "lucide-react";
import type { EmailBlock, GlobalSettings, BlockType } from "../types";
import { CanvasBlock } from "./canvas-block";

interface BuilderCanvasProps {
  blocks: EmailBlock[];
  gs: GlobalSettings;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddBlock: (type: BlockType, insertAt?: number) => void;
  onMoveBlock: (id: string, dir: -1 | 1) => void;
  onDuplicateBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

/** Helper: returns "blockType" or "reorderIdx" from the drag event */
function getDragData(e: React.DragEvent): {
  blockType?: BlockType;
  reorderIdx?: number;
} {
  const bt = e.dataTransfer.getData("blockType") as BlockType;
  const ri = e.dataTransfer.getData("reorderIdx");
  return {
    blockType: bt || undefined,
    reorderIdx: ri !== "" && ri !== undefined ? Number(ri) : undefined,
  };
}

const QUICK_ADD: { type: BlockType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "button", label: "Button" },
  { type: "image", label: "Image" },
  { type: "divider", label: "Divider" },
  { type: "spacer", label: "Spacer" },
];

export function BuilderCanvas({
  blocks,
  gs,
  selectedId,
  onSelect,
  onAddBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onReorder,
}: BuilderCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // draggingOver: index of the drop zone to highlight.
  // Drop zone index N means "insert after block N-1" (i.e., before block N).
  // So zone 0 = before all blocks, zone N = after all blocks.
  const [draggingOver, setDraggingOver] = useState<number | null>(null);
  const [reorderingIdx, setReorderingIdx] = useState<number | null>(null);

  // ── Sidebar drag start ────────────────────────────────────────────────────
  const handleSidebarItemDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData("blockType", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  // ── Block reorder drag start ──────────────────────────────────────────────
  const handleBlockDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("reorderIdx", String(idx));
    e.dataTransfer.effectAllowed = "move";
    setReorderingIdx(idx);
  };

  // ── Drop zone drag over ───────────────────────────────────────────────────
  const handleDropZoneDragOver = (e: React.DragEvent, zoneIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect =
      e.dataTransfer.getData("reorderIdx") !== "" ? "move" : "copy";
    setDraggingOver(zoneIdx);
  };

  // ── Drop on a zone ────────────────────────────────────────────────────────
  const handleDropZoneDrop = (e: React.DragEvent, zoneIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(null);
    setReorderingIdx(null);

    const blockType = e.dataTransfer.getData("blockType") as BlockType;
    const reorderIdxStr = e.dataTransfer.getData("reorderIdx");

    if (blockType) {
      // zoneIdx is the exact splice position: 0 = prepend, N = insert after block N-1
      onAddBlock(blockType, zoneIdx);
    } else if (reorderIdxStr !== "") {
      const fromIdx = Number(reorderIdxStr);
      if (!isNaN(fromIdx)) {
        // zoneIdx is the position to insert *before*
        // After removing fromIdx, target slot shifts if fromIdx < zoneIdx
        let toIdx = zoneIdx;
        if (fromIdx < toIdx) toIdx -= 1;
        if (fromIdx !== toIdx) onReorder(fromIdx, toIdx);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the canvas entirely
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setDraggingOver(null);
    }
  };

  const isHighlighted = (zoneIdx: number) => draggingOver === zoneIdx;

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-y-auto bg-gray-100"
      onClick={(e) => {
        if (e.target === canvasRef.current) onSelect(null);
      }}
      onDragLeave={handleDragLeave}
    >
      <div className="max-w-[700px] mx-auto py-8 px-4">
        {/* Email container */}
        <div
          className="shadow-xl rounded-xl overflow-hidden"
          style={{ background: gs.emailBgColor }}
        >
          <div
            style={{
              maxWidth: gs.contentWidth,
              margin: "0 auto",
              background: gs.contentBgColor,
            }}
          >
            {/* Empty state */}
            {blocks.length === 0 && (
              <div
                className={`flex flex-col items-center justify-center py-24 text-center transition-colors ${draggingOver !== null ? "bg-blue-50" : ""}`}
                onDragOver={(e) => handleDropZoneDragOver(e, 0)}
                onDrop={(e) => handleDropZoneDrop(e, 0)}
              >
                <div
                  className={`w-16 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center mb-4 transition-colors ${draggingOver !== null ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
                >
                  <Plus
                    className={`h-7 w-7 ${draggingOver !== null ? "text-blue-400" : "text-gray-300"}`}
                  />
                </div>
                <p className="text-sm font-semibold text-gray-500">
                  Drag blocks here or click from the sidebar
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Start building your email template
                </p>
                <div className="flex gap-2 mt-6 flex-wrap justify-center">
                  {[
                    { type: "header" as BlockType, label: "Header" },
                    { type: "hero" as BlockType, label: "Hero" },
                    { type: "text" as BlockType, label: "Text" },
                    { type: "footer" as BlockType, label: "Footer" },
                  ].map((b) => (
                    <button
                      key={b.type}
                      onClick={() => onAddBlock(b.type)}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      + {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {blocks.length > 0 && (
              <>
                {/* Drop zone BEFORE first block (zone index 0) */}
                <DropZone
                  zoneIdx={0}
                  highlighted={isHighlighted(0)}
                  onDragOver={handleDropZoneDragOver}
                  onDrop={handleDropZoneDrop}
                />

                {blocks.map((block, idx) => {
                  const isSelected = selectedId === block.id;
                  const isDragging = reorderingIdx === idx;
                  return (
                    <React.Fragment key={block.id}>
                      {/* Block wrapper */}
                      <div
                        id={`block-${block.id}`}
                        className={`relative group cursor-pointer transition-all duration-100 ${isSelected ? "ring-2 ring-blue-500 ring-inset" : "hover:ring-1 hover:ring-blue-300 hover:ring-inset"} ${isDragging ? "opacity-40" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(block.id);
                        }}
                        draggable
                        onDragStart={(e) => handleBlockDragStart(e, idx)}
                        onDragEnd={() => {
                          setReorderingIdx(null);
                          setDraggingOver(null);
                        }}
                      >
                        {/* Selection label */}
                        {isSelected && (
                          <div className="absolute -top-5 left-0 z-20 flex items-center gap-1 pointer-events-none">
                            <span className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-t capitalize">
                              {block.type.replace(/-/g, " ")}
                            </span>
                          </div>
                        )}

                        {/* Floating toolbar (visible on hover) */}
                        <div className="absolute right-1 top-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <div className="flex bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveBlock(block.id, -1);
                              }}
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                              title="Move up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveBlock(block.id, 1);
                              }}
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                              title="Move down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <div className="w-px bg-gray-200" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateBlock(block.id);
                              }}
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                              title="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <div className="w-px bg-gray-200" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteBlock(block.id);
                              }}
                              className="p-1.5 hover:bg-red-50 text-gray-500 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div
                            className="bg-white border border-gray-200 rounded-lg shadow-md p-1.5 cursor-grab ml-0.5"
                            title="Drag to reorder"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                          </div>
                        </div>

                        {/* The actual block content */}
                        <CanvasBlock block={block} gs={gs} />
                      </div>

                      {/* Drop zone AFTER each block (zone index = idx + 1) */}
                      <DropZone
                        zoneIdx={idx + 1}
                        highlighted={isHighlighted(idx + 1)}
                        onDragOver={handleDropZoneDragOver}
                        onDrop={handleDropZoneDrop}
                      />
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Quick-add bar below canvas */}
        {blocks.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            <span className="text-xs text-gray-400">Quick add:</span>
            {QUICK_ADD.map((b) => (
              <button
                key={b.type}
                onClick={() => onAddBlock(b.type)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm"
              >
                + {b.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── DropZone ──────────────────────────────────────────────────────────────────
function DropZone({
  zoneIdx,
  highlighted,
  onDragOver,
  onDrop,
}: {
  zoneIdx: number;
  highlighted: boolean;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
}) {
  return (
    <div
      className={`transition-all duration-150 mx-1 rounded ${highlighted ? "h-8 bg-blue-100 border-2 border-dashed border-blue-400 flex items-center justify-center" : "h-1.5"}`}
      onDragOver={(e) => onDragOver(e, zoneIdx)}
      onDrop={(e) => onDrop(e, zoneIdx)}
    >
      {highlighted && (
        <span className="text-[10px] text-blue-500 font-medium">Drop here</span>
      )}
    </div>
  );
}
