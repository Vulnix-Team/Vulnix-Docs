// Same real accounts and same icon assets as the main marketing site's
// footer (vulnix.dev) - not a separate icon set invented for the docs.
const SOCIAL_LINKS = [
  { label: "X", slug: "x", href: "https://x.com/vulnix_dev" },
  { label: "LinkedIn", slug: "linkedin", href: "https://www.linkedin.com/company/vulnix-dev" },
  { label: "GitHub", slug: "github", href: "https://github.com/vulnixdev" },
] as const;

type Slug = (typeof SOCIAL_LINKS)[number]["slug"];

export function DocsSocialLinks({
  only,
  className,
}: {
  /** Restrict to a subset of icons, in the order given. Omit for all three. */
  only?: Slug[];
  className?: string;
}) {
  const links = only ? SOCIAL_LINKS.filter((link) => only.includes(link.slug)) : SOCIAL_LINKS;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {links.map((link) => (
        <a
          key={link.slug}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- brand SVG icon, same asset the marketing site uses */}
          <img
            src={`/social/${link.slug}.svg`}
            alt=""
            className="size-4 dark:invert"
          />
        </a>
      ))}
    </div>
  );
}
