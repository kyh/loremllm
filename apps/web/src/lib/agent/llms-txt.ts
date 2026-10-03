import { siteConfig } from "@/lib/site-config";

import { pageLinks, renderList, termsLink } from "./markdown";
import {
  agentEndpoints,
  siteIntroParagraphs,
  siteSummary,
  siteUsageParagraphs,
  whenToUse,
} from "./site-overview";

/**
 * `/llms.txt`, to the llmstxt.org format: an H1, a blockquote summary, then
 * free-form sections containing no headings, then H2-delimited link lists.
 *
 * The when-to-use guidance is deliberately in the pre-H2 block rather than
 * under its own `##` — the spec reserves H2 sections for link lists.
 */
export const renderLlmsTxt = (): string => {
  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteSummary}`,
    "",
    ...siteIntroParagraphs.flatMap((paragraph) => [paragraph, ""]),
    `**When to use ${siteConfig.name}:**`,
    "",
    renderList(whenToUse),
    "",
    ...siteUsageParagraphs.flatMap((paragraph) => [paragraph, ""]),
    "## Docs",
    "",
    renderList([
      {
        href: "/docs",
        label: "API reference",
        text: "POST /api/chat request types, streaming format, errors, eve endpoint",
      },
      { href: "/openapi.json", label: "OpenAPI 3.1 spec", text: "the /api/chat contract" },
      {
        href: `${siteConfig.repository}/blob/main/packages/transport/README.md`,
        label: "@loremllm/transport README",
        text: "the AI SDK chat transport, every option with examples",
      },
    ]),
    "",
    "## Pages",
    "",
    renderList([
      { href: "/", label: "Home", text: "overview and live demos" },
      ...pageLinks,
      termsLink,
    ]),
    "",
    "## Machine-readable endpoints",
    "",
    renderList(agentEndpoints),
    "",
    "## Optional",
    "",
    renderList([
      { href: siteConfig.repository, label: "Source code", text: "the whole project, on GitHub" },
      { href: siteConfig.npmPackage, label: "npm package", text: "@loremllm/transport" },
      {
        href: `${siteConfig.repository}/issues`,
        label: "Issue tracker",
        text: "bugs and requests",
      },
    ]),
  ];

  return `${lines.join("\n").trimEnd()}\n`;
};
