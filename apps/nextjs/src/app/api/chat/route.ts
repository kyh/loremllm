import { handleChatQuery } from "./chat-handler";
import { handleLoremGeneration } from "./lorem-handler";
import { handleMarkdownParsing } from "./markdown-handler";
import { parseRequestPayload } from "./schema";
import { extractUserQuery } from "./utils";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function applyCors(response: Response) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) =>
    response.headers.set(key, value),
  );
  return response;
}

export function OPTIONS(_request: Request) {
  const response = new Response(null, { status: 200 });
  return applyCors(response);
}

export function GET(_request: Request) {
  const response = new Response("Hello, world!", { status: 200 });
  return applyCors(response);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    const payload = parseRequestPayload(body);

    switch (payload.type) {
      case "markdown": {
        const response = await handleMarkdownParsing(payload.data.markdown);
        return applyCors(response);
      }
      case "chat": {
        try {
          const userQuery = extractUserQuery(payload.data.messages ?? []);

          const response = await handleChatQuery(
            userQuery,
            payload.data.collectionId,
          );
          return applyCors(response);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "No matching response found"
          ) {
            return applyCors(
              new Response("No matching response found", { status: 404 }),
            );
          }
          throw error;
        }
      }
      case "lorem": {
        const { messages: _messages, ...params } = payload.data;
        const response = await handleLoremGeneration(params);
        return applyCors(response);
      }
      default: {
        // Exhaustive check in case a new payload type is added in the future
        const _exhaustiveCheck: never = payload;
        return _exhaustiveCheck;
      }
    }
  } catch (error) {
    console.error("Error processing request:", error);

    return applyCors(
      new Response(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        { status: 500 },
      ),
    );
  }
}
