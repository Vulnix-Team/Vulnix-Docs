import Link from "next/link";

// Renders inside the root layout's DocsLayout, so a 404 keeps the sidebar and
// the search bar - the two things someone who mistyped a docs URL actually
// needs. Unlike the marketing app's global-not-found, this app has a real root
// layout, so this is a plain not-found.tsx and owns no <html> of its own.
//
// Styled with Fumadocs' own `--color-fd-*` tokens rather than the marketing
// site's Ink palette, so it follows the docs theme into light and dark.

/** Where a dead docs URL can usefully send someone next. */
const DESTINATIONS = [
  { href: "/", label: "Documentation home" },
  { href: "/getting-started", label: "Getting started" },
  { href: "https://vulnix.dev", label: "vulnix.dev" },
  { href: "mailto:support@vulnix.dev", label: "support@vulnix.dev" },
];

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-20">
      <div className="w-full max-w-lg">
        <p className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.08em] text-fd-muted-foreground uppercase">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-[#fe4202]"
          />
          Error 404
        </p>

        <h1 className="mt-4 text-3xl leading-tight text-balance text-fd-foreground sm:text-4xl">
          This page doesn&apos;t exist
        </h1>

        <p className="mt-5 text-[15px] leading-relaxed text-fd-muted-foreground">
          The link may be broken, or the page may have been renamed. Use the
          sidebar or search to find what you were looking for.
        </p>

        <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-fd-border pt-6 text-sm">
          {DESTINATIONS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-fd-foreground/80 underline underline-offset-4 transition-colors hover:text-fd-foreground"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
