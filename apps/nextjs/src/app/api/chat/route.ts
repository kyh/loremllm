import { handleChatQuery } from "./chat-handler";
import { handleLoremGeneration } from "./lorem-handler";
import { handleMarkdownParsing } from "./markdown-handler";
import { parseRequestPayload } from "./schema";
import { extractUserQuery } from "./utils";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    const payload = parseRequestPayload(body);

    switch (payload.type) {
      case "markdown": {
        return await handleMarkdownParsing(payload.data.markdown);
      }
      case "chat": {
        try {
          const userQuery = extractUserQuery(payload.data.messages ?? []);

          return await handleChatQuery(userQuery, payload.data.collectionId);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "No matching response found"
          ) {
            return new Response("No matching response found", { status: 404 });
          }
          throw error;
        }
      }
      case "lorem": {
        const { messages: _messages, ...params } = payload.data;
        return await handleLoremGeneration(params);
      }
      default: {
        // Exhaustive check in case a new payload type is added in the future
        const _exhaustiveCheck: never = payload;
        return _exhaustiveCheck;
      }
    }
  } catch (error) {
    console.error("Error processing request:", error);

    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}
