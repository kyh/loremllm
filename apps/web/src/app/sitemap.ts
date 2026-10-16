import { cacheLife } from "next/cache";

import { buildSitemapEntries } from "@/lib/agent/sitemap-entries";

import type { MetadataRoute } from "next";

// Cached and prerendered at build, so entries carry the deploy date (refreshed at most
// once a cacheLife("max") period).
// oxlint-disable-next-line require-await -- a "use cache" function must be async
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  "use cache";
  cacheLife("max");
  return buildSitemapEntries(new Date());
};

export default sitemap;
