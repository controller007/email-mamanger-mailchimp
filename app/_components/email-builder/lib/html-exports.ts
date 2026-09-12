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

/** Escape only plain-text values used inside HTML attribute values or as tag-safe text. */
function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitise rich-HTML content before embedding in the email.
 * We trust content produced by our own RichTextEditor (contentEditable) so
 * we only need to prevent breaking the outer table structure — no full
 * sanitisation needed here. The content is already well-formed HTML.
 */
function richHtml(s: string): string {
  // If the string contains no HTML tags treat it as plain text and wrap
  if (!/<[a-zA-Z]/.test(s))
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return s; // already HTML — pass through as-is
}

export function blockToHtml(block: EmailBlock, gs: GlobalSettings): string {
  const font = gs.fontFamily;
  switch (block.type) {
    case "header": {
      const b = block as HeaderBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 24px;text-align:${b.alignment};">${b.logoUrl ? `<img src="${escAttr(b.logoUrl)}" alt="${escAttr(b.brandName)}" width="${b.logoWidth}" style="display:inline-block;height:auto;max-width:${b.logoWidth}px;"/>` : `<span style="font-size:20px;font-weight:800;color:${b.textColor};font-family:${font};">${escAttr(b.brandName)}</span>`}</td></tr></table>`;
    }
    case "hero": {
      const b = block as HeroBlock;
      // heading & subtext are rich HTML from the editor — pass through
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:${b.paddingY}px 32px;text-align:${b.alignment};"><h1 style="margin:0 0 12px 0;font-size:28px;font-weight:800;color:${b.textColor};line-height:1.2;font-family:${font};">${richHtml(b.heading)}</h1><p style="margin:0 0 20px 0;font-size:16px;color:${b.textColor};opacity:0.85;line-height:1.6;font-family:${font};">${richHtml(b.subtext)}</p>${b.showButton ? `<a href="${escAttr(b.btnUrl)}" style="display:inline-block;padding:12px 28px;background:${b.btnBg};color:${b.btnTextColor};border-radius:${b.btnRadius}px;font-weight:700;font-size:15px;text-decoration:none;font-family:${font};">${escAttr(b.btnLabel)}</a>` : ""}</td></tr></table>`;
    }
    case "text": {
      const b = block as TextBlock;
      // content is rich HTML — wrap in a single div preserving all inline formatting
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:${b.paddingY}px 32px;font-family:${font};font-size:${b.fontSize}px;color:${b.color};text-align:${b.alignment};line-height:${b.lineHeight};">${richHtml(b.content)}</td></tr></table>`;
    }
    case "heading": {
      const b = block as HeadingBlock;
      const sizes: Record<number, number> = { 1: 28, 2: 22, 3: 18 };
      // heading content is plain text (edited via plain input), safe to escape
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:${b.paddingY}px 32px;"><h${b.level} style="margin:0;font-size:${sizes[b.level]}px;font-weight:700;color:${b.color};text-align:${b.alignment};font-family:${font};">${escAttr(b.content)}</h${b.level}></td></tr></table>`;
    }
    case "button": {
      const b = block as ButtonBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:10px 32px;text-align:${b.alignment};"><a href="${escAttr(b.url)}" style="display:inline-block;padding:${b.paddingY}px ${b.paddingX}px;background:${b.bgColor};color:${b.textColor};border-radius:${b.radius}px;font-weight:700;font-size:${b.fontSize}px;text-decoration:none;font-family:${font};${b.fullWidth ? "width:100%;text-align:center;box-sizing:border-box;" : ""}">${escAttr(b.label)}</a></td></tr></table>`;
    }
    case "image": {
      const b = block as ImageBlock;
      if (!b.src) return "";
      const img = `<img src="${escAttr(b.src)}" alt="${escAttr(b.alt)}" style="display:inline-block;width:${b.width}%;max-width:100%;height:auto;border-radius:${b.borderRadius}px;"/>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:12px 32px;text-align:${b.alignment};">${b.linkUrl ? `<a href="${escAttr(b.linkUrl)}">${img}</a>` : img}</td></tr></table>`;
    }
    case "divider": {
      const b = block as DividerBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:${b.marginY}px 32px;"><hr style="border:none;border-top:${b.thickness}px ${b.style} ${b.color};margin:0;"/></td></tr></table>`;
    }
    case "spacer": {
      const b = block as SpacerBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor || "transparent"};"><tr><td style="height:${b.height}px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
    }
    case "two-column": {
      const b = block as TwoColumnBlock;
      const ratioMap: Record<string, [string, string]> = {
        "50-50": ["50%", "50%"],
        "60-40": ["60%", "40%"],
        "40-60": ["40%", "60%"],
        "70-30": ["70%", "30%"],
        "30-70": ["30%", "70%"],
      };
      const [lw, rw] = ratioMap[b.ratio] || ["50%", "50%"];
      // leftContent / rightContent are rich HTML
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td class="mobile-stack" style="width:${lw};vertical-align:top;background:${b.leftBg};padding:16px;border-radius:6px;font-size:14px;color:#374151;font-family:${font};line-height:1.6;">${richHtml(b.leftContent)}</td><td style="width:${b.gap}px;font-size:0;">&nbsp;</td><td class="mobile-stack" style="width:${rw};vertical-align:top;background:${b.rightBg};padding:16px;border-radius:6px;font-size:14px;color:#374151;font-family:${font};line-height:1.6;">${richHtml(b.rightContent)}</td></tr></table></td></tr></table>`;
    }
    case "three-column": {
      const b = block as ThreeColumnBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${[b.col1, b.col2, b.col3].map((c, i) => `<td class="mobile-stack" style="width:33.33%;vertical-align:top;padding:12px;font-size:13px;color:#374151;font-family:${font};line-height:1.5;${i < 2 ? `padding-right:${b.gap}px;` : ""}">${richHtml(c)}</td>`).join("")}</tr></table></td></tr></table>`;
    }
    case "bullet-list": {
      const b = block as BulletListBlock;
      // list items are plain text strings
      const items = b.items
        .map(
          (item) =>
            `<li style="margin-bottom:8px;font-size:${b.fontSize}px;color:${b.color};line-height:${b.lineHeight};font-family:${font};">${escAttr(item)}</li>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:12px 32px;"><ul style="margin:0;padding-left:20px;">${items}</ul></td></tr></table>`;
    }
    case "numbered-list": {
      const b = block as NumberedListBlock;
      const items = b.items
        .map(
          (item) =>
            `<li style="margin-bottom:8px;font-size:${b.fontSize}px;color:${b.color};line-height:1.6;font-family:${font};">${escAttr(item)}</li>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:12px 32px;"><ol style="margin:0;padding-left:20px;">${items}</ol></td></tr></table>`;
    }
    case "quote": {
      const b = block as QuoteBlock;
      // content is rich HTML from RichTextEditor; author is plain text
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};border-left:4px solid ${b.borderColor};"><tr><td style="padding:20px 32px;"><div style="font-size:${b.fontSize}px;color:${b.textColor};font-style:italic;line-height:1.6;font-family:${font};margin-bottom:8px;">${richHtml(b.content)}</div><p style="margin:0;font-size:12px;color:${b.textColor};opacity:0.7;font-weight:600;font-family:${font};">${escAttr(b.author)}</p></td></tr></table>`;
    }
    case "social": {
      const b = block as SocialBlock;
      const align =
        b.alignment === "center"
          ? "center"
          : b.alignment === "right"
            ? "right"
            : "left";
      const links = b.links
        .map(
          (l) =>
            `<a href="${escAttr(l.url)}" style="display:inline-block;margin:4px;padding:8px 14px;background:rgba(0,0,0,0.06);border-radius:6px;font-size:13px;font-weight:600;color:${b.iconColor};text-decoration:none;font-family:${font};">${escAttr(b.showLabels ? l.label : l.platform)}</a>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 32px;text-align:${align};">${links}</td></tr></table>`;
    }
    case "footer": {
      const b = block as FooterBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};border-top:1px solid #e5e7eb;"><tr><td style="padding:20px 32px;text-align:center;"><p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:${b.textColor};font-family:${font};">${escAttr(b.companyName)}</p>${b.showAddress ? `<p style="margin:0 0 4px 0;font-size:11px;color:${b.textColor};font-family:${font};">${escAttr(b.address)}</p>` : ""}${b.showUnsubscribe ? `<p style="margin:4px 0 0 0;font-size:11px;color:${b.textColor};font-family:${font};"><a href="#" style="color:${b.textColor};">${escAttr(b.unsubscribeText)}</a></p>` : ""}</td></tr></table>`;
    }
    case "feature-row": {
      const b = block as FeatureRowBlock;
      const cols = b.features
        .map(
          (f) =>
            `<td class="mobile-stack" style="width:${Math.floor(100 / b.features.length)}%;vertical-align:top;text-align:center;padding:16px 8px;"><p style="margin:0 0 8px 0;font-size:28px;">${f.icon}</p><p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:${b.textColor};font-family:${font};">${escAttr(f.title)}</p><p style="margin:0;font-size:12px;color:${b.textColor};opacity:0.7;line-height:1.5;font-family:${font};">${escAttr(f.desc)}</p></td>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:24px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cols}</tr></table></td></tr></table>`;
    }
    case "stats-row": {
      const b = block as StatsRowBlock;
      const cols = b.stats
        .map(
          (s) =>
            `<td class="mobile-stack" style="width:${Math.floor(100 / b.stats.length)}%;text-align:center;padding:16px 8px;"><p style="margin:0 0 4px 0;font-size:30px;font-weight:800;color:${b.valueColor};font-family:${font};">${escAttr(s.value)}</p><p style="margin:0;font-size:11px;color:${b.labelColor};text-transform:uppercase;letter-spacing:0.08em;font-family:${font};">${escAttr(s.label)}</p></td>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:20px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cols}</tr></table></td></tr></table>`;
    }
    case "testimonial": {
      const b = block as TestimonialBlock;
      // quote is rich HTML; author/role are plain text
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:32px;"><p style="margin:0 0 8px 0;font-size:40px;color:${b.accentColor};line-height:1;">"</p><div style="font-size:16px;color:${b.textColor};font-style:italic;line-height:1.6;font-family:${font};margin-bottom:16px;">${richHtml(b.quote)}</div><p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:${b.textColor};font-family:${font};">${escAttr(b.author)}</p><p style="margin:0;font-size:12px;color:${b.textColor};opacity:0.65;font-family:${font};">${escAttr(b.role)}</p></td></tr></table>`;
    }
    case "code-block": {
      const b = block as CodeBlockBlock;
      // code is literal text — must be escaped so angle brackets show
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:12px 32px;"><pre style="margin:0;padding:16px;background:${b.bgColor};color:${b.textColor};border-radius:8px;font-family:Courier New,monospace;font-size:12px;line-height:1.6;overflow-x:auto;">${escAttr(b.code)}</pre></td></tr></table>`;
    }
    case "video-preview": {
      const b = block as VideoPreviewBlock;
      if (!b.thumbnailUrl) return "";
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 32px;text-align:center;"><a href="${escAttr(b.videoUrl)}" style="display:block;position:relative;"><img src="${escAttr(b.thumbnailUrl)}" alt="${escAttr(b.title)}" style="width:100%;max-width:100%;height:auto;border-radius:8px;display:block;"/></a>${b.title ? `<p style="margin:8px 0 0 0;font-size:13px;color:#6b7280;font-family:${font};">▶ ${escAttr(b.title)}</p>` : ""}</td></tr></table>`;
    }
    case "product-card": {
      const b = block as ProductCardBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">${b.imageUrl ? `<tr><td><img src="${escAttr(b.imageUrl)}" alt="${escAttr(b.name)}" style="width:100%;max-height:200px;object-fit:cover;display:block;"/></td></tr>` : ""}<tr><td style="padding:16px;"><p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:#111827;font-family:${font};">${escAttr(b.name)}</p><p style="margin:0 0 10px 0;font-size:13px;color:#6b7280;font-family:${font};">${escAttr(b.description)}</p><p style="margin:0 0 14px 0;font-size:20px;font-weight:800;color:#111827;font-family:${font};">${escAttr(b.price)}${b.originalPrice ? ` <span style="font-size:14px;color:#9ca3af;text-decoration:line-through;font-weight:400;">${escAttr(b.originalPrice)}</span>` : ""}</p><a href="${escAttr(b.btnUrl)}" style="display:inline-block;padding:10px 20px;background:${b.btnBg};color:#fff;border-radius:6px;font-size:14px;font-weight:700;text-decoration:none;font-family:${font};">${escAttr(b.btnLabel)}</a></td></tr></table></td></tr></table>`;
    }
    case "countdown": {
      const b = block as CountdownBlock;
      const boxes = ["Days", "Hrs", "Min", "Sec"]
        .map(
          (u) =>
            `<td style="text-align:center;padding:0 6px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${b.numberBg};border-radius:8px;padding:12px 18px;text-align:center;"><p style="margin:0;font-size:24px;font-weight:800;color:${b.numberColor};font-family:${font};">00</p></td></tr><tr><td style="padding-top:4px;text-align:center;font-size:10px;color:${b.textColor};font-family:${font};">${u}</td></tr></table></td>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:24px;text-align:center;"><p style="margin:0 0 14px 0;font-size:12px;font-weight:600;color:${b.textColor};text-transform:uppercase;letter-spacing:0.1em;font-family:${font};">${escAttr(b.label)}</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>${boxes}</tr></table></td></tr></table>`;
    }
    case "signature": {
      const b = block as SignatureBlock;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};border-top:2px solid ${b.accentColor};"><tr><td style="padding:20px 32px;"><p style="margin:0 0 2px 0;font-size:16px;font-weight:700;color:${b.textColor};font-family:${font};">${escAttr(b.name)}</p><p style="margin:0 0 2px 0;font-size:13px;color:${b.textColor};opacity:0.7;font-family:${font};">${escAttr(b.title)} · ${escAttr(b.company)}</p><p style="margin:4px 0 0 0;font-size:13px;color:${b.accentColor};font-family:${font};"><a href="mailto:${escAttr(b.email)}" style="color:${b.accentColor};">${escAttr(b.email)}</a> · ${escAttr(b.phone)}</p></td></tr></table>`;
    }
    case "table": {
      const b = block as TableBlock;
      const thead = `<tr>${b.headers.map((h) => `<th style="padding:10px 12px;background:${b.headerBg};color:${b.headerColor};text-align:left;font-size:13px;font-weight:600;font-family:${font};">${escAttr(h)}</th>`).join("")}</tr>`;
      const tbody = b.rows
        .map(
          (row, ri) =>
            `<tr style="background:${b.stripedRows && ri % 2 === 1 ? "#f9fafb" : b.bgColor};">${row.map((cell) => `<td style="padding:10px 12px;border-bottom:1px solid ${b.borderColor};font-size:13px;color:#374151;font-family:${font};">${escAttr(cell)}</td>`).join("")}</tr>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${b.bgColor};"><tr><td style="padding:16px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${b.borderColor};border-radius:8px;overflow:hidden;border-collapse:collapse;">${thead}${tbody}</table></td></tr></table>`;
    }
    default:
      return "";
  }
}

export function buildEmailHtml(
  blocks: EmailBlock[],
  gs: GlobalSettings,
): string {
  const body = blocks.map((b) => blockToHtml(b, gs)).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Email</title>
  <style>
    body,#bodyTable{margin:0;padding:0;width:100%;background:${gs.emailBgColor};}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
    table{border-collapse:collapse!important;}
    a{color:inherit;}
    @media only screen and (max-width:600px){
      .email-container{width:100%!important;}
      .mobile-stack{display:block!important;width:100%!important;padding-right:0!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${gs.emailBgColor};">
  <table id="bodyTable" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${gs.emailBgColor};">
    <tr>
      <td align="center" valign="top" style="padding:32px 16px;">
        <table class="email-container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="${gs.contentWidth}" style="max-width:${gs.contentWidth}px;background:${gs.contentBgColor};border-radius:12px;overflow:hidden;">
          <tr><td>${body}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
