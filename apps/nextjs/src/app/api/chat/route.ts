import { z } from "zod";

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
    const { messages, markdown, ...params } = validatedData;
    const { collectionId, ...loremParams } = params;

    // Handle case where messages might not be provided
    const userQueryFromMessages = messages ? extractUserQuery(messages) : "";
    const userQuery =
      userQueryFromMessages ||
      (markdown ? "Parse provided markdown" : "Generate lorem ipsum text");
    if (!userQuery) {
      return new Response("No user message found", { status: 400 });
    }

    if (typeof markdown === "string") {
      if (!markdown.trim().length) {
        return new Response("Markdown content is empty", { status: 400 });
      }

      return await handleMarkdownParsing(markdown, userQuery);
    }

    // Check if an id is provided, if not, use lorem ipsum generation
    if (!collectionId) {
      // Handle lorem ipsum generation
      return await handleLoremGeneration(userQuery, loremParams);
    }

    // Handle chat query
    try {
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

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        `Validation error: ${error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        { status: 400 },
      );
    }

    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}
