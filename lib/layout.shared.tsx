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
      // The logo goes to the main product site, not this app's own index -
      // this app is only the docs, the logo is the whole-brand mark.
      url: "https://vulnix.dev",
    },
    // Rendered manually inside the sidebar footer instead (app/layout.tsx),
    // alongside the "Try Vulnix Cloud" CTA in the same bar - the default
    // placement here would render its own separate one underneath it.
    themeSwitch: { enabled: false },
  };
}
