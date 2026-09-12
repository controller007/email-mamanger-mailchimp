import type { BlockType, EmailBlock } from "../types";

export function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

export function defaultBlock(type: BlockType): EmailBlock {
  const id = makeId();
  switch (type) {
    case "header":
      return {
        id,
        type,
        logoUrl: "",
        brandName: "Your Brand",
        bgColor: "#1e3a8a",
        textColor: "#ffffff",
        logoWidth: 140,
        alignment: "center",
      };
    case "hero":
      return {
        id,
        type,
        heading: "Welcome to Our Newsletter",
        subtext:
          "Stay updated with the latest news and exclusive offers just for you.",
        bgColor: "#eff6ff",
        textColor: "#111827",
        btnLabel: "Get Started →",
        btnUrl: "#",
        btnBg: "#2563eb",
        btnTextColor: "#ffffff",
        btnRadius: 8,
        alignment: "center",
        showButton: true,
        paddingY: 48,
      };
    case "text":
      return {
        id,
        type,
        content:
          "Write your email content here. You can use variables like {first_name} to personalise each email.",
        fontSize: 15,
        color: "#374151",
        alignment: "left",
        bgColor: "#ffffff",
        paddingY: 12,
        lineHeight: 1.7,
      };
    case "heading":
      return {
        id,
        type,
        content: "Section Heading",
        level: 2,
        color: "#111827",
        bgColor: "#ffffff",
        alignment: "left",
        paddingY: 8,
      };
    case "button":
      return {
        id,
        type,
        label: "Click Here →",
        url: "#",
        bgColor: "#2563eb",
        textColor: "#ffffff",
        radius: 8,
        alignment: "center",
        fontSize: 15,
        paddingX: 28,
        paddingY: 13,
        fullWidth: false,
      };
    case "image":
      return {
        id,
        type,
        src: "",
        alt: "Image",
        width: 100,
        alignment: "center",
        linkUrl: "",
        borderRadius: 8,
        bgColor: "#ffffff",
      };
    case "divider":
      return {
        id,
        type,
        color: "#e5e7eb",
        thickness: 1,
        marginY: 24,
        style: "solid",
      };
    case "spacer":
      return { id, type, height: 32, bgColor: "transparent" };
    case "two-column":
      return {
        id,
        type,
        leftContent: "Left column content. Add your text here.",
        rightContent: "Right column content. Add your text here.",
        leftBg: "#f9fafb",
        rightBg: "#f9fafb",
        bgColor: "#ffffff",
        gap: 16,
        ratio: "50-50",
      };
    case "three-column":
      return {
        id,
        type,
        col1: "Column one content.",
        col2: "Column two content.",
        col3: "Column three content.",
        bgColor: "#ffffff",
        gap: 16,
      };
    case "bullet-list":
      return {
        id,
        type,
        items: [
          "First important point",
          "Second important point",
          "Third important point",
        ],
        color: "#374151",
        bgColor: "#ffffff",
        fontSize: 15,
        bulletColor: "#2563eb",
        lineHeight: 1.7,
      };
    case "numbered-list":
      return {
        id,
        type,
        items: ["Step one", "Step two", "Step three"],
        color: "#374151",
        bgColor: "#ffffff",
        fontSize: 15,
        numberColor: "#2563eb",
      };
    case "quote":
      return {
        id,
        type,
        content: "This is a meaningful quote that stands out.",
        author: "— Author Name",
        borderColor: "#2563eb",
        bgColor: "#eff6ff",
        textColor: "#1e40af",
        fontSize: 15,
      };
    case "social":
      return {
        id,
        type,
        links: [
          { platform: "Twitter", url: "#", label: "Twitter" },
          { platform: "LinkedIn", url: "#", label: "LinkedIn" },
          { platform: "Instagram", url: "#", label: "Instagram" },
        ],
        bgColor: "#f9fafb",
        iconColor: "#374151",
        alignment: "center",
        showLabels: true,
      };
    case "footer":
      return {
        id,
        type,
        companyName: "Your Company Inc.",
        address: "123 Main St, City, Country",
        unsubscribeText: "Unsubscribe from these emails",
        bgColor: "#f9fafb",
        textColor: "#6b7280",
        showUnsubscribe: true,
        showAddress: true,
      };
    case "feature-row":
      return {
        id,
        type,
        features: [
          {
            icon: "⚡",
            title: "Fast",
            desc: "Lightning speed performance for all your needs.",
          },
          {
            icon: "🔒",
            title: "Secure",
            desc: "Enterprise-grade security you can rely on.",
          },
          {
            icon: "📊",
            title: "Analytics",
            desc: "Deep insights to grow your business.",
          },
        ],
        bgColor: "#ffffff",
        textColor: "#111827",
        columns: 3,
      };
    case "stats-row":
      return {
        id,
        type,
        stats: [
          { value: "10K+", label: "Customers" },
          { value: "99%", label: "Uptime" },
          { value: "4.9★", label: "Rating" },
          { value: "24/7", label: "Support" },
        ],
        bgColor: "#1e3a8a",
        valueColor: "#ffffff",
        labelColor: "#93c5fd",
      };
    case "testimonial":
      return {
        id,
        type,
        quote:
          "This product has completely transformed the way we work. Highly recommend!",
        author: "Jane Smith",
        role: "CEO, Acme Inc.",
        avatarUrl: "",
        bgColor: "#f9fafb",
        textColor: "#111827",
        accentColor: "#2563eb",
      };
    case "code-block":
      return {
        id,
        type,
        code: "const greeting = 'Hello, World!';\nconsole.log(greeting);",
        language: "javascript",
        bgColor: "#1e293b",
        textColor: "#e2e8f0",
      };
    case "video-preview":
      return {
        id,
        type,
        thumbnailUrl: "",
        videoUrl: "#",
        title: "Watch Our Latest Video",
        bgColor: "#ffffff",
      };
    case "product-card":
      return {
        id,
        type,
        imageUrl: "",
        name: "Product Name",
        description: "A brief description of this amazing product.",
        price: "$49.99",
        originalPrice: "$79.99",
        btnLabel: "Shop Now",
        btnUrl: "#",
        btnBg: "#2563eb",
        bgColor: "#ffffff",
        layout: "vertical",
      };
    case "countdown":
      return {
        id,
        type,
        label: "Offer Ends In",
        targetDate: new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .split("T")[0],
        bgColor: "#1e3a8a",
        textColor: "#ffffff",
        numberBg: "#1d4ed8",
        numberColor: "#ffffff",
      };
    case "signature":
      return {
        id,
        type,
        name: "John Smith",
        title: "Account Executive",
        email: "john@example.com",
        phone: "+1 (555) 000-0000",
        company: "Acme Inc.",
        avatarUrl: "",
        bgColor: "#ffffff",
        textColor: "#111827",
        accentColor: "#2563eb",
        showAvatar: false,
      };
    case "table":
      return {
        id,
        type,
        headers: ["Product", "Qty", "Price"],
        rows: [
          ["Item A", "2", "$20"],
          ["Item B", "1", "$15"],
        ],
        headerBg: "#1e3a8a",
        headerColor: "#ffffff",
        stripedRows: true,
        borderColor: "#e5e7eb",
        bgColor: "#ffffff",
      };
    default:
      return {
        id,
        type: "text" as any,
        content: "",
        fontSize: 15,
        color: "#374151",
        alignment: "left",
        bgColor: "#ffffff",
        paddingY: 12,
        lineHeight: 1.7,
      };
  }
}
