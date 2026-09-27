import { absoluteUrl } from "./markdown";
import { prosePages } from "./site-pages";

import type { MetadataRoute } from "next";

export type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * Every indexable URL. `lastModified` is passed in rather than read from the
 * clock, so the builder stays pure and a deploy stamps one consistent date.
 */
export const buildSitemapEntries = (lastModified: Date): SitemapEntry[] => [
  { changeFrequency: "weekly", lastModified, priority: 1, url: absoluteUrl("/") },
  ...prosePages.map((page) => ({
    changeFrequency: "monthly" as const,
    lastModified,
    priority: page.sitemapPriority ?? 0.5,
    url: absoluteUrl(page.path),
  })),
  { changeFrequency: "yearly", lastModified, priority: 0.3, url: absoluteUrl("/auth/register") },
];
