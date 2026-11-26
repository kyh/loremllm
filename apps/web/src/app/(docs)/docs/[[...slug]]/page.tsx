import { notFound } from "next/navigation";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";

import { canonicalAlternates, pageOpenGraph, pageTwitter } from "@/lib/agent/page-metadata";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

import type { Metadata } from "next";

export const ensureStatic = "navigation";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

const Page = async (props: PageProps) => {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const MDXContent = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
};

export const generateStaticParams = () => source.generateParams();

export const generateMetadata = async (props: PageProps) => {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const description = page.data.description ?? "";

  return {
    alternates: canonicalAlternates(page.url),
    description,
    openGraph: { ...pageOpenGraph(page.url, page.data.title, description), type: "article" },
    title: page.data.title,
    twitter: pageTwitter(page.data.title, description),
  } satisfies Metadata;
};

export default Page;
