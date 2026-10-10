import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

// Same security-header baseline as apps/web (see its next.config.ts for the
// full rationale) - this app has no auth and no attacker-influenced dynamic
// content, so the CSP here is simpler: no Turnstile origin, no inline-script
// allowance needed beyond what Next's own hydration requires.
const isDev = process.env.NODE_ENV === "development";

function contentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

const nextConfig: NextConfig = {
  output: "standalone",
  // This app lives as a submodule inside the main Vulnix monorepo, which
  // has its own root-level package-lock.json - without this, Turbopack
  // infers that as the workspace root instead of this directory.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    viewTransition: true,
  },
  async redirects() {
    // The page was "Billing & Credits" until 2026-10-10 (credits are no longer sold).
    return [{ source: "/billing-and-credits", destination: "/billing-and-plans", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default withMDX(nextConfig);
