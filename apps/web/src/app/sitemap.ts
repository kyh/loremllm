import { buildSitemapEntries } from "@/lib/agent/sitemap-entries";

import type { MetadataRoute } from "next";

const sitemap = () => {
  const builtAt = process.env.BUILT_AT;

  if (builtAt === undefined || builtAt === "") {
    throw new Error("BUILT_AT is unset: next.config.ts stamps it on every build");
  }

  return buildSitemapEntries(new Date(builtAt)) satisfies MetadataRoute.Sitemap;
};

export default sitemap;
