import { ogImage, ogVideo, siteConfig } from "@/lib/site-config";

import type { ProsePage } from "./site-pages";

import type { Metadata } from "next";

// WARNING: a page's `openGraph` replaces the layout's whole object, so these return complete values or og:image is lost.

/** An explicit canonical, plus the Markdown representation the proxy serves from the same URL. */
export const canonicalAlternates = (path: string) =>
  ({
    canonical: path,
    types: { "text/markdown": path === "/" ? "/index.md" : `${path}.md` },
  }) satisfies Metadata["alternates"];

export interface PageImage {
  alt: string;
  height: number;
  url: string;
  width: number;
}

/** Where a prose page's own Open Graph card is served (`app/api/og/[slug]/route.tsx`). */
export const prosePageImagePath = (page: ProsePage) => `/api/og${page.path}`;

/** A prose page's own card, as `og:image` / `twitter:image` metadata. */
export const prosePageImage = (page: ProsePage) =>
  ({
    alt: `${page.title} — ${page.description}`,
    height: 630,
    url: prosePageImagePath(page),
    width: 1200,
  }) satisfies PageImage;

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
) =>
  ({
    description,
    images: [image],
    locale: "en-US",
    siteName: siteConfig.name,
    title,
    type: "website",
    url: path,
  }) satisfies Metadata["openGraph"];

export const pageTwitter = (
  title: string = siteConfig.name,
  description: string = siteConfig.description,
  image: PageImage = ogImage,
) =>
  ({
    card: "summary_large_image",
    creator: siteConfig.twitter,
    description,
    images: [image],
    title,
  }) satisfies Metadata["twitter"];
