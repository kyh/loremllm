import { buildSitemapEntries } from "@/lib/agent/sitemap-entries";

import type { MetadataRoute } from "next";

// Prerendered at build, so every entry carries the deploy date.
const sitemap = (): MetadataRoute.Sitemap => buildSitemapEntries(new Date());

export default sitemap;
