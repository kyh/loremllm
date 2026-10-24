import { ogVideo, siteConfig } from "@/lib/site-config";

import { absoluteUrl } from "./markdown";
import { prosePageImagePath } from "./page-metadata";
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
const VIDEO_ID = `${siteConfig.url}/#video`;
const TRANSPORT_ID = `${siteConfig.url}/docs#transport`;

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

/** The home page's og:video, a capture of the real chat demo (`scripts/og-video.ts`). */
export const buildVideoObject = () =>
  ({
    "@id": VIDEO_ID,
    "@type": "VideoObject",
    contentUrl: ogVideo.url,
    description: ogVideo.description,
    duration: ogVideo.duration,
    height: ogVideo.height,
    name: ogVideo.name,
    publisher: { "@id": ORGANIZATION_ID },
    thumbnailUrl: ogVideo.poster,
    uploadDate: ogVideo.uploadDate,
    url: ogVideo.url,
    width: ogVideo.width,
  }) satisfies JsonLdNode;

export const buildHomeGraph = () =>
  ({
    "@context": "https://schema.org",
    "@graph": [
      buildOrganization(),
      buildWebSite(),
      { ...buildSoftwareApplication(), subjectOf: { "@id": VIDEO_ID } },
      buildVideoObject(),
    ],
  }) satisfies JsonLdNode;

const prosePageImageUrl = (page: ProsePage) => absoluteUrl(prosePageImagePath(page));

export const buildBreadcrumbList = (page: ProsePage) =>
  ({
    "@id": `${absoluteUrl(page.path)}#breadcrumb`,
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", item: absoluteUrl("/"), name: siteConfig.name, position: 1 },
      { "@type": "ListItem", item: absoluteUrl(page.path), name: page.title, position: 2 },
    ],
  }) satisfies JsonLdNode;

export const buildWebPage = (page: ProsePage) =>
  ({
    "@id": `${absoluteUrl(page.path)}#webpage`,
    "@type": "WebPage",
    about: { "@id": APPLICATION_ID },
    breadcrumb: { "@id": `${absoluteUrl(page.path)}#breadcrumb` },
    description: page.description,
    headline: page.heading,
    inLanguage: "en-US",
    isPartOf: { "@id": WEBSITE_ID },
    name: page.title,
    primaryImageOfPage: {
      "@type": "ImageObject",
      height: 630,
      url: prosePageImageUrl(page),
      width: 1200,
    },
    url: absoluteUrl(page.path),
  }) satisfies JsonLdNode;

/** `@loremllm/transport`, the npm package the docs document. It has no page of its own. */
export const buildTransportSourceCode = () =>
  ({
    "@id": TRANSPORT_ID,
    "@type": "SoftwareSourceCode",
    codeRepository: `${siteConfig.repository}/tree/main/packages/transport`,
    description:
      "A Vercel AI SDK chat transport that streams mocked responses in the browser, with no server.",
    isPartOf: { "@id": APPLICATION_ID },
    license: "https://opensource.org/licenses/MIT",
    name: "@loremllm/transport",
    programmingLanguage: "TypeScript",
    publisher: { "@id": ORGANIZATION_ID },
    runtimePlatform: "JavaScript",
    url: siteConfig.npmPackage,
  }) satisfies JsonLdNode;

export const buildTechArticle = (page: ProsePage) =>
  ({
    "@id": `${absoluteUrl(page.path)}#article`,
    "@type": "TechArticle",
    about: [{ "@id": APPLICATION_ID }, { "@id": TRANSPORT_ID }],
    author: { "@id": ORGANIZATION_ID },
    description: page.description,
    headline: page.heading,
    image: prosePageImageUrl(page),
    inLanguage: "en-US",
    isPartOf: { "@id": WEBSITE_ID },
    mainEntityOfPage: { "@id": `${absoluteUrl(page.path)}#webpage` },
    name: page.title,
    proficiencyLevel: "Beginner",
    publisher: { "@id": ORGANIZATION_ID },
    url: absoluteUrl(page.path),
  }) satisfies JsonLdNode;

export const buildProsePageGraph = (page: ProsePage) =>
  ({
    "@context": "https://schema.org",
    "@graph": [
      buildOrganization(),
      buildWebPage(page),
      buildBreadcrumbList(page),
      ...(page.structuredDataType === "TechArticle"
        ? [buildTechArticle(page), buildTransportSourceCode()]
        : []),
    ],
  }) satisfies JsonLdNode;

/**
 * `JSON.stringify` output is dropped into a `<script>` body, so any `<` that
 * could start a `</script>` is escaped. `<` parses back to `<`.
 */
export const serializeJsonLd = (node: JsonLdNode): string =>
  JSON.stringify(node).replaceAll("<", "\\u003c");
