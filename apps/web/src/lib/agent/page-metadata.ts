import { ogImage, ogVideo, siteConfig } from "@/lib/site-config";

import type { ProsePage } from "./site-pages";

import type { Metadata } from "next";

/**
 * Per-page metadata helpers.
 *
 * Next merges `metadata` field by field at the top level: a page that exports
 * `openGraph` REPLACES the layout's entire object rather than merging into it,
 * which silently drops `og:type` and `og:image`. Both helpers always return
 * complete values so overriding a title can't cost a page its OG card.
 */

/** An explicit canonical, plus the Markdown representation the proxy serves from the same URL. */
export const canonicalAlternates = (path: string): Metadata["alternates"] => ({
  canonical: path,
  types: { "text/markdown": path === "/" ? "/index.md" : `${path}.md` },
});

export interface PageImage {
  alt: string;
  height: number;
  url: string;
  width: number;
}

/** Where a prose page's own Open Graph card is served (`app/api/og/[slug]/route.tsx`). */
export const prosePageImagePath = (page: ProsePage): string => `/api/og${page.path}`;

/** A prose page's own card, as `og:image` / `twitter:image` metadata. */
export const prosePageImage = (page: ProsePage): PageImage => ({
  alt: `${page.title} — ${page.description}`,
  height: 630,
  url: prosePageImagePath(page),
  width: 1200,
});

/** The home page's og:video, beside (never instead of) its og:image. */
export const homeOpenGraphVideos = [
  {
    height: ogVideo.height,
    secureUrl: ogVideo.url,
    type: ogVideo.type,
    url: ogVideo.url,
    width: ogVideo.width,
  },
];

export const pageOpenGraph = (
  path: string,
  title: string = siteConfig.name,
  description: string = siteConfig.description,
  image: PageImage = ogImage,
): Metadata["openGraph"] => ({
  description,
  images: [image],
  locale: "en-US",
  siteName: siteConfig.name,
  title,
  type: "website",
  url: path,
});

export const pageTwitter = (
  title: string = siteConfig.name,
  description: string = siteConfig.description,
  image: PageImage = ogImage,
): Metadata["twitter"] => ({
  card: "summary_large_image",
  creator: siteConfig.twitter,
  description,
  images: [image],
  title,
});
