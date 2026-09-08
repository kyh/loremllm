import { COMMON_ERROR_STATUS_MAP, ORPCError } from "@orpc/server";

import { handleChatQuery } from "./chat-handler";
import { handleLoremGeneration } from "./lorem-handler";
import { handleMarkdownParsing } from "./markdown-handler";
import { parseRequestPayload, PayloadError } from "./schema";
import { extractUserQuery } from "./utils";

// oRPC's own code-to-HTTP mapping, widened because `ORPCError["code"]` admits
// any string: a caller's custom code lands on the 500 fallback instead of
// indexing off the end of the map.
const orpcErrorStatus: Record<string, number | undefined> = COMMON_ERROR_STATUS_MAP;

const applyCors = (response: Response, origin?: string) => {
  const headers = new Headers(response.headers);
  // Add/override CORS headers
  headers.set("Access-Control-Allow-Origin", origin ?? "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

export const OPTIONS = (request: Request) => {
  const origin = request.headers.get("origin") ?? undefined;
  return applyCors(new Response(null, { status: 200 }), origin);
};

export const GET = (request: Request) => {
  const origin = request.headers.get("origin") ?? undefined;
  return applyCors(new Response("Hello, world!", { status: 200 }), origin);
};

export const POST = async (request: Request) => {
  const origin = request.headers.get("origin") ?? undefined;
  try {
    const payload = parseRequestPayload(await request.json());

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
            return applyCors(new Response("No matching response found", { status: 404 }), origin);
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
      new Response(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, {
        status,
      }),
      origin,
    );
  }
};
