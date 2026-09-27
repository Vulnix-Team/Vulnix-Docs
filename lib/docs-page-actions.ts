import path from "node:path";

import type { source } from "@/lib/source";

const GITHUB_REPO = "Vulnix-Team/Vulnix-Docs";
const CONTENT_DIR = path.join(process.cwd(), "content");

type DocsPage = ReturnType<typeof source.getPage>;

export function getMarkdownUrl(page: NonNullable<DocsPage>): string {
  return page.slugs.length ? `/api/markdown/${page.slugs.join("/")}` : "/api/markdown";
}

export function getGithubUrl(page: NonNullable<DocsPage>): string | undefined {
  if (!page.absolutePath) return undefined;
  const relativePath = path.relative(CONTENT_DIR, page.absolutePath).split(path.sep).join("/");
  return `https://github.com/${GITHUB_REPO}/blob/main/content/${relativePath}`;
}
