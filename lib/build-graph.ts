import { source } from "@/lib/source";
import type { Graph } from "@/components/graph-view";

interface ExtractedReference {
  href: string;
}

function normalizeHref(href: string): string | null {
  if (href.startsWith("/")) return href.split("#")[0].replace(/\/$/, "") || "/";
  return null;
}

export function buildGraph(): Graph {
  const pages = source.getPages();
  const urls = new Set(pages.map((page) => page.url));

  const nodes = pages.map((page) => ({
    id: page.url,
    text: page.data.title,
    description: page.data.description,
    url: page.url,
  }));

  const seen = new Set<string>();
  const links = pages.flatMap((page) => {
    const refs = (page.data as { extractedReferences?: ExtractedReference[] })
      .extractedReferences;
    if (!refs) return [];

    return refs.flatMap((ref) => {
      const target = normalizeHref(ref.href);
      if (!target || target === page.url || !urls.has(target)) return [];

      const key = [page.url, target].sort().join(" -> ");
      if (seen.has(key)) return [];
      seen.add(key);

      return [{ source: page.url, target }];
    });
  });

  return { nodes, links };
}
