import { cacheLife } from "next/cache";

import { buildSitemapEntries } from "@/lib/agent/sitemap-entries";

import type { MetadataRoute } from "next";

// oxlint-disable-next-line require-await -- a "use cache" function must be async
const sitemap = async () => {
  "use cache";
  cacheLife("max");

  return buildSitemapEntries(new Date()) satisfies MetadataRoute.Sitemap;
};

export default sitemap;
