// app/_lib/email/builtin-templates.ts

export interface BuiltinTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  category: string;
  designJson?: string;
  body: string;
}

// ─── Helper to produce a deterministic ID string ─────────────────────────────
function bid(suffix: string) {
  return `builtin_${suffix}`;
}

const DEFAULT_GS = {
  emailBgColor: "#f3f4f6",
  contentWidth: 600,
  contentBgColor: "#ffffff",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  defaultTextColor: "#111827",
  defaultFontSize: 15,
};

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. SIMPLE WELCOME
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "welcome-simple",
    name: "Simple Welcome",
    description:
      "Clean, friendly welcome email for new subscribers or customers.",
    category: "welcome",
    subject: "Welcome aboard, {first_name}! 🎉",
    designJson: JSON.stringify({
      version: 1,
      globalSettings: DEFAULT_GS,
      blocks: [
        {
          id: bid("ws_h1"),
          type: "heading",
          content: "Welcome, {first_name}! 👋",
          level: 1,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 8,
        },
        {
          id: bid("ws_sub"),
          type: "text",
          content: "We're so glad you're here.",
          fontSize: 15,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.7,
        },
        {
          id: bid("ws_intro"),
          type: "text",
          content:
            "Hi <strong>{first_name}</strong>,<br/><br/>Thank you for joining us. We've been building something we're really proud of, and we can't wait to share it with you.<br/><br/>Here's what you can expect from us:",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 12,
          lineHeight: 1.7,
        },
        {
          id: bid("ws_list"),
          type: "bullet-list",
          items: [
            "✅ Weekly tips and updates",
            "✅ Early access to new features",
            "✅ Exclusive member-only content",
          ],
          color: "#374151",
          bgColor: "#ffffff",
          fontSize: 15,
          bulletColor: "#2563eb",
          lineHeight: 1.7,
        },
        {
          id: bid("ws_p2"),
          type: "text",
          content:
            "If you ever have questions, just reply to this email — we read every message.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 12,
          lineHeight: 1.7,
        },
        {
          id: bid("ws_btn"),
          type: "button",
          label: "Get Started →",
          url: "#",
          bgColor: "#2563eb",
          textColor: "#ffffff",
          radius: 8,
          alignment: "left",
          fontSize: 15,
          paddingX: 24,
          paddingY: 12,
          fullWidth: false,
        },
        {
          id: bid("ws_sig"),
          type: "signature",
          name: "The Team",
          title: "",
          email: "",
          phone: "",
          company: "",
          avatarUrl: "",
          bgColor: "#ffffff",
          textColor: "#6b7280",
          accentColor: "#2563eb",
          showAvatar: false,
        },
        {
          id: bid("ws_footer"),
          type: "footer",
          companyName: "{company}",
          address: "",
          unsubscribeText: "Unsubscribe",
          bgColor: "#f9fafb",
          textColor: "#9ca3af",
          showUnsubscribe: true,
          showAddress: false,
        },
      ],
    }),
    body: `<h1 style="color:#111827;font-size:28px;font-weight:700;margin-bottom:8px;">Welcome, {first_name}! 👋</h1>
<p style="color:#6b7280;font-size:15px;margin-bottom:24px;">We're so glad you're here.</p>
<p>Hi <strong>{first_name}</strong>,</p>
<p>Thank you for joining us. We've been building something we're really proud of, and we can't wait to share it with you.</p>
<p>Here's what you can expect from us:</p>
<ul>
  <li>✅ Weekly tips and updates</li>
  <li>✅ Early access to new features</li>
  <li>✅ Exclusive member-only content</li>
</ul>
<p>If you ever have questions, just reply to this email — we read every message.</p>
<p style="margin-top:32px;">
  <a href="#" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Get Started →</a>
</p>
<p style="margin-top:32px;color:#6b7280;font-size:14px;">With excitement,<br/><strong>The Team</strong></p>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. MONTHLY NEWSLETTER
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "newsletter-monthly",
    name: "Monthly Newsletter",
    description:
      "Professional monthly newsletter with sections for updates, articles and a CTA.",
    category: "newsletter",
    subject: "Your Monthly Update — {company}",
    designJson: JSON.stringify({
      version: 1,
      globalSettings: DEFAULT_GS,
      blocks: [
        {
          id: bid("nm_h1"),
          type: "heading",
          content: "📰 Monthly Roundup",
          level: 1,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 12,
        },
        {
          id: bid("nm_divider"),
          type: "divider",
          color: "#2563eb",
          thickness: 3,
          marginY: 8,
          style: "solid",
        },
        {
          id: bid("nm_intro"),
          type: "text",
          content:
            "Hello <strong>{first_name}</strong>,<br/><br/>Here's everything that happened this month. Grab a coffee — it's a good one.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 12,
          lineHeight: 1.7,
        },
        {
          id: bid("nm_h2a"),
          type: "heading",
          content: "🔥 What's New",
          level: 2,
          color: "#1d4ed8",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 8,
        },
        {
          id: bid("nm_p1"),
          type: "text",
          content:
            "We've been heads-down building and here's what's ready for you. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("nm_h2b"),
          type: "heading",
          content: "📖 This Month's Reading",
          level: 2,
          color: "#1d4ed8",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 8,
        },
        {
          id: bid("nm_p2"),
          type: "text",
          content:
            "A handpicked article we think every {company} subscriber should read this month. We summarise it below so you don't have to dig through the whole thing.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("nm_quote"),
          type: "quote",
          content: "The best way to predict the future is to create it.",
          author: "",
          borderColor: "#e5e7eb",
          bgColor: "#ffffff",
          textColor: "#6b7280",
          fontSize: 15,
        },
        {
          id: bid("nm_h2c"),
          type: "heading",
          content: "📊 By the Numbers",
          level: 2,
          color: "#1d4ed8",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 8,
        },
        {
          id: bid("nm_table"),
          type: "table",
          headers: ["Metric", "This Month", "Change"],
          rows: [
            ["Users", "12,450", "+14%"],
            ["Revenue", "$48,200", "+8%"],
            ["NPS Score", "72", "+5"],
          ],
          headerBg: "#f9fafb",
          headerColor: "#111827",
          stripedRows: false,
          borderColor: "#e5e7eb",
          bgColor: "#ffffff",
        },
        {
          id: bid("nm_sp"),
          type: "spacer",
          height: 16,
          bgColor: "transparent",
        },
        {
          id: bid("nm_btn"),
          type: "button",
          label: "Read the Full Report →",
          url: "#",
          bgColor: "#2563eb",
          textColor: "#ffffff",
          radius: 8,
          alignment: "left",
          fontSize: 15,
          paddingX: 24,
          paddingY: 12,
          fullWidth: false,
        },
        {
          id: bid("nm_sig"),
          type: "signature",
          name: "The Team",
          title: "",
          email: "",
          phone: "",
          company: "",
          avatarUrl: "",
          bgColor: "#ffffff",
          textColor: "#6b7280",
          accentColor: "#2563eb",
          showAvatar: false,
        },
        {
          id: bid("nm_footer"),
          type: "footer",
          companyName: "{company}",
          address: "",
          unsubscribeText: "Unsubscribe",
          bgColor: "#f9fafb",
          textColor: "#9ca3af",
          showUnsubscribe: true,
          showAddress: false,
        },
      ],
    }),
    body: `<h1 style="color:#111827;font-size:26px;font-weight:700;border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:20px;">📰 Monthly Roundup</h1>
<p>Hello <strong>{first_name}</strong>,</p>
<p>Here's everything that happened this month. Grab a coffee — it's a good one.</p>

<h2 style="color:#1d4ed8;font-size:18px;font-weight:600;margin-top:28px;margin-bottom:8px;">🔥 What's New</h2>
<p>We've been heads-down building and here's what's ready for you. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>

<h2 style="color:#1d4ed8;font-size:18px;font-weight:600;margin-top:28px;margin-bottom:8px;">📖 This Month's Reading</h2>
<p>A handpicked article we think every {company} subscriber should read this month. We summarise it below so you don't have to dig through the whole thing.</p>
<blockquote style="border-left:4px solid #e5e7eb;padding:12px 16px;color:#6b7280;font-style:italic;margin:16px 0;">"The best way to predict the future is to create it."</blockquote>

<h2 style="color:#1d4ed8;font-size:18px;font-weight:600;margin-top:28px;margin-bottom:8px;">📊 By the Numbers</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
  <tr style="background:#f9fafb;"><th style="padding:10px 12px;border:1px solid #e5e7eb;text-align:left;">Metric</th><th style="padding:10px 12px;border:1px solid #e5e7eb;text-align:left;">This Month</th><th style="padding:10px 12px;border:1px solid #e5e7eb;text-align:left;">Change</th></tr>
  <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Users</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">12,450</td><td style="padding:10px 12px;border:1px solid #e5e7eb;color:#16a34a;">+14%</td></tr>
  <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Revenue</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$48,200</td><td style="padding:10px 12px;border:1px solid #e5e7eb;color:#16a34a;">+8%</td></tr>
  <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">NPS Score</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">72</td><td style="padding:10px 12px;border:1px solid #e5e7eb;color:#16a34a;">+5</td></tr>
</table>

<p style="margin-top:28px;">
  <a href="#" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Read the Full Report →</a>
</p>
<p style="margin-top:24px;color:#6b7280;font-size:13px;">Until next month,<br/><strong>The Team</strong></p>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. PROMOTIONAL SALE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "promo-sale",
    name: "Promotional Sale",
    description:
      "Eye-catching promotional email for discounts, sales or special offers.",
    category: "promo",
    subject: "🔥 Exclusive offer for you, {first_name}",
    designJson: JSON.stringify({
      version: 1,
      globalSettings: DEFAULT_GS,
      blocks: [
        {
          id: bid("ps_hero"),
          type: "hero",
          heading: "50% OFF",
          subtext: "On everything in our store. This weekend only.",
          bgColor: "#1e3a8a",
          textColor: "#ffffff",
          btnLabel: "Shop Now →",
          btnUrl: "#",
          btnBg: "#ffffff",
          btnTextColor: "#1d4ed8",
          btnRadius: 8,
          alignment: "center",
          showButton: true,
          paddingY: 40,
        },
        {
          id: bid("ps_intro"),
          type: "text",
          content:
            "Hi <strong>{first_name}</strong>,<br/><br/>This is the moment you've been waiting for. For the next <strong>48 hours only</strong>, everything is half price. No exceptions, no minimums.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 12,
          lineHeight: 1.7,
        },
        {
          id: bid("ps_h2"),
          type: "heading",
          content: "What's included:",
          level: 2,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 8,
        },
        {
          id: bid("ps_list"),
          type: "bullet-list",
          items: [
            "🛍️ All standard plans — 50% off first 3 months",
            "📦 All add-ons and integrations",
            "🔧 Premium support packages",
          ],
          color: "#374151",
          bgColor: "#ffffff",
          fontSize: 15,
          bulletColor: "#2563eb",
          lineHeight: 1.7,
        },
        {
          id: bid("ps_code"),
          type: "text",
          content:
            'Use code <strong style="background:#fef9c3;padding:2px 8px;border-radius:4px;color:#854d0e;">FLASH50</strong> at checkout. Expires Sunday at midnight.',
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("ps_btn"),
          type: "button",
          label: "Claim Your 50% Off →",
          url: "#",
          bgColor: "#dc2626",
          textColor: "#ffffff",
          radius: 8,
          alignment: "center",
          fontSize: 16,
          paddingX: 32,
          paddingY: 14,
          fullWidth: false,
        },
        {
          id: bid("ps_fine"),
          type: "text",
          content:
            "Offer expires Sunday at 11:59 PM. Cannot be combined with other offers.",
          fontSize: 12,
          color: "#9ca3af",
          alignment: "center",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.6,
        },
        {
          id: bid("ps_footer"),
          type: "footer",
          companyName: "{company}",
          address: "",
          unsubscribeText: "Unsubscribe",
          bgColor: "#f9fafb",
          textColor: "#9ca3af",
          showUnsubscribe: true,
          showAddress: false,
        },
      ],
    }),
    body: `<div style="text-align:center;background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:12px;padding:40px 32px;margin-bottom:24px;">
  <p style="color:#93c5fd;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Limited Time Offer</p>
  <h1 style="color:#fff;font-size:36px;font-weight:800;margin-bottom:8px;">50% OFF</h1>
  <p style="color:#bfdbfe;font-size:16px;margin-bottom:24px;">On everything in our store. This weekend only.</p>
  <a href="#" style="background:#fff;color:#1d4ed8;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Shop Now →</a>
</div>

<p>Hi <strong>{first_name}</strong>,</p>
<p>This is the moment you've been waiting for. For the next <strong>48 hours only</strong>, everything is half price. No exceptions, no minimums.</p>

<h2 style="font-size:18px;font-weight:600;color:#111827;margin-top:24px;">What's included:</h2>
<ul>
  <li>🛍️ All standard plans — 50% off first 3 months</li>
  <li>📦 All add-ons and integrations</li>
  <li>🔧 Premium support packages</li>
</ul>

<p>Use code <strong style="background:#fef9c3;padding:2px 8px;border-radius:4px;color:#854d0e;">FLASH50</strong> at checkout. Expires Sunday at midnight.</p>

<p style="text-align:center;margin-top:32px;">
  <a href="#" style="background:#dc2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Claim Your 50% Off →</a>
</p>
<p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center;">Offer expires Sunday at 11:59 PM. Cannot be combined with other offers.</p>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. FEATURE ANNOUNCEMENT
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "announcement-feature",
    name: "Feature Announcement",
    description:
      "Announce a new product feature, update or launch to your list.",
    category: "announcement",
    subject: "🚀 We just launched something big",
    designJson: JSON.stringify({
      version: 1,
      globalSettings: DEFAULT_GS,
      blocks: [
        {
          id: bid("af_label"),
          type: "text",
          content: "Product Update",
          fontSize: 13,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.4,
        },
        {
          id: bid("af_h1"),
          type: "heading",
          content: "Introducing [Feature Name] 🚀",
          level: 1,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 4,
        },
        {
          id: bid("af_sub"),
          type: "text",
          content: "The thing you've been asking for. It's finally here.",
          fontSize: 15,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.7,
        },
        {
          id: bid("af_intro"),
          type: "text",
          content:
            "Hi <strong>{first_name}</strong>,<br/><br/>We've been working on this for months and we're incredibly excited to finally share it with you. Today we're launching <strong>[Feature Name]</strong> — and it's going to change how you work.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 12,
          lineHeight: 1.7,
        },
        {
          id: bid("af_features"),
          type: "quote",
          content:
            "✨ <strong>What's new:</strong><br/><br/>• <strong>Instant sync</strong> — your data updates in real-time across all devices<br/>• <strong>Smart automation</strong> — set it once, let it run forever<br/>• <strong>Beautiful reports</strong> — see exactly what's working at a glance",
          author: "",
          borderColor: "#bfdbfe",
          bgColor: "#eff6ff",
          textColor: "#1e40af",
          fontSize: 15,
        },
        {
          id: bid("af_avail"),
          type: "text",
          content:
            "This is available to all users starting today. No extra setup required — just log in and you'll see it in your dashboard.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 12,
          lineHeight: 1.7,
        },
        {
          id: bid("af_btn"),
          type: "button",
          label: "Try It Now →",
          url: "#",
          bgColor: "#2563eb",
          textColor: "#ffffff",
          radius: 8,
          alignment: "left",
          fontSize: 15,
          paddingX: 24,
          paddingY: 12,
          fullWidth: false,
        },
        {
          id: bid("af_closing"),
          type: "text",
          content:
            "As always, we'd love to hear what you think. Hit reply and let us know!",
          fontSize: 14,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("af_sig"),
          type: "signature",
          name: "The Product Team",
          title: "",
          email: "",
          phone: "",
          company: "",
          avatarUrl: "",
          bgColor: "#ffffff",
          textColor: "#6b7280",
          accentColor: "#2563eb",
          showAvatar: false,
        },
        {
          id: bid("af_footer"),
          type: "footer",
          companyName: "{company}",
          address: "",
          unsubscribeText: "Unsubscribe",
          bgColor: "#f9fafb",
          textColor: "#9ca3af",
          showUnsubscribe: true,
          showAddress: false,
        },
      ],
    }),
    body: `<p style="color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Product Update</p>
<h1 style="color:#111827;font-size:28px;font-weight:700;margin-bottom:8px;">Introducing [Feature Name] 🚀</h1>
<p style="color:#6b7280;font-size:15px;margin-bottom:28px;">The thing you've been asking for. It's finally here.</p>

<p>Hi <strong>{first_name}</strong>,</p>
<p>We've been working on this for months and we're incredibly excited to finally share it with you. Today we're launching <strong>[Feature Name]</strong> — and it's going to change how you work.</p>

<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin:24px 0;">
  <h3 style="color:#1d4ed8;font-size:16px;font-weight:600;margin-bottom:12px;">✨ What's new:</h3>
  <ul style="color:#1e40af;margin:0;padding-left:20px;">
    <li style="margin-bottom:8px;"><strong>Instant sync</strong> — your data updates in real-time across all devices</li>
    <li style="margin-bottom:8px;"><strong>Smart automation</strong> — set it once, let it run forever</li>
    <li style="margin-bottom:8px;"><strong>Beautiful reports</strong> — see exactly what's working at a glance</li>
  </ul>
</div>

<p>This is available to all users starting today. No extra setup required — just log in and you'll see it in your dashboard.</p>

<p style="margin-top:28px;">
  <a href="#" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Try It Now →</a>
</p>
<p style="color:#6b7280;font-size:14px;margin-top:24px;">As always, we'd love to hear what you think. Hit reply and let us know!</p>
<p style="color:#6b7280;font-size:14px;margin-top:8px;">— The Product Team</p>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. TRANSACTIONAL / RECEIPT
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "transactional-receipt",
    name: "Order / Receipt",
    description:
      "Clean transactional email for orders, receipts or confirmations.",
    category: "transactional",
    subject: "Your order is confirmed ✅",
    designJson: JSON.stringify({
      version: 1,
      globalSettings: DEFAULT_GS,
      blocks: [
        {
          id: bid("tr_label"),
          type: "text",
          content: "Order Confirmation",
          fontSize: 13,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.4,
        },
        {
          id: bid("tr_h1"),
          type: "heading",
          content: "Thanks for your order, {first_name}!",
          level: 1,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 4,
        },
        {
          id: bid("tr_sub"),
          type: "text",
          content: "We're processing it now and will notify you when it ships.",
          fontSize: 15,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.7,
        },
        {
          id: bid("tr_sp1"),
          type: "spacer",
          height: 16,
          bgColor: "transparent",
        },
        {
          id: bid("tr_table"),
          type: "table",
          headers: ["Item", "Price"],
          rows: [
            ["Product Name", "$29.00"],
            ["Another Product", "$15.00"],
            ["Tax", "$4.40"],
            ["Total", "$48.40"],
          ],
          headerBg: "#f9fafb",
          headerColor: "#111827",
          stripedRows: false,
          borderColor: "#e5e7eb",
          bgColor: "#f9fafb",
        },
        {
          id: bid("tr_sp2"),
          type: "spacer",
          height: 12,
          bgColor: "transparent",
        },
        {
          id: bid("tr_ship"),
          type: "quote",
          content:
            "📦 <strong>Shipping to:</strong><br/>{first_name} {last_name}<br/>{company}",
          author: "",
          borderColor: "#bbf7d0",
          bgColor: "#f0fdf4",
          textColor: "#166534",
          fontSize: 14,
        },
        {
          id: bid("tr_help"),
          type: "text",
          content:
            'Questions? Just reply to this email or visit our <a href="#" style="color:#2563eb;">help centre</a>.',
          fontSize: 14,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("tr_footer"),
          type: "footer",
          companyName: "{company}",
          address: "",
          unsubscribeText: "Unsubscribe",
          bgColor: "#f9fafb",
          textColor: "#9ca3af",
          showUnsubscribe: false,
          showAddress: false,
        },
      ],
    }),
    body: `<p style="color:#6b7280;font-size:13px;">Order Confirmation</p>
<h1 style="color:#111827;font-size:24px;font-weight:700;margin-bottom:4px;">Thanks for your order, {first_name}!</h1>
<p style="color:#6b7280;margin-bottom:28px;">We're processing it now and will notify you when it ships.</p>

<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
  <p style="font-size:12px;color:#9ca3af;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;margin-bottom:16px;">Order Summary</p>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#374151;">Product Name</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">$29.00</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#374151;">Another Product</td><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">$15.00</td></tr>
    <tr><td style="padding:8px 0;color:#374151;">Tax</td><td style="padding:8px 0;text-align:right;color:#374151;">$4.40</td></tr>
  </table>
  <div style="border-top:2px solid #e5e7eb;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;">
    <strong style="color:#111827;">Total</strong>
    <strong style="color:#111827;font-size:18px;">$48.40</strong>
  </div>
</div>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
  <p style="color:#15803d;font-weight:600;margin-bottom:4px;">📦 Shipping to:</p>
  <p style="color:#166534;font-size:14px;">{first_name} {last_name}<br/>{company}</p>
</div>

<p style="color:#6b7280;font-size:14px;">Questions? Just reply to this email or visit our <a href="#" style="color:#2563eb;">help centre</a>.</p>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. MINIMAL NEWSLETTER
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "newsletter-minimal",
    name: "Minimal Newsletter",
    description:
      "Ultra-clean text-forward newsletter. Works perfectly in all email clients.",
    category: "newsletter",
    subject: "What I've been thinking about lately",
    designJson: JSON.stringify({
      version: 1,
      globalSettings: DEFAULT_GS,
      blocks: [
        {
          id: bid("mn_byline"),
          type: "text",
          content: "Newsletter · {company}",
          fontSize: 13,
          color: "#9ca3af",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.4,
        },
        {
          id: bid("mn_div"),
          type: "divider",
          color: "#f3f4f6",
          thickness: 1,
          marginY: 8,
          style: "solid",
        },
        {
          id: bid("mn_h1"),
          type: "heading",
          content: "The one thing that changed how I think about everything",
          level: 1,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 12,
        },
        {
          id: bid("mn_p1"),
          type: "text",
          content:
            "Hi {first_name},<br/><br/>Last week I read something that completely changed how I see this industry. I've been chewing on it since and I think it's worth sharing with you.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("mn_p2"),
          type: "text",
          content:
            "[Your main insight or story goes here. Write as if you're talking to a smart friend. Be direct, be specific, be useful.]",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("mn_p3"),
          type: "text",
          content: "Here's what I took away from it:",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.7,
        },
        {
          id: bid("mn_ol"),
          type: "numbered-list",
          items: [
            "First takeaway. Explain it briefly. One or two sentences max.",
            "Second takeaway. Again — short, punchy, actionable.",
            "Third takeaway. End with something people can do today.",
          ],
          color: "#374151",
          bgColor: "#ffffff",
          fontSize: 15,
          numberColor: "#2563eb",
        },
        {
          id: bid("mn_p4"),
          type: "text",
          content:
            "If this resonated, I'd genuinely love to hear your reaction. Just hit reply.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("mn_sig"),
          type: "signature",
          name: "[Your Name]",
          title: "",
          email: "",
          phone: "",
          company: "{company}",
          avatarUrl: "",
          bgColor: "#ffffff",
          textColor: "#6b7280",
          accentColor: "#2563eb",
          showAvatar: false,
        },
        {
          id: bid("mn_footer"),
          type: "footer",
          companyName: "{company}",
          address: "",
          unsubscribeText: "Unsubscribe",
          bgColor: "#f9fafb",
          textColor: "#9ca3af",
          showUnsubscribe: true,
          showAddress: false,
        },
      ],
    }),
    body: `<p style="color:#9ca3af;font-size:13px;border-bottom:1px solid #f3f4f6;padding-bottom:12px;margin-bottom:24px;">Newsletter · {company}</p>

<h1 style="color:#111827;font-size:24px;font-weight:700;line-height:1.3;margin-bottom:16px;">The one thing that changed how I think about everything</h1>

<p>Hi {first_name},</p>

<p>Last week I read something that completely changed how I see this industry. I've been chewing on it since and I think it's worth sharing with you.</p>

<p>[Your main insight or story goes here. Write as if you're talking to a smart friend. Be direct, be specific, be useful.]</p>

<p>Here's what I took away from it:</p>

<ol>
  <li style="margin-bottom:12px;"><strong>First takeaway.</strong> Explain it briefly. One or two sentences max.</li>
  <li style="margin-bottom:12px;"><strong>Second takeaway.</strong> Again — short, punchy, actionable.</li>
  <li style="margin-bottom:12px;"><strong>Third takeaway.</strong> End with something people can do today.</li>
</ol>

<p>If this resonated, I'd genuinely love to hear your reaction. Just hit reply.</p>

<p style="margin-top:32px;color:#6b7280;font-size:14px;">Until next time,<br/><strong>[Your Name]</strong></p>
<p style="color:#9ca3af;font-size:12px;margin-top:4px;">{company}</p>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. PRODUCT LAUNCH
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "promo-product-launch",
    name: "Product Launch",
    description: "Build excitement for a new product or service launch.",
    category: "promo",
    subject: "It's here. {first_name}, meet [Product].",
    designJson: JSON.stringify({
      version: 1,
      globalSettings: DEFAULT_GS,
      blocks: [
        {
          id: bid("pl_label"),
          type: "text",
          content: "Now Available",
          fontSize: 12,
          color: "#6b7280",
          alignment: "center",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.4,
        },
        {
          id: bid("pl_h1"),
          type: "heading",
          content: "Meet [Product Name]",
          level: 1,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "center",
          paddingY: 8,
        },
        {
          id: bid("pl_sub"),
          type: "text",
          content:
            "The simplest way to [solve core problem]. Built for people who value their time.",
          fontSize: 16,
          color: "#6b7280",
          alignment: "center",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.7,
        },
        {
          id: bid("pl_btn1"),
          type: "button",
          label: "Get Early Access →",
          url: "#",
          bgColor: "#111827",
          textColor: "#ffffff",
          radius: 8,
          alignment: "center",
          fontSize: 16,
          paddingX: 32,
          paddingY: 14,
          fullWidth: false,
        },
        {
          id: bid("pl_div"),
          type: "divider",
          color: "#f3f4f6",
          thickness: 1,
          marginY: 24,
          style: "solid",
        },
        {
          id: bid("pl_intro"),
          type: "text",
          content:
            "Hi <strong>{first_name}</strong>,<br/><br/>You're one of the first people to hear about this. We've been working on [Product Name] for the past [X months] and we're finally ready to share it.",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("pl_h2a"),
          type: "heading",
          content: "Why we built it",
          level: 2,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 8,
        },
        {
          id: bid("pl_why"),
          type: "text",
          content:
            "[Tell the origin story in 2–3 sentences. Be honest. People love authenticity.]",
          fontSize: 15,
          color: "#374151",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("pl_h2b"),
          type: "heading",
          content: "What it does",
          level: 2,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 8,
        },
        {
          id: bid("pl_feats"),
          type: "feature-row",
          features: [
            {
              icon: "⚡",
              title: "Feature One",
              desc: "Short description of the value this provides.",
            },
            {
              icon: "🎯",
              title: "Feature Two",
              desc: "Short description of the value this provides.",
            },
            {
              icon: "🔒",
              title: "Feature Three",
              desc: "Short description of the value this provides.",
            },
          ],
          bgColor: "#f9fafb",
          textColor: "#374151",
          columns: 3,
        },
        {
          id: bid("pl_btn2"),
          type: "button",
          label: "Start Free Today →",
          url: "#",
          bgColor: "#2563eb",
          textColor: "#ffffff",
          radius: 8,
          alignment: "center",
          fontSize: 16,
          paddingX: 32,
          paddingY: 14,
          fullWidth: false,
        },
        {
          id: bid("pl_footer"),
          type: "footer",
          companyName: "{company}",
          address: "",
          unsubscribeText: "Unsubscribe",
          bgColor: "#f9fafb",
          textColor: "#9ca3af",
          showUnsubscribe: true,
          showAddress: false,
        },
      ],
    }),
    body: `<div style="text-align:center;margin-bottom:32px;">
  <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Now Available</p>
  <h1 style="color:#111827;font-size:32px;font-weight:800;line-height:1.2;margin-bottom:12px;">Meet [Product Name]</h1>
  <p style="color:#6b7280;font-size:16px;max-width:480px;margin:0 auto 24px;">The simplest way to [solve core problem]. Built for people who value their time.</p>
  <a href="#" style="background:#111827;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Get Early Access →</a>
</div>

<hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;"/>

<p>Hi <strong>{first_name}</strong>,</p>
<p>You're one of the first people to hear about this. We've been working on [Product Name] for the past [X months] and we're finally ready to share it.</p>

<h2 style="font-size:18px;font-weight:600;color:#111827;margin-top:28px;margin-bottom:16px;">Why we built it</h2>
<p>[Tell the origin story in 2–3 sentences. Be honest. People love authenticity.]</p>

<h2 style="font-size:18px;font-weight:600;color:#111827;margin-top:28px;margin-bottom:16px;">What it does</h2>
<div style="display:grid;gap:12px;margin-bottom:24px;">
  <div style="background:#f9fafb;border-radius:8px;padding:16px;">
    <strong>⚡ Feature One</strong><p style="color:#6b7280;font-size:14px;margin-top:4px;">Short description of the value this provides.</p>
  </div>
  <div style="background:#f9fafb;border-radius:8px;padding:16px;">
    <strong>🎯 Feature Two</strong><p style="color:#6b7280;font-size:14px;margin-top:4px;">Short description of the value this provides.</p>
  </div>
  <div style="background:#f9fafb;border-radius:8px;padding:16px;">
    <strong>🔒 Feature Three</strong><p style="color:#6b7280;font-size:14px;margin-top:4px;">Short description of the value this provides.</p>
  </div>
</div>

<p style="text-align:center;margin-top:32px;">
  <a href="#" style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Start Free Today →</a>
</p>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. ONBOARDING STEPS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "welcome-onboarding",
    name: "Onboarding Steps",
    description:
      "Step-by-step onboarding email to guide new users through getting started.",
    category: "welcome",
    subject: "3 things to do first, {first_name}",
    designJson: JSON.stringify({
      version: 1,
      globalSettings: DEFAULT_GS,
      blocks: [
        {
          id: bid("wo_h1"),
          type: "heading",
          content: "You're in! Here's how to get started.",
          level: 1,
          color: "#111827",
          bgColor: "#ffffff",
          alignment: "left",
          paddingY: 8,
        },
        {
          id: bid("wo_sub"),
          type: "text",
          content:
            "Hi <strong>{first_name}</strong> — let's get you set up in under 5 minutes.",
          fontSize: 15,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 4,
          lineHeight: 1.7,
        },
        {
          id: bid("wo_step1"),
          type: "quote",
          content:
            '<strong>Step 1 — Complete your profile</strong><br/><br/>Add your company details and a profile photo so your contacts know who\'s emailing them.<br/><br/><a href="#" style="color:#2563eb;font-weight:600;">→ Complete profile</a>',
          author: "",
          borderColor: "#2563eb",
          bgColor: "#eff6ff",
          textColor: "#1d4ed8",
          fontSize: 14,
        },
        {
          id: bid("wo_sp1"),
          type: "spacer",
          height: 12,
          bgColor: "transparent",
        },
        {
          id: bid("wo_step2"),
          type: "quote",
          content:
            '<strong>Step 2 — Import your contacts</strong><br/><br/>Upload a CSV or paste email addresses. It takes less than 60 seconds.<br/><br/><a href="#" style="color:#7c3aed;font-weight:600;">→ Import contacts</a>',
          author: "",
          borderColor: "#7c3aed",
          bgColor: "#f5f3ff",
          textColor: "#6d28d9",
          fontSize: 14,
        },
        {
          id: bid("wo_sp2"),
          type: "spacer",
          height: 12,
          bgColor: "transparent",
        },
        {
          id: bid("wo_step3"),
          type: "quote",
          content:
            '<strong>Step 3 — Send your first campaign</strong><br/><br/>Pick a template, write your message and hit send. Your first one is always free.<br/><br/><a href="#" style="color:#059669;font-weight:600;">→ Create campaign</a>',
          author: "",
          borderColor: "#059669",
          bgColor: "#ecfdf5",
          textColor: "#065f46",
          fontSize: 14,
        },
        {
          id: bid("wo_help"),
          type: "text",
          content:
            "Stuck? Just reply to this email — our team typically responds within a few hours.",
          fontSize: 14,
          color: "#6b7280",
          alignment: "left",
          bgColor: "#ffffff",
          paddingY: 8,
          lineHeight: 1.7,
        },
        {
          id: bid("wo_sig"),
          type: "signature",
          name: "The Team",
          title: "",
          email: "",
          phone: "",
          company: "",
          avatarUrl: "",
          bgColor: "#ffffff",
          textColor: "#6b7280",
          accentColor: "#2563eb",
          showAvatar: false,
        },
        {
          id: bid("wo_footer"),
          type: "footer",
          companyName: "{company}",
          address: "",
          unsubscribeText: "Unsubscribe",
          bgColor: "#f9fafb",
          textColor: "#9ca3af",
          showUnsubscribe: true,
          showAddress: false,
        },
      ],
    }),
    body: `<h1 style="color:#111827;font-size:24px;font-weight:700;margin-bottom:4px;">You're in! Here's how to get started.</h1>
<p style="color:#6b7280;margin-bottom:28px;">Hi <strong>{first_name}</strong> — let's get you set up in under 5 minutes.</p>

<div style="border-left:4px solid #2563eb;padding:16px 20px;margin-bottom:20px;background:#eff6ff;border-radius:0 8px 8px 0;">
  <p style="font-weight:700;color:#1d4ed8;margin-bottom:4px;">Step 1 — Complete your profile</p>
  <p style="color:#374151;font-size:14px;margin-bottom:8px;">Add your company details and a profile photo so your contacts know who's emailing them.</p>
  <a href="#" style="color:#2563eb;font-size:14px;font-weight:600;text-decoration:none;">→ Complete profile</a>
</div>

<div style="border-left:4px solid #7c3aed;padding:16px 20px;margin-bottom:20px;background:#f5f3ff;border-radius:0 8px 8px 0;">
  <p style="font-weight:700;color:#6d28d9;margin-bottom:4px;">Step 2 — Import your contacts</p>
  <p style="color:#374151;font-size:14px;margin-bottom:8px;">Upload a CSV or paste email addresses. It takes less than 60 seconds.</p>
  <a href="#" style="color:#7c3aed;font-size:14px;font-weight:600;text-decoration:none;">→ Import contacts</a>
</div>

<div style="border-left:4px solid #059669;padding:16px 20px;margin-bottom:28px;background:#ecfdf5;border-radius:0 8px 8px 0;">
  <p style="font-weight:700;color:#065f46;margin-bottom:4px;">Step 3 — Send your first campaign</p>
  <p style="color:#374151;font-size:14px;margin-bottom:8px;">Pick a template, write your message and hit send. Your first one is always free.</p>
  <a href="#" style="color:#059669;font-size:14px;font-weight:600;text-decoration:none;">→ Create campaign</a>
</div>

<p style="color:#6b7280;font-size:14px;">Stuck? Just reply to this email — our team typically responds within a few hours.</p>
<p style="color:#6b7280;font-size:14px;margin-top:16px;">Excited to have you,<br/><strong>The Team</strong></p>`,
  },
];
