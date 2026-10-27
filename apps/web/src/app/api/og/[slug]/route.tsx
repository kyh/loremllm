import { problemResponse } from "@/lib/problem";
import { prosePages } from "@/lib/agent/site-pages";

import { renderProseOgImage } from "./prose-og-image";

/**
 * `/api/og/<slug>`: each prose page's Open Graph card (`prosePageImage` in
 * `page-metadata.ts` points at it).
 */
export const generateStaticParams = () => prosePages.map((page) => ({ slug: page.path.slice(1) }));

export const GET = async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const page = prosePages.find((candidate) => candidate.path === `/${slug}`);
  if (!page) {
    return problemResponse(404, `No Open Graph image for /${slug}.`);
  }
  return renderProseOgImage(page);
};
