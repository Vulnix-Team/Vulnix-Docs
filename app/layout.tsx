import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";

import { satoshi } from "@/app/fonts/satoshi";
import { source } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";
import { DocsSocialLinks } from "@/components/docs-social-links";

import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-marketing-body",
  subsets: ["latin"],
});

const SITE_URL = "https://docs.vulnix.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vulnix Docs",
    template: "%s | Vulnix Docs",
  },
  description: "Documentation for Vulnix, the agentic AI-pentesting platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${inter.variable} ${satoshi.variable}`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-screen flex-col font-sans"
        style={{ fontFamily: "var(--font-satoshi), var(--font-marketing-body), ui-sans-serif, system-ui, sans-serif" }}
      >
        <RootProvider>
          <DocsLayout
            tree={source.getPageTree()}
            {...baseOptions()}
            sidebar={{
              banner: <DocsSocialLinks key="docs-sidebar-social" only={["x", "linkedin"]} className="px-2" />,
              footer: (
                <div key="docs-sidebar-footer" className="flex items-center gap-2 rounded-lg bg-fd-secondary p-1">
                  <a
                    href="https://vulnix.dev/signup"
                    className="flex-1 rounded-md bg-fd-primary px-3 py-1.5 text-center text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Try Vulnix Cloud
                  </a>
                  <ThemeSwitch />
                </div>
              ),
            }}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  );
}
