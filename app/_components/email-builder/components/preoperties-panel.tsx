"use client";
import React from "react";
import { X } from "lucide-react";
import type {
  EmailBlock,
  GlobalSettings,
  HeaderBlock,
  HeroBlock,
  TextBlock,
  HeadingBlock,
  ButtonBlock,
  ImageBlock,
  DividerBlock,
  SpacerBlock,
  TwoColumnBlock,
  ThreeColumnBlock,
  BulletListBlock,
  NumberedListBlock,
  QuoteBlock,
  SocialBlock,
  FooterBlock,
  FeatureRowBlock,
  StatsRowBlock,
  TestimonialBlock,
  CodeBlockBlock,
  VideoPreviewBlock,
  ProductCardBlock,
  CountdownBlock,
  SignatureBlock,
  TableBlock,
} from "../types";
import {
  ColorInput,
  SliderInput,
  TextInput,
  AlignButtons,
  VariableInsertButtons,
  SectionLabel,
} from "./property-inputs";

interface PropertiesPanelProps {
  block: EmailBlock | null;
  onChange: (updated: EmailBlock) => void;
  gs: GlobalSettings;
  onGsChange: (updated: GlobalSettings) => void;
}

export function PropertiesPanel({
  block,
  onChange,
  gs,
  onGsChange,
}: PropertiesPanelProps) {
  if (!block) {
    return (
      <div className="p-4 space-y-4">
        <SectionLabel>Global Settings</SectionLabel>
        <ColorInput
          label="Email Background"
          value={gs.emailBgColor}
          onChange={(v) => onGsChange({ ...gs, emailBgColor: v })}
        />
        <ColorInput
          label="Content Background"
          value={gs.contentBgColor}
          onChange={(v) => onGsChange({ ...gs, contentBgColor: v })}
        />
        <SliderInput
          label="Content Width"
          value={gs.contentWidth}
          onChange={(v) => onGsChange({ ...gs, contentWidth: v })}
          min={480}
          max={700}
          step={10}
          unit="px"
        />
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">
            Font Family
          </label>
          <select
            value={gs.fontFamily}
            onChange={(e) => onGsChange({ ...gs, fontFamily: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
          >
            {[
              "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
              "Georgia,serif",
              "'Times New Roman',serif",
              "Arial,sans-serif",
              "Verdana,sans-serif",
              "Helvetica,sans-serif",
            ].map((f) => (
              <option key={f} value={f}>
                {f.split(",")[0].replace(/'/g, "")}
              </option>
            ))}
          </select>
        </div>
        <ColorInput
          label="Default Text Color"
          value={gs.defaultTextColor}
          onChange={(v) => onGsChange({ ...gs, defaultTextColor: v })}
        />
        <SliderInput
          label="Default Font Size"
          value={gs.defaultFontSize}
          onChange={(v) => onGsChange({ ...gs, defaultFontSize: v })}
          min={12}
          max={20}
          unit="px"
        />
      </div>
    );
  }

  const update = (changes: Partial<EmailBlock>) =>
    onChange({ ...block, ...changes } as EmailBlock);

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>{block.type.replace(/-/g, " ")} Settings</SectionLabel>

      {/* ── HEADER ── */}
      {block.type === "header" &&
        (() => {
          const b = block as HeaderBlock;
          return (
            <>
              <TextInput
                label="Brand Name"
                value={b.brandName}
                onChange={(v) => update({ brandName: v })}
              />
              <TextInput
                label="Logo URL (optional)"
                value={b.logoUrl}
                onChange={(v) => update({ logoUrl: v })}
                placeholder="https://..."
              />
              <SliderInput
                label="Logo Width"
                value={b.logoWidth}
                onChange={(v) => update({ logoWidth: v })}
                min={60}
                max={260}
                unit="px"
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text / Logo Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {/* ── HERO ── */}
      {block.type === "hero" &&
        (() => {
          const b = block as HeroBlock;
          return (
            <>
              <TextInput
                label="Heading"
                value={b.heading}
                onChange={(v) => update({ heading: v })}
                multiline
                richText
              />
              <VariableInsertButtons
                onInsert={(t) => update({ heading: b.heading + t })}
              />
              <TextInput
                label="Subtext"
                value={b.subtext}
                onChange={(v) => update({ subtext: v })}
                multiline
                richText
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
              <SliderInput
                label="Padding (top/bottom)"
                value={b.paddingY}
                onChange={(v) => update({ paddingY: v })}
                min={16}
                max={96}
                unit="px"
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.showButton}
                  onChange={(e) => update({ showButton: e.target.checked })}
                  className="rounded"
                />
                Show CTA Button
              </label>
              {b.showButton && (
                <>
                  <TextInput
                    label="Button Label"
                    value={b.btnLabel}
                    onChange={(v) => update({ btnLabel: v })}
                  />
                  <TextInput
                    label="Button URL"
                    value={b.btnUrl}
                    onChange={(v) => update({ btnUrl: v })}
                  />
                  <ColorInput
                    label="Button Background"
                    value={b.btnBg}
                    onChange={(v) => update({ btnBg: v })}
                  />
                  <ColorInput
                    label="Button Text"
                    value={b.btnTextColor}
                    onChange={(v) => update({ btnTextColor: v })}
                  />
                  <SliderInput
                    label="Border Radius"
                    value={b.btnRadius}
                    onChange={(v) => update({ btnRadius: v })}
                    min={0}
                    max={40}
                    unit="px"
                  />
                </>
              )}
            </>
          );
        })()}

      {/* ── TEXT ── */}
      {block.type === "text" &&
        (() => {
          const b = block as TextBlock;
          return (
            <>
              <TextInput
                label="Content"
                value={b.content}
                onChange={(v) => update({ content: v })}
                multiline
                richText
                placeholder="Start typing..."
              />
              <VariableInsertButtons
                onInsert={(t) => update({ content: b.content + t })}
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={11}
                max={26}
                unit="px"
              />
              <SliderInput
                label="Line Height"
                value={b.lineHeight}
                onChange={(v) => update({ lineHeight: v })}
                min={1.0}
                max={3.0}
                step={0.1}
              />
              <ColorInput
                label="Text Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <SliderInput
                label="Padding (top/bottom)"
                value={b.paddingY}
                onChange={(v) => update({ paddingY: v })}
                min={0}
                max={64}
                unit="px"
              />
            </>
          );
        })()}

      {/* ── HEADING ── */}
      {block.type === "heading" &&
        (() => {
          const b = block as HeadingBlock;
          return (
            <>
              <TextInput
                label="Heading Text"
                value={b.content}
                onChange={(v) => update({ content: v })}
              />
              <VariableInsertButtons
                onInsert={(t) => update({ content: b.content + t })}
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Heading Level
                </label>
                <div className="flex gap-1">
                  {([1, 2, 3] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => update({ level: l })}
                      className={`flex-1 py-1.5 rounded text-xs font-bold border ${b.level === l ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                    >
                      H{l}
                    </button>
                  ))}
                </div>
              </div>
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <SliderInput
                label="Padding (top/bottom)"
                value={b.paddingY}
                onChange={(v) => update({ paddingY: v })}
                min={0}
                max={48}
                unit="px"
              />
            </>
          );
        })()}

      {/* ── BUTTON ── */}
      {block.type === "button" &&
        (() => {
          const b = block as ButtonBlock;
          return (
            <>
              <TextInput
                label="Button Label"
                value={b.label}
                onChange={(v) => update({ label: v })}
              />
              <TextInput
                label="URL"
                value={b.url}
                onChange={(v) => update({ url: v })}
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={12}
                max={22}
                unit="px"
              />
              <SliderInput
                label="Border Radius"
                value={b.radius}
                onChange={(v) => update({ radius: v })}
                min={0}
                max={40}
                unit="px"
              />
              <SliderInput
                label="Padding X"
                value={b.paddingX}
                onChange={(v) => update({ paddingX: v })}
                min={8}
                max={64}
                unit="px"
              />
              <SliderInput
                label="Padding Y"
                value={b.paddingY}
                onChange={(v) => update({ paddingY: v })}
                min={6}
                max={32}
                unit="px"
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.fullWidth}
                  onChange={(e) => update({ fullWidth: e.target.checked })}
                  className="rounded"
                />
                Full Width Button
              </label>
            </>
          );
        })()}

      {/* ── IMAGE ── */}
      {block.type === "image" &&
        (() => {
          const b = block as ImageBlock;
          return (
            <>
              <TextInput
                label="Image URL"
                value={b.src}
                onChange={(v) => update({ src: v })}
                placeholder="https://..."
              />
              <TextInput
                label="Alt Text"
                value={b.alt}
                onChange={(v) => update({ alt: v })}
              />
              <TextInput
                label="Link URL (optional)"
                value={b.linkUrl}
                onChange={(v) => update({ linkUrl: v })}
                placeholder="https://..."
              />
              <SliderInput
                label="Width"
                value={b.width}
                onChange={(v) => update({ width: v })}
                min={20}
                max={100}
                unit="%"
              />
              <SliderInput
                label="Border Radius"
                value={b.borderRadius}
                onChange={(v) => update({ borderRadius: v })}
                min={0}
                max={40}
                unit="px"
              />
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {/* ── DIVIDER ── */}
      {block.type === "divider" &&
        (() => {
          const b = block as DividerBlock;
          return (
            <>
              <ColorInput
                label="Line Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <SliderInput
                label="Thickness"
                value={b.thickness}
                onChange={(v) => update({ thickness: v })}
                min={1}
                max={8}
                unit="px"
              />
              <SliderInput
                label="Margin (top/bottom)"
                value={b.marginY}
                onChange={(v) => update({ marginY: v })}
                min={4}
                max={64}
                unit="px"
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Line Style
                </label>
                <div className="flex gap-1">
                  {(["solid", "dashed", "dotted"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => update({ style: s })}
                      className={`flex-1 py-1.5 rounded text-xs font-medium border ${b.style === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

      {/* ── SPACER ── */}
      {block.type === "spacer" &&
        (() => {
          const b = block as SpacerBlock;
          return (
            <>
              <SliderInput
                label="Height"
                value={b.height}
                onChange={(v) => update({ height: v })}
                min={8}
                max={120}
                unit="px"
              />
              <ColorInput
                label="Background"
                value={b.bgColor || "transparent"}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {/* ── TWO COLUMN ── */}
      {block.type === "two-column" &&
        (() => {
          const b = block as TwoColumnBlock;
          return (
            <>
              <TextInput
                label="Left Column Content"
                value={b.leftContent}
                onChange={(v) => update({ leftContent: v })}
                multiline
                richText
              />
              <VariableInsertButtons
                onInsert={(t) => update({ leftContent: b.leftContent + t })}
              />
              <TextInput
                label="Right Column Content"
                value={b.rightContent}
                onChange={(v) => update({ rightContent: v })}
                multiline
                richText
              />
              <VariableInsertButtons
                onInsert={(t) => update({ rightContent: b.rightContent + t })}
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Column Ratio
                </label>
                <select
                  value={b.ratio}
                  onChange={(e) => update({ ratio: e.target.value as any })}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                >
                  {["50-50", "60-40", "40-60", "70-30", "30-70"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Left Column Background"
                value={b.leftBg}
                onChange={(v) => update({ leftBg: v })}
              />
              <ColorInput
                label="Right Column Background"
                value={b.rightBg}
                onChange={(v) => update({ rightBg: v })}
              />
              <SliderInput
                label="Gap"
                value={b.gap}
                onChange={(v) => update({ gap: v })}
                min={0}
                max={48}
                unit="px"
              />
            </>
          );
        })()}

      {/* ── THREE COLUMN ── */}
      {block.type === "three-column" &&
        (() => {
          const b = block as ThreeColumnBlock;
          return (
            <>
              <TextInput
                label="Column 1"
                value={b.col1}
                onChange={(v) => update({ col1: v })}
                multiline
                richText
              />
              <TextInput
                label="Column 2"
                value={b.col2}
                onChange={(v) => update({ col2: v })}
                multiline
                richText
              />
              <TextInput
                label="Column 3"
                value={b.col3}
                onChange={(v) => update({ col3: v })}
                multiline
                richText
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <SliderInput
                label="Gap"
                value={b.gap}
                onChange={(v) => update({ gap: v })}
                min={0}
                max={48}
                unit="px"
              />
            </>
          );
        })()}

      {/* ── BULLET LIST ── */}
      {block.type === "bullet-list" &&
        (() => {
          const b = block as BulletListBlock;
          return (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  List Items
                </label>
                {b.items.map((item, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const items = [...b.items];
                        items[i] = e.target.value;
                        update({ items });
                      }}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
                    />
                    <button
                      onClick={() =>
                        update({ items: b.items.filter((_, j) => j !== i) })
                      }
                      className="text-red-400 hover:text-red-600 px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => update({ items: [...b.items, "New item"] })}
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add item
                </button>
              </div>
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={11}
                max={22}
                unit="px"
              />
              <SliderInput
                label="Line Height"
                value={b.lineHeight}
                onChange={(v) => update({ lineHeight: v })}
                min={1.2}
                max={3.0}
                step={0.1}
              />
              <ColorInput
                label="Text Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {/* ── NUMBERED LIST ── */}
      {block.type === "numbered-list" &&
        (() => {
          const b = block as NumberedListBlock;
          return (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  List Items
                </label>
                {b.items.map((item, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const items = [...b.items];
                        items[i] = e.target.value;
                        update({ items });
                      }}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
                    />
                    <button
                      onClick={() =>
                        update({ items: b.items.filter((_, j) => j !== i) })
                      }
                      className="text-red-400 hover:text-red-600 px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => update({ items: [...b.items, "New step"] })}
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add item
                </button>
              </div>
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={11}
                max={22}
                unit="px"
              />
              <ColorInput
                label="Text Color"
                value={b.color}
                onChange={(v) => update({ color: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {/* ── QUOTE ── */}
      {block.type === "quote" &&
        (() => {
          const b = block as QuoteBlock;
          return (
            <>
              <TextInput
                label="Quote Text"
                value={b.content}
                onChange={(v) => update({ content: v })}
                multiline
                richText
              />
              <VariableInsertButtons
                onInsert={(t) => update({ content: b.content + t })}
              />
              <TextInput
                label="Author"
                value={b.author}
                onChange={(v) => update({ author: v })}
              />
              <SliderInput
                label="Font Size"
                value={b.fontSize}
                onChange={(v) => update({ fontSize: v })}
                min={12}
                max={24}
                unit="px"
              />
              <ColorInput
                label="Border Accent"
                value={b.borderColor}
                onChange={(v) => update({ borderColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {/* ── SOCIAL ── */}
      {block.type === "social" &&
        (() => {
          const b = block as SocialBlock;
          return (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Social Links
                </label>
                {b.links.map((l, i) => (
                  <div
                    key={i}
                    className="space-y-1 border border-gray-100 rounded p-2"
                  >
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Platform"
                        value={l.platform}
                        onChange={(e) => {
                          const links = [...b.links];
                          links[i] = { ...l, platform: e.target.value };
                          update({ links });
                        }}
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
                      />
                      <button
                        onClick={() =>
                          update({ links: b.links.filter((_, j) => j !== i) })
                        }
                        className="text-red-400 hover:text-red-600 px-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={l.url}
                      onChange={(e) => {
                        const links = [...b.links];
                        links[i] = { ...l, url: e.target.value };
                        update({ links });
                      }}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                    />
                    <input
                      type="text"
                      placeholder="Label"
                      value={l.label}
                      onChange={(e) => {
                        const links = [...b.links];
                        links[i] = { ...l, label: e.target.value };
                        update({ links });
                      }}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                    />
                  </div>
                ))}
                <button
                  onClick={() =>
                    update({
                      links: [
                        ...b.links,
                        { platform: "Platform", url: "#", label: "Platform" },
                      ],
                    })
                  }
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add link
                </button>
              </div>
              <AlignButtons
                value={b.alignment}
                onChange={(v) => update({ alignment: v })}
              />
              <ColorInput
                label="Text/Icon Color"
                value={b.iconColor}
                onChange={(v) => update({ iconColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.showLabels}
                  onChange={(e) => update({ showLabels: e.target.checked })}
                  className="rounded"
                />
                Show Labels
              </label>
            </>
          );
        })()}

      {/* ── FOOTER ── */}
      {block.type === "footer" &&
        (() => {
          const b = block as FooterBlock;
          return (
            <>
              <TextInput
                label="Company Name"
                value={b.companyName}
                onChange={(v) => update({ companyName: v })}
              />
              <TextInput
                label="Address"
                value={b.address}
                onChange={(v) => update({ address: v })}
              />
              <TextInput
                label="Unsubscribe Text"
                value={b.unsubscribeText}
                onChange={(v) => update({ unsubscribeText: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.showUnsubscribe}
                  onChange={(e) =>
                    update({ showUnsubscribe: e.target.checked })
                  }
                  className="rounded"
                />
                Show Unsubscribe Link
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.showAddress}
                  onChange={(e) => update({ showAddress: e.target.checked })}
                  className="rounded"
                />
                Show Address
              </label>
            </>
          );
        })()}

      {/* ── FEATURE ROW ── */}
      {block.type === "feature-row" &&
        (() => {
          const b = block as FeatureRowBlock;
          return (
            <>
              {b.features.map((f, i) => (
                <div
                  key={i}
                  className="border border-gray-100 rounded p-2 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      Feature {i + 1}
                    </span>
                    <button
                      onClick={() =>
                        update({
                          features: b.features.filter((_, j) => j !== i),
                        })
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Emoji icon"
                    value={f.icon}
                    onChange={(e) => {
                      const ft = [...b.features];
                      ft[i] = { ...f, icon: e.target.value };
                      update({ features: ft });
                    }}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    placeholder="Title"
                    value={f.title}
                    onChange={(e) => {
                      const ft = [...b.features];
                      ft[i] = { ...f, title: e.target.value };
                      update({ features: ft });
                    }}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={f.desc}
                    onChange={(e) => {
                      const ft = [...b.features];
                      ft[i] = { ...f, desc: e.target.value };
                      update({ features: ft });
                    }}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                  />
                </div>
              ))}
              <button
                onClick={() =>
                  update({
                    features: [
                      ...b.features,
                      {
                        icon: "✨",
                        title: "New Feature",
                        desc: "Describe this feature.",
                      },
                    ],
                  })
                }
                className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
              >
                + Add Feature
              </button>
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {/* ── STATS ROW ── */}
      {block.type === "stats-row" &&
        (() => {
          const b = block as StatsRowBlock;
          return (
            <>
              {b.stats.map((s, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Value"
                    value={s.value}
                    onChange={(e) => {
                      const st = [...b.stats];
                      st[i] = { ...s, value: e.target.value };
                      update({ stats: st });
                    }}
                    className="w-24 text-xs border border-gray-200 rounded px-2 py-1.5 font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Label"
                    value={s.label}
                    onChange={(e) => {
                      const st = [...b.stats];
                      st[i] = { ...s, label: e.target.value };
                      update({ stats: st });
                    }}
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5"
                  />
                  <button
                    onClick={() =>
                      update({ stats: b.stats.filter((_, j) => j !== i) })
                    }
                    className="text-red-400 hover:text-red-600 px-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  update({
                    stats: [...b.stats, { value: "0", label: "New Stat" }],
                  })
                }
                className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
              >
                + Add Stat
              </button>
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Value Color"
                value={b.valueColor}
                onChange={(v) => update({ valueColor: v })}
              />
              <ColorInput
                label="Label Color"
                value={b.labelColor}
                onChange={(v) => update({ labelColor: v })}
              />
            </>
          );
        })()}

      {/* ── TESTIMONIAL ── */}
      {block.type === "testimonial" &&
        (() => {
          const b = block as TestimonialBlock;
          return (
            <>
              <TextInput
                label="Quote"
                value={b.quote}
                onChange={(v) => update({ quote: v })}
                multiline
                richText
              />
              <TextInput
                label="Author Name"
                value={b.author}
                onChange={(v) => update({ author: v })}
              />
              <TextInput
                label="Role / Company"
                value={b.role}
                onChange={(v) => update({ role: v })}
              />
              <ColorInput
                label="Accent Color"
                value={b.accentColor}
                onChange={(v) => update({ accentColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {/* ── PRODUCT CARD ── */}
      {block.type === "product-card" &&
        (() => {
          const b = block as ProductCardBlock;
          return (
            <>
              <TextInput
                label="Image URL"
                value={b.imageUrl}
                onChange={(v) => update({ imageUrl: v })}
                placeholder="https://..."
              />
              <TextInput
                label="Product Name"
                value={b.name}
                onChange={(v) => update({ name: v })}
              />
              <TextInput
                label="Description"
                value={b.description}
                onChange={(v) => update({ description: v })}
                multiline
              />
              <TextInput
                label="Price"
                value={b.price}
                onChange={(v) => update({ price: v })}
              />
              <TextInput
                label="Original Price (strikethrough)"
                value={b.originalPrice}
                onChange={(v) => update({ originalPrice: v })}
              />
              <TextInput
                label="Button Label"
                value={b.btnLabel}
                onChange={(v) => update({ btnLabel: v })}
              />
              <TextInput
                label="Button URL"
                value={b.btnUrl}
                onChange={(v) => update({ btnUrl: v })}
              />
              <ColorInput
                label="Button Color"
                value={b.btnBg}
                onChange={(v) => update({ btnBg: v })}
              />
              <ColorInput
                label="Card Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {/* ── COUNTDOWN ── */}
      {block.type === "countdown" &&
        (() => {
          const b = block as CountdownBlock;
          return (
            <>
              <TextInput
                label="Label Text"
                value={b.label}
                onChange={(v) => update({ label: v })}
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Target Date
                </label>
                <input
                  type="date"
                  value={b.targetDate}
                  onChange={(e) => update({ targetDate: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5"
                />
              </div>
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Label Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
              <ColorInput
                label="Number Box Background"
                value={b.numberBg}
                onChange={(v) => update({ numberBg: v })}
              />
              <ColorInput
                label="Number Color"
                value={b.numberColor}
                onChange={(v) => update({ numberColor: v })}
              />
            </>
          );
        })()}

      {/* ── SIGNATURE ── */}
      {block.type === "signature" &&
        (() => {
          const b = block as SignatureBlock;
          return (
            <>
              <TextInput
                label="Name"
                value={b.name}
                onChange={(v) => update({ name: v })}
              />
              <VariableInsertButtons
                onInsert={(t) => update({ name: b.name + t })}
              />
              <TextInput
                label="Title"
                value={b.title}
                onChange={(v) => update({ title: v })}
              />
              <TextInput
                label="Company"
                value={b.company}
                onChange={(v) => update({ company: v })}
              />
              <TextInput
                label="Email"
                value={b.email}
                onChange={(v) => update({ email: v })}
              />
              <VariableInsertButtons
                onInsert={(t) => update({ email: b.email + t })}
              />
              <TextInput
                label="Phone"
                value={b.phone}
                onChange={(v) => update({ phone: v })}
              />
              <ColorInput
                label="Accent Color"
                value={b.accentColor}
                onChange={(v) => update({ accentColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {/* ── CODE BLOCK ── */}
      {block.type === "code-block" &&
        (() => {
          const b = block as CodeBlockBlock;
          return (
            <>
              <TextInput
                label="Code"
                value={b.code}
                onChange={(v) => update({ code: v })}
                multiline
              />
              <TextInput
                label="Language (label only)"
                value={b.language}
                onChange={(v) => update({ language: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={b.textColor}
                onChange={(v) => update({ textColor: v })}
              />
            </>
          );
        })()}

      {/* ── VIDEO PREVIEW ── */}
      {block.type === "video-preview" &&
        (() => {
          const b = block as VideoPreviewBlock;
          return (
            <>
              <TextInput
                label="Video URL"
                value={b.videoUrl}
                onChange={(v) => update({ videoUrl: v })}
                placeholder="https://..."
              />
              <TextInput
                label="Thumbnail Image URL"
                value={b.thumbnailUrl}
                onChange={(v) => update({ thumbnailUrl: v })}
                placeholder="https://..."
              />
              <TextInput
                label="Caption / Title"
                value={b.title}
                onChange={(v) => update({ title: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
            </>
          );
        })()}

      {/* ── TABLE ── */}
      {block.type === "table" &&
        (() => {
          const b = block as TableBlock;
          return (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Column Headers
                </label>
                {b.headers.map((h, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      type="text"
                      value={h}
                      onChange={(e) => {
                        const headers = [...b.headers];
                        headers[i] = e.target.value;
                        update({
                          headers,
                          rows: b.rows.map((r) => {
                            const row = [...r];
                            if (row.length < headers.length) row.push("");
                            return row;
                          }),
                        });
                      }}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 font-semibold"
                    />
                    <button
                      onClick={() => {
                        const headers = b.headers.filter((_, j) => j !== i);
                        update({
                          headers,
                          rows: b.rows.map((r) => r.filter((_, j) => j !== i)),
                        });
                      }}
                      className="text-red-400 hover:text-red-600 px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    update({
                      headers: [...b.headers, `Col ${b.headers.length + 1}`],
                      rows: b.rows.map((r) => [...r, ""]),
                    })
                  }
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add Column
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">
                  Rows
                </label>
                {b.rows.map((row, ri) => (
                  <div key={ri} className="flex gap-1 items-start">
                    <div
                      className="flex-1 grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${b.headers.length},1fr)`,
                      }}
                    >
                      {b.headers.map((_, ci) => (
                        <input
                          key={ci}
                          type="text"
                          value={row[ci] || ""}
                          onChange={(e) => {
                            const rows = b.rows.map((r, i) =>
                              i === ri
                                ? r.map((c, j) =>
                                    j === ci ? e.target.value : c,
                                  )
                                : r,
                            );
                            update({ rows });
                          }}
                          className="w-full text-xs border border-gray-200 rounded px-1.5 py-1"
                        />
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        update({ rows: b.rows.filter((_, j) => j !== ri) })
                      }
                      className="text-red-400 hover:text-red-600 mt-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    update({ rows: [...b.rows, b.headers.map(() => "")] })
                  }
                  className="w-full text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded py-1.5"
                >
                  + Add Row
                </button>
              </div>
              <ColorInput
                label="Header Background"
                value={b.headerBg}
                onChange={(v) => update({ headerBg: v })}
              />
              <ColorInput
                label="Header Text"
                value={b.headerColor}
                onChange={(v) => update({ headerColor: v })}
              />
              <ColorInput
                label="Border Color"
                value={b.borderColor}
                onChange={(v) => update({ borderColor: v })}
              />
              <ColorInput
                label="Background"
                value={b.bgColor}
                onChange={(v) => update({ bgColor: v })}
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={b.stripedRows}
                  onChange={(e) => update({ stripedRows: e.target.checked })}
                  className="rounded"
                />
                Striped Rows
              </label>
            </>
          );
        })()}
    </div>
  );
}
