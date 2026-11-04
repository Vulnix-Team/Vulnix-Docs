"use client";

import { PublicAssistant } from "@/components/public-assistant/PublicAssistant";

// The public assistant on docs.vulnix.dev (main repo docs/Vulnix_Public_Assistant.md). The booking
// page is the one vulnix.dev's "Book a demo" uses (apps/web lib/marketing/bookDemo.ts).
const BOOK_DEMO_HREF = process.env.NEXT_PUBLIC_BOOK_DEMO_URL || "https://calendar.app.google/8z2d9vxVffVh8a84A";

const SUGGESTIONS = [
  "How do I verify a domain?",
  "How do I start my first pentest?",
  "How do I connect a GitHub repository?",
  "What does the API let me do?",
];

export function DocsAssistant() {
  return (
    <PublicAssistant
      endpoint="/api/assistant"
      site="docs"
      bookDemoHref={BOOK_DEMO_HREF}
      turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      suggestions={SUGGESTIONS}
      font="var(--font-satoshi), var(--font-marketing-body), ui-sans-serif, system-ui, sans-serif"
      headingFont="var(--font-satoshi), ui-sans-serif, system-ui, sans-serif"
    />
  );
}
