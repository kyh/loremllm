import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";

import { createStreamChunks, parseMarkdownIntoChunks } from "./utils";

/**
 * Handle chat functionality by querying a collection
 */
export const handleChatQuery = async (
  userQuery: string,
  collectionId: string,
) => {
  // Dynamically import caller only when needed
  const { caller } = await import("@/trpc/server");

  // Query the specified collection for the best matching interaction
  const queryResult = await caller.interaction.query({
    publicId: collectionId,
    query: userQuery,
    limit: 1,
  });

  const bestMatch = queryResult.matches[0];
  if (!bestMatch) {
    throw new Error("No matching response found");
  }

  // Parse the markdown output into word-level chunks for streaming
  const output = bestMatch.output;
  const chunks = parseMarkdownIntoChunks(output);
  const streamChunks = createStreamChunks(chunks, userQuery, output);

  const result = streamText({
    prompt: userQuery,
    model: new MockLanguageModelV3({
      doStream: async () => {
        return {
          stream: simulateReadableStream({
            chunks: streamChunks,
            chunkDelayInMs: 20,
          }),
        };
      },
    }),
  });

  return result.toUIMessageStreamResponse();
};
