import { source } from "@/lib/source";
import { SITE_URL, SITE_DESCRIPTION } from "@/lib/seo";
import { getMarkdownUrl } from "@/lib/docs-page-actions";

// Generated, not hand-maintained (unlike apps/web's static llms.txt) - this
// content changes whenever a doc page is added/renamed, and every page
// already has a raw-Markdown export at /api/markdown (see the "Copy
// Markdown" page action), so linking straight to that is more accurate
// than re-describing each page by hand.
export function GET() {
  const lines = [
    "# Vulnix Docs",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Pages",
    "",
    ...source.getPages().map((page) => {
      const title = page.data.title;
      const description = page.data.description ? ` - ${page.data.description}` : "";
      return `- [${title}](${SITE_URL}${getMarkdownUrl(page)})${description}`;
    }),
  ];

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
