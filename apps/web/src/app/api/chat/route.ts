import { COMMON_ERROR_STATUS_MAP, ORPCError } from "@orpc/server";

import { problemResponse } from "@/lib/problem";
import { siteConfig } from "@/lib/site-config";

import { handleChatQuery } from "./chat-handler";
import { handleLoremGeneration } from "./lorem-handler";
import { handleMarkdownParsing } from "./markdown-handler";
import { parseRequestPayload, PayloadError } from "./schema";
import type { JsonBody } from "./schema";
import { extractUserQuery } from "./utils";

// oRPC's own code-to-HTTP mapping, widened because `ORPCError["code"]` admits
// any string: a caller's custom code lands on the 500 fallback instead of
// indexing off the end of the map.
const orpcErrorStatus: Record<string, number | undefined> = COMMON_ERROR_STATUS_MAP;

const applyCors = (response: Response, origin?: string) => {
  const headers = new Headers(response.headers);
  // Add/override CORS headers
  headers.set("Access-Control-Allow-Origin", origin ?? "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Add credentials if a specific origin is used
  if (origin) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

const readJsonBody = async (request: Request): Promise<JsonBody> => {
  try {
    return await request.json();
  } catch {
    throw new PayloadError("Request body must be valid JSON");
  }
};

export const OPTIONS = (request: Request) => {
  const origin = request.headers.get("origin") ?? undefined;
  return applyCors(new Response(null, { status: 200 }), origin);
};

export const GET = (request: Request) => {
  const origin = request.headers.get("origin") ?? undefined;
  return applyCors(
    problemResponse(405, `Use POST with a JSON body. See ${siteConfig.url}/docs.`, {
      Allow: "POST, OPTIONS",
    }),
    origin,
  );
};

export const POST = async (request: Request) => {
  const origin = request.headers.get("origin") ?? undefined;
  try {
    const payload = parseRequestPayload(await readJsonBody(request));

    switch (payload.type) {
      case "markdown": {
        const response = await handleMarkdownParsing(payload.data.markdown);
        return applyCors(response, origin);
      }
      case "chat": {
        try {
          const userQuery = extractUserQuery(payload.data.messages ?? []);

          const response = await handleChatQuery(userQuery, payload.data.collectionId);
          return applyCors(response, origin);
        } catch (error) {
          if (error instanceof Error && error.message === "No matching response found") {
            return applyCors(problemResponse(404, "No matching response found"), origin);
          }
          throw error;
        }
      }
      case "lorem": {
        const { messages: _messages, ...params } = payload.data;
        const response = await handleLoremGeneration(params);
        return applyCors(response, origin);
      }
      default: {
        // Exhaustive check in case a new payload type is added in the future
        const _exhaustiveCheck: never = payload;
        return _exhaustiveCheck;
      }
    }
  } catch (error) {
    console.error("Error processing request:", error);

    let status = 500;
    if (error instanceof PayloadError) {
      status = 400;
    } else if (error instanceof ORPCError) {
      status = orpcErrorStatus[error.code] ?? 500;
    }

    return applyCors(
      problemResponse(status, error instanceof Error ? error.message : "Unknown error"),
      origin,
    );
  }
};
