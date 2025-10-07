import { handleChatQuery } from "./chat-handler";
import { handleLoremGeneration } from "./lorem-handler";
import { handleMarkdownParsing } from "./markdown-handler";
import { LoremParamsSchema } from "./schema";
import { extractUserQuery } from "./utils";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    // Validate and parse the request body using Zod schema
    const validatedData = LoremParamsSchema.parse(body);

    const { messages, collectionId, markdown, ...params } = validatedData;

    // Handle markdown parsing
    if (typeof markdown === "string" && markdown.trim().length) {
      return await handleMarkdownParsing(markdown);
    }

    // If there's no collection id, use lorem ipsum generation
    if (!collectionId) {
      return await handleLoremGeneration(params);
    }

    // Handle chat query
    try {
      const userQuery = extractUserQuery(messages ?? []);

      return await handleChatQuery(userQuery, collectionId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "No matching response found"
      ) {
        return new Response("No matching response found", { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error processing request:", error);

    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}
