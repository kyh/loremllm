import { Fragment } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { ProseLink } from "@/components/prose-link";
import { canonicalAlternates, pageOpenGraph, pageTwitter } from "@/lib/agent/page-metadata";
import { buildProsePageGraph } from "@/lib/agent/structured-data";

import type { ProseBlock, ProseListItem, ProsePage } from "@/lib/agent/site-pages";
import type { Metadata } from "next";

import { HoverText } from "./hover-text";
import { SiteFooter } from "./site-footer";

/**
 * Renders a `ProsePage` — the same definition the Markdown representation is
 * built from, so `/privacy` and `/privacy` with `Accept: text/markdown` never
 * drift apart.
 */

export const prosePageMetadata = (page: ProsePage): Metadata => ({
  alternates: canonicalAlternates(page.path),
  description: page.description,
  openGraph: pageOpenGraph(page.path, page.title, page.description),
  title: page.title,
  twitter: pageTwitter(page.title, page.description),
});

const linkClassName = "underline underline-offset-4";

/** Turns `a \`b\` c` into `a <code>b</code> c`. Nothing else in the copy is markup. */
const withInlineCode = (text: string): ReactNode =>
  text.split("`").map((segment, index) =>
    index % 2 === 1 ? (
      <code key={index} className="bg-muted rounded px-1 py-0.5">
        {segment}
      </code>
    ) : (
      <Fragment key={index}>{segment}</Fragment>
    ),
  );

const ProseItem = ({ item }: { item: ProseListItem }) => (
  <li>
    {item.href ? (
      <ProseLink className={linkClassName} href={item.href}>
        {item.label}
      </ProseLink>
    ) : (
      <span className="text-foreground">{item.label}</span>
    )}
    {item.text ? <> — {withInlineCode(item.text)}</> : null}
  </li>
);

const ProseBlockView = ({ block }: { block: ProseBlock }) => {
  switch (block.kind) {
    case "heading": {
      return <h2 className="text-heading mt-4 text-xs uppercase">{block.text}</h2>;
    }
    case "list": {
      return (
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {block.items.map((item) => (
            <ProseItem key={item.label} item={item} />
          ))}
        </ul>
      );
    }
    case "code": {
      return (
        <pre className="bg-muted overflow-x-auto rounded p-4 text-xs">
          <code>{block.text}</code>
        </pre>
      );
    }
    case "paragraph": {
      return <p>{withInlineCode(block.text)}</p>;
    }
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
};

export const ProsePageView = ({ page }: { page: ProsePage }) => (
  <div className="flex min-h-dvh flex-col gap-10 px-8 pt-8">
    <JsonLd node={buildProsePageGraph(page)} />
    <nav className="text-sm">
      <HoverText asChild>
        <Link href="/">[LoremLLM]</Link>
      </HoverText>
    </nav>
    <main className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl">{page.heading}</h1>
      <div className="flex flex-col gap-4 border-t pt-4 leading-relaxed">
        {page.blocks.map((block, index) => (
          <ProseBlockView key={index} block={block} />
        ))}
      </div>
    </main>
    <SiteFooter />
  </div>
);
