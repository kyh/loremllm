import { z } from "zod";

import { handleChatQuery } from "./chat-handler";
import { handleLoremGeneration } from "./lorem-handler";
import { LoremParamsSchema } from "./schema";
import { extractUserQuery } from "./utils";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    // Validate and parse the request body using Zod schema
    const validatedData = LoremParamsSchema.parse(body);
    const { messages, ...params } = validatedData;

    // Handle case where messages might not be provided
    const userQuery = messages
      ? extractUserQuery(messages)
      : "Generate lorem ipsum text";
    if (!userQuery) {
      return new Response("No user message found", { status: 400 });
    }

    // Check if an id is provided, if not, use lorem ipsum generation
    const collectionId = params.collectionId;

    if (!collectionId) {
      // Handle lorem ipsum generation
      return await handleLoremGeneration(userQuery, params);
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
