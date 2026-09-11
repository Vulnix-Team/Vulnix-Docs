import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

// AEO: docs content is exactly what AI answer engines should be citing -
// explicitly welcome the major AI crawlers (both live-retrieval bots like
// PerplexityBot and training bots like GPTBot/Google-Extended) rather than
// relying on them to fall back to the "*" rule. Mirrors apps/web's own
// robots.ts (see docs/README.md's SEO/AEO conventions).
const AI_USER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_USER_AGENTS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
