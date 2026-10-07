import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";

import { source } from "@/lib/source";
import { getMDXComponents } from "@/components/mdx-components";
import { DocsSocialLinks } from "@/components/docs-social-links";
import { MarkdownCopyButton, ViewOptionsPopover } from "@/components/docs-page-actions";
import { getGithubUrl, getMarkdownUrl } from "@/lib/docs-page-actions";
import shareImage from "@/app/opengraph-image.png";
import { COMPANY_LEGAL_NAME, SITE_NAME, SITE_URL } from "@/lib/seo";

// The site's share card. A page's own `openGraph`/`twitter` replaces the
// layout's whole object, image included, so every docs page went out with no
// image on LinkedIn and X (SEO audit, 2026-10-01); it is set here explicitly.
const SHARE_IMAGE = {
  url: shareImage.src,
  width: shareImage.width,
  height: shareImage.height,
  alt: "Vulnix Docs: documentation for the AI penetration testing platform",
};

// The company behind the docs, matching the Organization on vulnix.dev.
const PUBLISHER = {
  "@type": "Organization",
  name: "Vulnix",
  legalName: COMPANY_LEGAL_NAME,
  foundingDate: "2026-09-30",
  address: {
    "@type": "PostalAddress",
    streetAddress: "131 Continental Dr, Suite 305",
    addressLocality: "Newark",
    addressRegion: "DE",
    postalCode: "19713",
    addressCountry: "US",
  },
  url: "https://vulnix.dev",
  sameAs: [
    "https://www.linkedin.com/company/vulnix-dev",
    "https://x.com/vulnix_dev",
    "https://github.com/Vulnix-Team",
  ],
};

// "Getting Started", "Runs" or "Billing" alone is ambiguous in a search result
// (and two pages were both "Getting Started"), so API reference pages say so.
function seoTitle(page: { url: string; data: { title: string } }) {
  return page.url.startsWith("/api/") ? `API: ${page.data.title}` : page.data.title;
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getMarkdownUrl(page);
  const githubUrl = getGithubUrl(page);
  const url = `${SITE_URL}${page.url}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: seoTitle(page),
        description: page.data.description,
        url,
        image: `${SITE_URL}${SHARE_IMAGE.url}`,
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        publisher: PUBLISHER,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          ...(page.url === "/" ? [] : [{ "@type": "ListItem", position: 2, name: seoTitle(page), item: url }]),
        ],
      },
    ],
  };

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b border-fd-border pb-4">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
            InlineTOC: (props) => <InlineTOC {...props} items={page.data.toc} />,
          })}
        />
      </DocsBody>
      <div className="mt-8 flex justify-center border-t border-fd-border pt-6">
        <DocsSocialLinks />
      </div>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const url = `${SITE_URL}${page.url}`;

  const title = seoTitle(page);

  return {
    title,
    description: page.data.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: page.data.description,
      url,
      siteName: SITE_NAME,
      type: "article",
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.data.description,
      images: [SHARE_IMAGE.url],
    },
  };
}
