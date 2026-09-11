import Image from "next/image";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <Image
          src="/vulnix-logo.svg"
          alt="Vulnix"
          width={96}
          height={20}
          priority
          style={{ width: "96px", height: "auto" }}
        />
      ),
      url: "/",
    },
    // Rendered manually inside the sidebar footer instead (app/layout.tsx),
    // alongside the "Try Vulnix Cloud" CTA in the same bar - the default
    // placement here would render its own separate one underneath it.
    themeSwitch: { enabled: false },
  };
}
