import { problemResponse } from "@/lib/problem";
import { siteConfig } from "@/lib/site-config";

/**
 * Unmatched `/api/*` paths answer like the API they sit under — a JSON problem
 * document — instead of falling through to the HTML 404 page.
 */
const notFound = (request: Request) =>
  problemResponse(
    404,
    `No API route at ${new URL(request.url).pathname}. See ${siteConfig.url}/docs and ${siteConfig.url}/openapi.json.`,
  );

export const DELETE = notFound;
export const GET = notFound;
export const HEAD = notFound;
export const PATCH = notFound;
export const POST = notFound;
export const PUT = notFound;
