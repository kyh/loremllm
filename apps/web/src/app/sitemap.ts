import { absoluteUrl } from "@/lib/agent/markdown";
import { buildSitemapEntries } from "@/lib/agent/sitemap-entries";
import { source } from "@/lib/source";

import type { MetadataRoute } from "next";

const sitemap = () => {
  const builtAt = process.env.BUILT_AT;

  if (builtAt === undefined || builtAt === "") {
    throw new Error("BUILT_AT is unset: next.config.ts stamps it on every build");
  }

  const lastModified = new Date(builtAt);
  const entries = buildSitemapEntries(lastModified);
  const known = new Set(entries.map((entry) => entry.url));

  const docsEntries = source
    .getPages()
    .map((page) => absoluteUrl(page.url))
    .filter((url) => !known.has(url))
    .map((url) => ({ changeFrequency: "weekly" as const, lastModified, priority: 0.7, url }));

  return [...entries, ...docsEntries] satisfies MetadataRoute.Sitemap;
};

export default sitemap;
