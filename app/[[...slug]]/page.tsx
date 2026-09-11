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
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getMarkdownUrl(page);
  const githubUrl = getGithubUrl(page);

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
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

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url,
      siteName: SITE_NAME,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
    },
  };
}
