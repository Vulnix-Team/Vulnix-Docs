import type { MetadataRoute } from "next";

import { source } from "@/lib/source";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return source.getPages().map((page) => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: page.url === "/" ? 1 : 0.7,
  }));
}
