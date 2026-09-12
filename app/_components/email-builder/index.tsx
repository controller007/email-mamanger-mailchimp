"use client";
/**
 * VisualEmailBuilder — main orchestrator component.
 *
 * Split into sub-components for maintainability:
 *   - Sidebar           (left panel: block catalogue + variables)
 *   - BuilderCanvas     (centre: drag-drop, block selection)
 *   - CanvasBlock       (renders each block type with accurate inline styles)
 *   - PropertiesPanel   (right panel: per-block + global settings)
 *   - PreviewModal      (full HTML preview in iframe)
 *   - RichTextEditor    (mini WYSIWYG for text content)
 *
 * Props:
 *   initialBlocks  – pre-loaded block state (for editing existing templates)
 *   templateName   – initial name shown in the top bar
 *   onSave(html, designJson, name) – called when "Save Template" is clicked
 *   onBack()       – called when "← Back" is clicked
 */
import React, { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Save, Eye, LayoutTemplate } from "lucide-react";
import type {
  EmailBlock,
  GlobalSettings,
  BlockType,
  DesignJson,
} from "./types";
import { DEFAULT_GS } from "./types";
import { defaultBlock, makeId } from "./lib/block-defaults";
import { buildEmailHtml } from "./lib/html-exports";
import { BuilderCanvas } from "./components/builder-canvas";
import { Sidebar } from "./components/sidebar";
import { PreviewModal } from "./components/preview-modal";
import { PropertiesPanel } from "./components/preoperties-panel";

export type { BlockType, EmailBlock, GlobalSettings, DesignJson };
export { buildEmailHtml };

interface VisualEmailBuilderProps {
  initialBlocks?: EmailBlock[];
  initialDesignJson?: string | null;
  templateName?: string;
  onSave: (html: string, designJson: string, name: string) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export default function VisualEmailBuilder({
  initialBlocks,
  initialDesignJson,
  templateName = "Untitled Template",
  onSave,
  onBack,
  isSaving = false,
}: VisualEmailBuilderProps) {
  // Parse design JSON if provided
  const parsedDesign: DesignJson | null = (() => {
    if (initialDesignJson) {
      try {
        return JSON.parse(initialDesignJson);
      } catch {
        return null;
      }
    }
    return null;
  })();

  const [blocks, setBlocks] = useState<EmailBlock[]>(
    parsedDesign?.blocks ?? initialBlocks ?? [],
  );
  const [gs, setGs] = useState<GlobalSettings>(
    parsedDesign?.globalSettings ?? DEFAULT_GS,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState(templateName);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  // ── Block operations ──────────────────────────────────────────────────────

  const addBlock = useCallback((type: BlockType, insertAt?: number) => {
    const block = defaultBlock(type);
    setBlocks((prev) => {
      if (insertAt !== undefined && insertAt >= 0) {
        const next = [...prev];
        // insertAt = index of block to insert AFTER (zone 0 = before all = insertAt -1)
        next.splice(insertAt + 1, 0, block);
        return next;
      }
      return [...prev, block];
    });
    setSelectedId(block.id);
    // Scroll new block into view
    setTimeout(() => {
      document
        .getElementById(`block-${block.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, []);

  /**
   * addBlockAtZone: called from canvas drop zones.
   * zoneIdx is the exact splice position:
   *   0 = prepend (before all), N = insert at position N (after block N-1)
   * undefined = append to end
   */
  const addBlockAtZone = useCallback((type: BlockType, zoneIdx?: number) => {
    const block = defaultBlock(type);
    setBlocks((prev) => {
      const next = [...prev];
      if (zoneIdx !== undefined && zoneIdx !== null && zoneIdx >= 0) {
        next.splice(zoneIdx, 0, block);
      } else {
        next.push(block);
      }
      return next;
    });
    setSelectedId(block.id);
    setTimeout(() => {
      document
        .getElementById(`block-${block.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, []);

  const updateBlock = useCallback((updated: EmailBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const clone = { ...prev[idx], id: makeId() } as EmailBlock;
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      setSelectedId(clone.id);
      return next;
    });
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  const reorderBlocks = useCallback((fromIdx: number, toIdx: number) => {
    setBlocks((prev) => {
      if (fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const html = buildEmailHtml(blocks, gs);
    const designJson: DesignJson = { blocks, globalSettings: gs, version: 2 };
    onSave(html, JSON.stringify(designJson), name);
  };

  // ── Sidebar drag start (forwarded to canvas) ──────────────────────────────
  const handleSidebarDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData("blockType", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const previewHtml = previewOpen ? buildEmailHtml(blocks, gs) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-50"
      style={{ fontFamily: "system-ui,sans-serif" }}
    >
      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1.5 rounded hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <LayoutTemplate className="h-4 w-4 text-blue-600 shrink-0" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm font-semibold text-gray-900 border-none outline-none bg-transparent focus:bg-gray-50 rounded px-2 py-1 min-w-[180px] max-w-xs"
            placeholder="Template name..."
          />
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
            {blocks.length} block{blocks.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            disabled={blocks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || blocks.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Template
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <Sidebar onAddBlock={addBlock} onDragStart={handleSidebarDragStart} />

        {/* CENTRE CANVAS */}
        <BuilderCanvas
          blocks={blocks}
          gs={gs}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onAddBlock={addBlockAtZone}
          onMoveBlock={moveBlock}
          onDuplicateBlock={duplicateBlock}
          onDeleteBlock={deleteBlock}
          onReorder={reorderBlocks}
        />

        {/* RIGHT PROPERTIES PANEL */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">
              {selectedBlock
                ? `Edit: ${selectedBlock.type.replace(/-/g, " ")}`
                : "Global Settings"}
            </h3>
            {selectedBlock && (
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Global
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <PropertiesPanel
              block={selectedBlock}
              onChange={updateBlock}
              gs={gs}
              onGsChange={setGs}
            />
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={previewHtml}
      />
    </div>
  );
}
