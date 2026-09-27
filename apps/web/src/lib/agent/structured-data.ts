import { siteConfig } from "@/lib/site-config";

import { absoluteUrl } from "./markdown";
import { siteSummary } from "./site-overview";

import type { ProsePage } from "./site-pages";

/**
 * A JSON-LD document: plain JSON, no wider than JSON actually is. `undefined`
 * is included because `JSON.stringify` drops those properties.
 */
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export interface JsonLdNode {
  [key: string]: JsonLdValue;
}

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;
const APPLICATION_ID = `${siteConfig.url}/#application`;

/**
 * `Organization` is the identity every other node points back at. There is
 * deliberately no `address`: LoremLLM is a personal open-source project with
 * no business premises, and inventing a PostalAddress to satisfy a validator
 * would be worse than omitting one.
 */
export const buildOrganization = () =>
  ({
    "@id": ORGANIZATION_ID,
    "@type": "Organization",
    contactPoint: [
      {
        "@type": "ContactPoint",
        availableLanguage: ["en"],
        contactType: "customer support",
        email: siteConfig.email,
        url: absoluteUrl("/contact"),
      },
      {
        "@type": "ContactPoint",
        availableLanguage: ["en"],
        contactType: "technical support",
        email: siteConfig.email,
        url: `${siteConfig.repository}/issues`,
      },
    ],
    description: siteSummary,
    email: siteConfig.email,
    founder: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.author.url,
    },
    image: `${siteConfig.url}/og.jpg`,
    logo: {
      "@type": "ImageObject",
      height: 96,
      url: `${siteConfig.url}/favicon/favicon-96x96.png`,
      width: 96,
    },
    name: siteConfig.name,
    sameAs: siteConfig.sameAs,
    url: siteConfig.url,
  }) satisfies JsonLdNode;

export const buildWebSite = () =>
  ({
    "@id": WEBSITE_ID,
    "@type": "WebSite",
    description: siteConfig.description,
    inLanguage: "en-US",
    name: siteConfig.name,
    publisher: { "@id": ORGANIZATION_ID },
    url: siteConfig.url,
  }) satisfies JsonLdNode;

export const buildSoftwareApplication = () =>
  ({
    "@id": APPLICATION_ID,
    "@type": "SoftwareApplication",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "LLM response mocking",
    codeRepository: siteConfig.repository,
    description: siteSummary,
    featureList: [
      "Collections of input/output pairs matched by embedding similarity",
      "Streaming HTTP API in the AI SDK UI message format",
      "Lorem ipsum and markdown streaming with no account",
      "@loremllm/transport chat transport for the Vercel AI SDK",
      "eve-protocol host per collection",
    ],
    isAccessibleForFree: true,
    name: siteConfig.name,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      price: "0",
      priceCurrency: "USD",
    },
    operatingSystem: "Any",
    publisher: { "@id": ORGANIZATION_ID },
    url: siteConfig.url,
  }) satisfies JsonLdNode;

export const buildHomeGraph = () =>
  ({
    "@context": "https://schema.org",
    "@graph": [buildOrganization(), buildWebSite(), buildSoftwareApplication()],
  }) satisfies JsonLdNode;

export const buildWebPage = (page: ProsePage) =>
  ({
    "@id": `${absoluteUrl(page.path)}#webpage`,
    "@type": "WebPage",
    about: { "@id": APPLICATION_ID },
    description: page.description,
    headline: page.heading,
    inLanguage: "en-US",
    isPartOf: { "@id": WEBSITE_ID },
    name: page.title,
    url: absoluteUrl(page.path),
  }) satisfies JsonLdNode;

export const buildProsePageGraph = (page: ProsePage) =>
  ({
    "@context": "https://schema.org",
    "@graph": [buildOrganization(), buildWebPage(page)],
  }) satisfies JsonLdNode;

/**
 * `JSON.stringify` output is dropped into a `<script>` body, so any `<` that
 * could start a `</script>` is escaped. `<` parses back to `<`.
 */
export const serializeJsonLd = (node: JsonLdNode): string =>
  JSON.stringify(node).replaceAll("<", "\\u003c");
