import { buildOpenApiDocument } from "@/lib/agent/openapi";

export const dynamic = "force-static";

export const GET = () =>
  Response.json(buildOpenApiDocument(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
