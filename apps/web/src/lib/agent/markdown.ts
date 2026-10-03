import { siteConfig } from "@/lib/site-config";

import { inlineMarksToMarkdown } from "./inline-marks";
import {
  agentEndpoints,
  siteIntroParagraphs,
  siteSummary,
  siteUsageParagraphs,
  whenToUse,
} from "./site-overview";

import type { ProseBlock, ProseListItem, ProsePage } from "./site-pages";

/**
 * Markdown representations of the site, served from the same URLs as the HTML
 * via `Accept: text/markdown` (see `src/proxy.ts`). Pure string building.
 */

/** Off-site URLs, `mailto:` and in-page `#anchors` pass through; site paths gain the origin. */
export const absoluteUrl = (path: string): string =>
  path.startsWith("http") || path.startsWith("mailto:") || path.startsWith("#")
    ? path
    : `${siteConfig.url}${path}`;

/** Copy as Markdown: its inline marks unchanged, its on-site links made absolute. */
const renderInline = (text: string): string => inlineMarksToMarkdown(text, absoluteUrl);

const renderListItem = (item: ProseListItem): string => {
  const label = item.href ? `[${item.label}](${absoluteUrl(item.href)})` : `**${item.label}**`;
  return item.text ? `- ${label}: ${renderInline(item.text)}` : `- ${label}`;
};

export const renderList = (items: ProseListItem[]): string => items.map(renderListItem).join("\n");

/** A GFM table row; a pipe inside a cell is escaped so it cannot split the cell. */
const renderTableRow = (cells: string[]): string =>
  `| ${cells.map((cell) => renderInline(cell).replaceAll("|", "\\|")).join(" | ")} |`;

const renderTable = (columns: string[], rows: string[][]): string =>
  [
    renderTableRow(columns),
    `|${columns.map(() => " --- |").join("")}`,
    ...rows.map(renderTableRow),
  ].join("\n");

const renderBlock = (block: ProseBlock): string => {
  switch (block.kind) {
    case "heading": {
      return `## ${block.text}`;
    }
    case "subheading": {
      return `### ${block.text}`;
    }
    case "list": {
      return renderList(block.items);
    }
    case "bullets": {
      return block.items.map((item) => `- ${renderInline(item)}`).join("\n");
    }
    case "table": {
      return renderTable(block.columns, block.rows);
    }
    case "code": {
      return `\`\`\`${block.language}\n${block.text}\n\`\`\``;
    }
    case "paragraph": {
      return renderInline(block.text);
    }
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
};

const withTrailingNewline = (body: string): string => `${body.trimEnd()}\n`;

export const pageLinks: ProseListItem[] = [
  { href: "/docs", label: "Docs", text: "the API and the npm transport, with examples" },
  { href: "/about", label: "About", text: "what this is and who builds it" },
  { href: "/contact", label: "Contact", text: "email and GitHub" },
  { href: "/privacy", label: "Privacy Policy", text: "what is collected and who processes it" },
];

export const renderProsePageMarkdown = (page: ProsePage): string =>
  withTrailingNewline(
    [
      `# ${page.heading}`,
      "",
      `> ${page.description}`,
      "",
      ...page.blocks.flatMap((block) => [renderBlock(block), ""]),
      "---",
      "",
      `[${siteConfig.name}](${siteConfig.url}) · [All pages](${absoluteUrl("/sitemap.xml")}) · [llms.txt](${absoluteUrl("/llms.txt")})`,
    ].join("\n"),
  );

export const renderHomeMarkdown = (): string =>
  withTrailingNewline(
    [
      `# ${siteConfig.name} — ${siteConfig.description}`,
      "",
      `> ${siteSummary}`,
      "",
      ...siteIntroParagraphs.flatMap((paragraph) => [paragraph, ""]),
      "## When to use this",
      "",
      renderList(whenToUse),
      "",
      "## How to use it",
      "",
      ...siteUsageParagraphs.flatMap((paragraph) => [paragraph, ""]),
      "## Machine-readable endpoints",
      "",
      renderList(agentEndpoints),
      "",
      "## Pages",
      "",
      renderList(pageLinks),
    ].join("\n"),
  );

/**
 * The body of a 404. Same list in both representations: the HTML `not-found`
 * page renders it too, so a dead URL hands a person and an agent the same
 * recovery paths.
 */
export const notFoundRecoveryLinks: ProseListItem[] = [
  { href: "/", label: "Home", text: "what LoremLLM is, with live demos" },
  { href: "/docs", label: "Docs", text: "the API reference" },
  { href: "/llms.txt", label: "/llms.txt", text: "site overview for agents" },
  { href: "/openapi.json", label: "/openapi.json", text: "the OpenAPI description of the API" },
  { href: "/sitemap.xml", label: "/sitemap.xml", text: "every indexable URL" },
  { href: "/contact", label: "Contact", text: "how to reach a human" },
];

export const renderNotFoundMarkdown = (pathname: string): string =>
  withTrailingNewline(
    [
      "# 404 — Page not found",
      "",
      `> \`${pathname}\` does not exist on ${siteConfig.url}.`,
      "",
      "Try one of these instead:",
      "",
      renderList(notFoundRecoveryLinks),
    ].join("\n"),
  );
