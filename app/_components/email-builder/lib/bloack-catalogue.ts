import React from "react";
import type { BlockType } from "../types";

// Icons imported as strings to avoid JSX in TS file — pass them from the main component
export interface CatalogueEntry {
  type: BlockType;
  label: string;
  iconName: string;
  desc: string;
}

export interface CatalogueCategory {
  category: string;
  blocks: CatalogueEntry[];
}

export const BLOCK_CATALOGUE: CatalogueCategory[] = [
  {
    category: "Structure",
    blocks: [
      {
        type: "header",
        label: "Header",
        iconName: "LayoutTemplate",
        desc: "Logo & brand name",
      },
      {
        type: "hero",
        label: "Hero Banner",
        iconName: "Star",
        desc: "Bold heading + CTA",
      },
      {
        type: "two-column",
        label: "2 Columns",
        iconName: "Columns",
        desc: "Side-by-side layout",
      },
      {
        type: "three-column",
        label: "3 Columns",
        iconName: "Columns",
        desc: "Three-column grid",
      },
      {
        type: "footer",
        label: "Footer",
        iconName: "AtSign",
        desc: "Unsubscribe & company",
      },
    ],
  },
  {
    category: "Content",
    blocks: [
      {
        type: "heading",
        label: "Heading",
        iconName: "Type",
        desc: "H1, H2, or H3",
      },
      {
        type: "text",
        label: "Text Block",
        iconName: "AlignLeft",
        desc: "Paragraph of text",
      },
      {
        type: "bullet-list",
        label: "Bullet List",
        iconName: "CheckSquare",
        desc: "Unordered list",
      },
      {
        type: "numbered-list",
        label: "Numbered List",
        iconName: "CheckSquare",
        desc: "Ordered list",
      },
      {
        type: "quote",
        label: "Blockquote",
        iconName: "Quote",
        desc: "Highlighted quote",
      },
      {
        type: "code-block",
        label: "Code Block",
        iconName: "Code",
        desc: "Formatted code",
      },
      { type: "table", label: "Table", iconName: "Table", desc: "Data table" },
    ],
  },
  {
    category: "Media & Actions",
    blocks: [
      {
        type: "image",
        label: "Image",
        iconName: "Image",
        desc: "Photo or graphic",
      },
      {
        type: "button",
        label: "Button",
        iconName: "Zap",
        desc: "Call-to-action",
      },
      {
        type: "video-preview",
        label: "Video Thumbnail",
        iconName: "Video",
        desc: "Video link preview",
      },
      {
        type: "social",
        label: "Social Links",
        iconName: "Share2",
        desc: "Social media links",
      },
    ],
  },
  {
    category: "Advanced",
    blocks: [
      {
        type: "feature-row",
        label: "Features Row",
        iconName: "Star",
        desc: "Icon + title + desc",
      },
      {
        type: "stats-row",
        label: "Stats Row",
        iconName: "BarChart2",
        desc: "Numbers & metrics",
      },
      {
        type: "testimonial",
        label: "Testimonial",
        iconName: "Quote",
        desc: "Customer review",
      },
      {
        type: "product-card",
        label: "Product Card",
        iconName: "Gift",
        desc: "Product showcase",
      },
      {
        type: "countdown",
        label: "Countdown",
        iconName: "Zap",
        desc: "Urgency timer",
      },
      {
        type: "signature",
        label: "Signature",
        iconName: "AtSign",
        desc: "Email sign-off",
      },
    ],
  },
  {
    category: "Layout",
    blocks: [
      {
        type: "divider",
        label: "Divider",
        iconName: "Minus",
        desc: "Horizontal line",
      },
      {
        type: "spacer",
        label: "Spacer",
        iconName: "ChevronDown",
        desc: "Vertical gap",
      },
    ],
  },
];
