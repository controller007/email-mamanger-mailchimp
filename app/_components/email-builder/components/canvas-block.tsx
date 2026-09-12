"use client";
/**
 * CanvasBlock — renders each block type on the builder canvas.
 * Styles MUST match the HTML export output exactly so what you see = what you get.
 * All styles are inline to mirror the email HTML output.
 */
import React from "react";
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

interface CanvasBlockProps {
  block: EmailBlock;
  gs: GlobalSettings;
}

export function CanvasBlock({ block, gs }: CanvasBlockProps) {
  // Base font applied everywhere
  const baseFont: React.CSSProperties = {
    fontFamily: gs.fontFamily,
  };

  switch (block.type) {
    case "header": {
      const b = block as HeaderBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "16px 32px",
            textAlign: b.alignment,
          }}
        >
          {b.logoUrl ? (
            <img
              src={b.logoUrl}
              alt={b.brandName}
              style={{
                height: 40,
                maxWidth: b.logoWidth,
                objectFit: "contain",
                display: "inline-block",
              }}
            />
          ) : (
            <span
              style={{
                fontWeight: 800,
                fontSize: 20,
                color: b.textColor,
                ...baseFont,
              }}
            >
              {b.brandName}
            </span>
          )}
        </div>
      );
    }

    case "hero": {
      const b = block as HeroBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: `${b.paddingY}px 32px`,
            textAlign: b.alignment,
          }}
        >
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: 28,
              fontWeight: 800,
              color: b.textColor,
              lineHeight: 1.2,
              ...baseFont,
            }}
            dangerouslySetInnerHTML={{ __html: b.heading }}
          />
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 16,
              color: b.textColor,
              opacity: 0.85,
              lineHeight: 1.6,
              ...baseFont,
            }}
            dangerouslySetInnerHTML={{ __html: b.subtext }}
          />
          {b.showButton && (
            <span
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: b.btnBg,
                color: b.btnTextColor,
                borderRadius: b.btnRadius,
                fontWeight: 700,
                fontSize: 15,
                cursor: "default",
                ...baseFont,
              }}
            >
              {b.btnLabel}
            </span>
          )}
        </div>
      );
    }

    case "text": {
      const b = block as TextBlock;
      return (
        <div style={{ background: b.bgColor, padding: `${b.paddingY}px 32px` }}>
          <div
            style={{
              fontSize: b.fontSize,
              color: b.color,
              textAlign: b.alignment,
              lineHeight: b.lineHeight,
              ...baseFont,
            }}
            dangerouslySetInnerHTML={{ __html: b.content }}
          />
        </div>
      );
    }

    case "heading": {
      const b = block as HeadingBlock;
      const sizes: Record<number, number> = { 1: 28, 2: 22, 3: 18 };
      const Tag = `h${b.level}` as "h1" | "h2" | "h3";
      return (
        <div style={{ background: b.bgColor, padding: `${b.paddingY}px 32px` }}>
          <Tag
            style={{
              margin: 0,
              fontSize: sizes[b.level],
              fontWeight: 700,
              color: b.color,
              textAlign: b.alignment,
              ...baseFont,
            }}
          >
            {b.content}
          </Tag>
        </div>
      );
    }

    case "button": {
      const b = block as ButtonBlock;
      return (
        <div style={{ padding: "10px 32px", textAlign: b.alignment }}>
          <span
            style={{
              display: "inline-block",
              padding: `${b.paddingY}px ${b.paddingX}px`,
              background: b.bgColor,
              color: b.textColor,
              borderRadius: b.radius,
              fontWeight: 700,
              fontSize: b.fontSize,
              width: b.fullWidth ? "100%" : "auto",
              textAlign: "center",
              cursor: "default",
              boxSizing: "border-box",
              ...baseFont,
            }}
          >
            {b.label}
          </span>
        </div>
      );
    }

    case "image": {
      const b = block as ImageBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "12px 32px",
            textAlign: b.alignment,
          }}
        >
          {b.src ? (
            <img
              src={b.src}
              alt={b.alt}
              style={{
                display: "inline-block",
                width: `${b.width}%`,
                maxWidth: "100%",
                borderRadius: b.borderRadius,
                height: "auto",
              }}
            />
          ) : (
            <div
              style={{
                background: "#f3f4f6",
                border: "2px dashed #d1d5db",
                borderRadius: b.borderRadius,
                padding: "32px 24px",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              📷 Add image URL in properties
            </div>
          )}
        </div>
      );
    }

    case "divider": {
      const b = block as DividerBlock;
      return (
        <div style={{ padding: `${b.marginY}px 32px` }}>
          <hr
            style={{
              border: "none",
              borderTop: `${b.thickness}px ${b.style} ${b.color}`,
              margin: 0,
            }}
          />
        </div>
      );
    }

    case "spacer": {
      const b = block as SpacerBlock;
      return (
        <div
          style={{
            height: b.height,
            background: b.bgColor || "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 10, color: "#d1d5db" }}>
            {b.height}px spacer
          </span>
        </div>
      );
    }

    case "two-column": {
      const b = block as TwoColumnBlock;
      const ratioMap: Record<string, [string, string]> = {
        "50-50": ["1", "1"],
        "60-40": ["3", "2"],
        "40-60": ["2", "3"],
        "70-30": ["7", "3"],
        "30-70": ["3", "7"],
      };
      const [lf, rf] = ratioMap[b.ratio] || ["1", "1"];
      return (
        <div style={{ background: b.bgColor, padding: "16px" }}>
          {/* Desktop: flex row. Mobile: stacks via responsive wrapper */}
          <div style={{ display: "flex", gap: b.gap, flexWrap: "wrap" }}>
            <div
              style={{
                flex: lf,
                minWidth: 140,
                background: b.leftBg,
                padding: 16,
                borderRadius: 6,
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.6,
                ...baseFont,
              }}
              dangerouslySetInnerHTML={{
                __html:
                  b.leftContent ||
                  '<span style="color:#9ca3af;font-size:12px;">Left column — drop content here</span>',
              }}
            />
            <div
              style={{
                flex: rf,
                minWidth: 140,
                background: b.rightBg,
                padding: 16,
                borderRadius: 6,
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.6,
                ...baseFont,
              }}
              dangerouslySetInnerHTML={{
                __html:
                  b.rightContent ||
                  '<span style="color:#9ca3af;font-size:12px;">Right column — drop content here</span>',
              }}
            />
          </div>
        </div>
      );
    }

    case "three-column": {
      const b = block as ThreeColumnBlock;
      return (
        <div style={{ background: b.bgColor, padding: "16px" }}>
          <div style={{ display: "flex", gap: b.gap, flexWrap: "wrap" }}>
            {[b.col1, b.col2, b.col3].map((c, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 120px",
                  padding: 12,
                  fontSize: 13,
                  color: "#374151",
                  lineHeight: 1.5,
                  border: "1px dashed #e5e7eb",
                  borderRadius: 4,
                  ...baseFont,
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    c || `<span style="color:#9ca3af;">Column ${i + 1}</span>`,
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    case "bullet-list": {
      const b = block as BulletListBlock;
      return (
        <div style={{ background: b.bgColor, padding: "12px 32px" }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {b.items.map((item, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 8,
                  fontSize: b.fontSize,
                  color: b.color,
                  lineHeight: b.lineHeight,
                  ...baseFont,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "numbered-list": {
      const b = block as NumberedListBlock;
      return (
        <div style={{ background: b.bgColor, padding: "12px 32px" }}>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {b.items.map((item, i) => (
              <li
                key={i}
                style={{
                  marginBottom: 8,
                  fontSize: b.fontSize,
                  color: b.color,
                  lineHeight: 1.6,
                  ...baseFont,
                }}
              >
                {item}
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case "quote": {
      const b = block as QuoteBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "20px 32px",
            borderLeft: `4px solid ${b.borderColor}`,
          }}
        >
          <div
            style={{
              margin: "0 0 8px",
              fontSize: b.fontSize,
              color: b.textColor,
              fontStyle: "italic",
              lineHeight: 1.6,
              ...baseFont,
            }}
            dangerouslySetInnerHTML={{ __html: b.content }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: b.textColor,
              opacity: 0.7,
              fontWeight: 600,
              ...baseFont,
            }}
          >
            {b.author}
          </p>
        </div>
      );
    }

    case "social": {
      const b = block as SocialBlock;
      const justify =
        b.alignment === "center"
          ? "center"
          : b.alignment === "right"
            ? "flex-end"
            : "flex-start";
      return (
        <div style={{ background: b.bgColor, padding: "16px 32px" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: justify,
              flexWrap: "wrap",
            }}
          >
            {b.links.map((l, i) => (
              <span
                key={i}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: b.iconColor,
                  padding: "8px 14px",
                  background: "rgba(0,0,0,0.06)",
                  borderRadius: 6,
                  ...baseFont,
                }}
              >
                {b.showLabels ? l.label : l.platform}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case "footer": {
      const b = block as FooterBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            borderTop: "1px solid #e5e7eb",
            padding: "20px 32px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 13,
              fontWeight: 600,
              color: b.textColor,
              ...baseFont,
            }}
          >
            {b.companyName}
          </p>
          {b.showAddress && (
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 11,
                color: b.textColor,
                ...baseFont,
              }}
            >
              {b.address}
            </p>
          )}
          {b.showUnsubscribe && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                color: b.textColor,
                ...baseFont,
              }}
            >
              <u>{b.unsubscribeText}</u>
            </p>
          )}
        </div>
      );
    }

    case "feature-row": {
      const b = block as FeatureRowBlock;
      return (
        <div style={{ background: b.bgColor, padding: "24px 16px" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {b.features.map((f, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 120px",
                  textAlign: "center",
                  padding: "12px 8px",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 14,
                    fontWeight: 700,
                    color: b.textColor,
                    ...baseFont,
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: b.textColor,
                    opacity: 0.7,
                    lineHeight: 1.5,
                    ...baseFont,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "stats-row": {
      const b = block as StatsRowBlock;
      return (
        <div style={{ background: b.bgColor, padding: "20px 16px" }}>
          {/* flex-wrap ensures mobile responsiveness */}
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {b.stats.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 80px",
                  textAlign: "center",
                  padding: "16px 8px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 28,
                    fontWeight: 800,
                    color: b.valueColor,
                    ...baseFont,
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: b.labelColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    ...baseFont,
                  }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "testimonial": {
      const b = block as TestimonialBlock;
      return (
        <div style={{ background: b.bgColor, padding: "32px" }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 40,
              color: b.accentColor,
              lineHeight: 1,
            }}
          >
            "
          </p>
          <div
            style={{
              margin: "0 0 16px",
              fontSize: 16,
              color: b.textColor,
              fontStyle: "italic",
              lineHeight: 1.6,
              ...baseFont,
            }}
            dangerouslySetInnerHTML={{ __html: b.quote }}
          />
          <p
            style={{
              margin: "0 0 2px",
              fontSize: 14,
              fontWeight: 700,
              color: b.textColor,
              ...baseFont,
            }}
          >
            {b.author}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: b.textColor,
              opacity: 0.65,
              ...baseFont,
            }}
          >
            {b.role}
          </p>
        </div>
      );
    }

    case "code-block": {
      const b = block as CodeBlockBlock;
      return (
        <div style={{ padding: "12px 32px" }}>
          <pre
            style={{
              margin: 0,
              padding: 16,
              background: b.bgColor,
              color: b.textColor,
              borderRadius: 8,
              fontFamily: "Courier New, monospace",
              fontSize: 12,
              lineHeight: 1.6,
              overflowX: "auto",
            }}
          >
            {b.code}
          </pre>
        </div>
      );
    }

    case "video-preview": {
      const b = block as VideoPreviewBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "16px 32px",
            textAlign: "center",
          }}
        >
          {b.thumbnailUrl ? (
            <div
              style={{
                position: "relative",
                display: "inline-block",
                width: "100%",
              }}
            >
              <img
                src={b.thumbnailUrl}
                alt={b.title}
                style={{ width: "100%", borderRadius: 8, display: "block" }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 56,
                  height: 56,
                  background: "rgba(0,0,0,0.65)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: "#fff", fontSize: 22, marginLeft: 4 }}>
                  ▶
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#f3f4f6",
                border: "2px dashed #d1d5db",
                borderRadius: 8,
                padding: "40px 24px",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              🎥 Add thumbnail URL in properties
            </div>
          )}
          {b.title && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                color: "#6b7280",
                ...baseFont,
              }}
            >
              ▶ {b.title}
            </p>
          )}
        </div>
      );
    }

    case "product-card": {
      const b = block as ProductCardBlock;
      return (
        <div style={{ background: b.bgColor, padding: "16px 32px" }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {b.imageUrl ? (
              <img
                src={b.imageUrl}
                alt={b.name}
                style={{
                  width: "100%",
                  height: 160,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  height: 100,
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: 12,
                }}
              >
                📦 Add image URL
              </div>
            )}
            <div style={{ padding: 16 }}>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#111827",
                  ...baseFont,
                }}
              >
                {b.name}
              </p>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 13,
                  color: "#6b7280",
                  ...baseFont,
                }}
              >
                {b.description}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span
                  style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}
                >
                  {b.price}
                </span>
                {b.originalPrice && (
                  <span
                    style={{
                      fontSize: 13,
                      color: "#9ca3af",
                      textDecoration: "line-through",
                    }}
                  >
                    {b.originalPrice}
                  </span>
                )}
              </div>
              <span
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  background: b.btnBg,
                  color: "#fff",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "default",
                  ...baseFont,
                }}
              >
                {b.btnLabel}
              </span>
            </div>
          </div>
        </div>
      );
    }

    case "countdown": {
      const b = block as CountdownBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            padding: "24px 16px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 12,
              fontWeight: 600,
              color: b.textColor,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              ...baseFont,
            }}
          >
            {b.label}
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {["Days", "Hrs", "Min", "Sec"].map((u, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    background: b.numberBg,
                    borderRadius: 8,
                    padding: "12px 18px",
                    minWidth: 56,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 800,
                      color: b.numberColor,
                      ...baseFont,
                    }}
                  >
                    00
                  </p>
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 10,
                    color: b.textColor,
                    ...baseFont,
                  }}
                >
                  {u}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "signature": {
      const b = block as SignatureBlock;
      return (
        <div
          style={{
            background: b.bgColor,
            borderTop: `2px solid ${b.accentColor}`,
            padding: "20px 32px",
          }}
        >
          <p
            style={{
              margin: "0 0 2px",
              fontSize: 16,
              fontWeight: 700,
              color: b.textColor,
              ...baseFont,
            }}
          >
            {b.name}
          </p>
          <p
            style={{
              margin: "0 0 2px",
              fontSize: 12,
              color: b.textColor,
              opacity: 0.7,
              ...baseFont,
            }}
          >
            {b.title} · {b.company}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: b.accentColor,
              ...baseFont,
            }}
          >
            {b.email} · {b.phone}
          </p>
        </div>
      );
    }

    case "table": {
      const b = block as TableBlock;
      return (
        <div style={{ background: b.bgColor, padding: "12px 32px" }}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: `1px solid ${b.borderColor}`,
                borderRadius: 8,
                overflow: "hidden",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {b.headers.map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "10px 12px",
                        background: b.headerBg,
                        color: b.headerColor,
                        textAlign: "left",
                        fontWeight: 600,
                        ...baseFont,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    style={{
                      background:
                        b.stripedRows && ri % 2 === 1 ? "#f9fafb" : b.bgColor,
                    }}
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "8px 12px",
                          borderBottom: `1px solid ${b.borderColor}`,
                          color: "#374151",
                          ...baseFont,
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    default:
      return (
        <div style={{ padding: 12, color: "#9ca3af", fontSize: 12 }}>
          Unknown block
        </div>
      );
  }
}
