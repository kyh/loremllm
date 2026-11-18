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

/** Off-site URLs, `mailto:` and in-page `#anchors` pass through; site paths gain the origin. */
export const absoluteUrl = (path: string) =>
  path.startsWith("http") || path.startsWith("mailto:") || path.startsWith("#")
    ? path
    : `${siteConfig.url}${path}`;

const renderInline = (text: string) => inlineMarksToMarkdown(text, absoluteUrl);

const renderListItem = (item: ProseListItem) => {
  const label = item.href ? `[${item.label}](${absoluteUrl(item.href)})` : `**${item.label}**`;

  return item.text ? `- ${label}: ${renderInline(item.text)}` : `- ${label}`;
};

export const renderList = (items: ProseListItem[]) => items.map(renderListItem).join("\n");

const renderTableRow = (cells: string[]) =>
  `| ${cells.map((cell) => renderInline(cell).replaceAll("|", "\\|")).join(" | ")} |`;

const renderTable = (columns: string[], rows: string[][]) =>
  [
    renderTableRow(columns),
    `|${columns.map(() => " --- |").join("")}`,
    ...rows.map(renderTableRow),
  ].join("\n");

const renderBlock = (block: ProseBlock) => {
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

const withTrailingNewline = (body: string) => `${body.trimEnd()}\n`;

export const pageLinks: ProseListItem[] = [
  { href: "/docs", label: "Docs", text: "the API and the npm transport, with examples" },
  { href: "/about", label: "About", text: "what this is and who builds it" },
  { href: "/contact", label: "Contact", text: "email and GitHub" },
  { href: "/privacy", label: "Privacy Policy", text: "what is collected and who processes it" },
];

/** Listed only where agents read (llms.txt, the Markdown home), never in the footer. */
export const termsLink: ProseListItem = {
  href: "/terms",
  label: "Terms of Use",
  text: "the terms for using the site and its API",
};

export const renderProsePageMarkdown = (page: ProsePage) =>
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

export const renderHomeMarkdown = () =>
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
      renderList([...pageLinks, termsLink]),
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

export const renderNotFoundMarkdown = (pathname: string) =>
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
