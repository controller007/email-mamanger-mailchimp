// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BUILDER — TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type BlockType =
  | "header"
  | "hero"
  | "text"
  | "heading"
  | "button"
  | "image"
  | "divider"
  | "spacer"
  | "two-column"
  | "three-column"
  | "bullet-list"
  | "numbered-list"
  | "quote"
  | "social"
  | "footer"
  | "feature-row"
  | "stats-row"
  | "testimonial"
  | "code-block"
  | "video-preview"
  | "product-card"
  | "countdown"
  | "signature"
  | "table";

export interface BlockBase {
  id: string;
  type: BlockType;
}

export interface HeaderBlock extends BlockBase {
  type: "header";
  logoUrl: string;
  brandName: string;
  bgColor: string;
  textColor: string;
  logoWidth: number;
  alignment: "left" | "center" | "right";
}

export interface HeroBlock extends BlockBase {
  type: "hero";
  heading: string;
  subtext: string;
  bgColor: string;
  textColor: string;
  btnLabel: string;
  btnUrl: string;
  btnBg: string;
  btnTextColor: string;
  btnRadius: number;
  alignment: "left" | "center" | "right";
  showButton: boolean;
  paddingY: number;
}

export interface TextBlock extends BlockBase {
  type: "text";
  content: string; // may contain HTML tags for bold/italic/etc
  fontSize: number;
  color: string;
  alignment: "left" | "center" | "right";
  bgColor: string;
  paddingY: number;
  lineHeight: number;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  content: string;
  level: 1 | 2 | 3;
  color: string;
  bgColor: string;
  alignment: "left" | "center" | "right";
  paddingY: number;
}

export interface ButtonBlock extends BlockBase {
  type: "button";
  label: string;
  url: string;
  bgColor: string;
  textColor: string;
  radius: number;
  alignment: "left" | "center" | "right";
  fontSize: number;
  paddingX: number;
  paddingY: number;
  fullWidth: boolean;
}

export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  alt: string;
  width: number;
  alignment: "left" | "center" | "right";
  linkUrl: string;
  borderRadius: number;
  bgColor: string;
}

export interface DividerBlock extends BlockBase {
  type: "divider";
  color: string;
  thickness: number;
  marginY: number;
  style: "solid" | "dashed" | "dotted";
}

export interface SpacerBlock extends BlockBase {
  type: "spacer";
  height: number;
  bgColor: string;
}

export interface TwoColumnBlock extends BlockBase {
  type: "two-column";
  leftContent: string;
  rightContent: string;
  leftBg: string;
  rightBg: string;
  bgColor: string;
  gap: number;
  ratio: "50-50" | "60-40" | "40-60" | "70-30" | "30-70";
}

export interface ThreeColumnBlock extends BlockBase {
  type: "three-column";
  col1: string;
  col2: string;
  col3: string;
  bgColor: string;
  gap: number;
}

export interface BulletListBlock extends BlockBase {
  type: "bullet-list";
  items: string[];
  color: string;
  bgColor: string;
  fontSize: number;
  bulletColor: string;
  lineHeight: number;
}

export interface NumberedListBlock extends BlockBase {
  type: "numbered-list";
  items: string[];
  color: string;
  bgColor: string;
  fontSize: number;
  numberColor: string;
}

export interface QuoteBlock extends BlockBase {
  type: "quote";
  content: string;
  author: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  fontSize: number;
}

export interface SocialBlock extends BlockBase {
  type: "social";
  links: { platform: string; url: string; label: string }[];
  bgColor: string;
  iconColor: string;
  alignment: "left" | "center" | "right";
  showLabels: boolean;
}

export interface FooterBlock extends BlockBase {
  type: "footer";
  companyName: string;
  address: string;
  unsubscribeText: string;
  bgColor: string;
  textColor: string;
  showUnsubscribe: boolean;
  showAddress: boolean;
}

export interface FeatureRowBlock extends BlockBase {
  type: "feature-row";
  features: { icon: string; title: string; desc: string }[];
  bgColor: string;
  textColor: string;
  columns: 2 | 3;
}

export interface StatsRowBlock extends BlockBase {
  type: "stats-row";
  stats: { value: string; label: string }[];
  bgColor: string;
  valueColor: string;
  labelColor: string;
}

export interface TestimonialBlock extends BlockBase {
  type: "testimonial";
  quote: string;
  author: string;
  role: string;
  avatarUrl: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

export interface CodeBlockBlock extends BlockBase {
  type: "code-block";
  code: string;
  language: string;
  bgColor: string;
  textColor: string;
}

export interface VideoPreviewBlock extends BlockBase {
  type: "video-preview";
  thumbnailUrl: string;
  videoUrl: string;
  title: string;
  bgColor: string;
}

export interface ProductCardBlock extends BlockBase {
  type: "product-card";
  imageUrl: string;
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  btnLabel: string;
  btnUrl: string;
  btnBg: string;
  bgColor: string;
  layout: "horizontal" | "vertical";
}

export interface CountdownBlock extends BlockBase {
  type: "countdown";
  label: string;
  targetDate: string;
  bgColor: string;
  textColor: string;
  numberBg: string;
  numberColor: string;
}

export interface SignatureBlock extends BlockBase {
  type: "signature";
  name: string;
  title: string;
  email: string;
  phone: string;
  company: string;
  avatarUrl: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  showAvatar: boolean;
}

export interface TableBlock extends BlockBase {
  type: "table";
  headers: string[];
  rows: string[][];
  headerBg: string;
  headerColor: string;
  stripedRows: boolean;
  borderColor: string;
  bgColor: string;
}

export type EmailBlock =
  | HeaderBlock
  | HeroBlock
  | TextBlock
  | HeadingBlock
  | ButtonBlock
  | ImageBlock
  | DividerBlock
  | SpacerBlock
  | TwoColumnBlock
  | ThreeColumnBlock
  | BulletListBlock
  | NumberedListBlock
  | QuoteBlock
  | SocialBlock
  | FooterBlock
  | FeatureRowBlock
  | StatsRowBlock
  | TestimonialBlock
  | CodeBlockBlock
  | VideoPreviewBlock
  | ProductCardBlock
  | CountdownBlock
  | SignatureBlock
  | TableBlock;

export interface GlobalSettings {
  emailBgColor: string;
  contentWidth: number;
  contentBgColor: string;
  fontFamily: string;
  defaultTextColor: string;
  defaultFontSize: number;
}

export interface DesignJson {
  blocks: EmailBlock[];
  globalSettings: GlobalSettings;
  version: number;
}

export const DEFAULT_GS: GlobalSettings = {
  emailBgColor: "#f3f4f6",
  contentWidth: 600,
  contentBgColor: "#ffffff",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  defaultTextColor: "#111827",
  defaultFontSize: 15,
};

export const VARIABLES = [
  { label: "First Name", token: "{first_name}", example: "John" },
  { label: "Last Name", token: "{last_name}", example: "Doe" },
  { label: "Full Name", token: "{full_name}", example: "John Doe" },
  { label: "Email", token: "{email}", example: "john@example.com" },
  { label: "Company", token: "{company}", example: "Acme Inc." },
];
