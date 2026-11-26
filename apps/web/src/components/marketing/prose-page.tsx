import { Fragment } from "react";

import { JsonLd } from "@/components/json-ld";
import { ProseLink } from "@/components/prose-link";
import { parseInlineMarks } from "@/lib/agent/inline-marks";
import {
  canonicalAlternates,
  pageOpenGraph,
  pageTwitter,
  prosePageImage,
} from "@/lib/agent/page-metadata";
import { headingId } from "@/lib/agent/site-pages";
import { buildProsePageGraph } from "@/lib/agent/structured-data";

import type { ProseBlock, ProseListItem, ProsePage } from "@/lib/agent/site-pages";
import type { Metadata } from "next";

import { wrapperClass } from "./landing-sections";
import { MarketingShell } from "./marketing-shell";

/**
 * Renders a `ProsePage` — the same definition the Markdown representation is
 * built from, so `/privacy` and `/privacy` with `Accept: text/markdown` never
 * drift apart.
 */

export const prosePageMetadata = (page: ProsePage) =>
  ({
    alternates: canonicalAlternates(page.path),
    description: page.description,
    openGraph: {
      ...pageOpenGraph(page.path, page.title, page.description, prosePageImage(page)),
      type: page.structuredDataType === "TechArticle" ? "article" : "website",
    },
    title: page.title,
    twitter: pageTwitter(page.title, page.description, prosePageImage(page)),
  }) satisfies Metadata;

const linkClassName =
  "text-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:text-muted-foreground duration-300";

const withInlineMarks = (text: string) =>
  parseInlineMarks(text).map((mark, index) => {
    switch (mark.kind) {
      case "code": {
        return (
          <code
            key={index}
            className="bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[0.9em]"
          >
            {mark.text}
          </code>
        );
      }

      case "strong": {
        return (
          <strong key={index} className="text-foreground font-medium">
            {mark.text}
          </strong>
        );
      }

      case "link": {
        return (
          <ProseLink key={index} className={linkClassName} href={mark.href}>
            {mark.text}
          </ProseLink>
        );
      }

      case "text": {
        return <Fragment key={index}>{mark.text}</Fragment>;
      }

      default: {
        const exhaustive: never = mark;

        return exhaustive;
      }
    }
  });

const ProseItem = ({ item }: { item: ProseListItem }) => (
  <li>
    {item.href !== undefined && item.href !== "" ? (
      <ProseLink className={linkClassName} href={item.href}>
        {item.label}
      </ProseLink>
    ) : (
      <span className="text-foreground">{item.label}</span>
    )}
    {item.text !== undefined && item.text !== "" ? <> — {withInlineMarks(item.text)}</> : null}
  </li>
);

const ProseBlockView = ({ block }: { block: ProseBlock }) => {
  switch (block.kind) {
    case "heading": {
      return (
        <h2
          id={headingId(block.text)}
          className="text-foreground mt-8 scroll-mt-20 text-xl font-medium tracking-tight"
        >
          {block.text}
        </h2>
      );
    }

    case "subheading": {
      return <h3 className="text-foreground mt-4 text-base font-medium">{block.text}</h3>;
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

    case "bullets": {
      return (
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {block.items.map((item, index) => (
            <li key={index}>{withInlineMarks(item)}</li>
          ))}
        </ul>
      );
    }

    case "table": {
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl border-collapse text-left text-sm">
            <thead>
              <tr>
                {block.columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="border-muted text-foreground border p-2 align-top font-medium"
                  >
                    {withInlineMarks(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-muted border p-2 align-top">
                      {withInlineMarks(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "code": {
      return (
        <pre className="bg-muted text-foreground overflow-x-auto rounded-2xl p-6 font-mono text-xs leading-relaxed">
          <code>{block.text}</code>
        </pre>
      );
    }

    case "paragraph": {
      return <p>{withInlineMarks(block.text)}</p>;
    }

    default: {
      const exhaustive: never = block;

      return exhaustive;
    }
  }
};

export const ProsePageView = ({ page }: { page: ProsePage }) => (
  <MarketingShell>
    <JsonLd node={buildProsePageGraph(page)} />
    <div className={wrapperClass}>
      <header className="pt-32 pb-12">
        <h1 className="text-foreground text-4xl font-medium tracking-tight text-balance md:text-5xl lg:text-6xl">
          {page.heading}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-base text-pretty">
          {page.description}
        </p>
      </header>
      <article className="border-muted text-muted-foreground flex max-w-2xl flex-col gap-4 border-t pt-8 pb-24 text-base leading-relaxed">
        {page.blocks.map((block, index) => (
          <ProseBlockView key={index} block={block} />
        ))}
      </article>
    </div>
  </MarketingShell>
);
