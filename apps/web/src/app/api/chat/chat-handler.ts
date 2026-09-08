import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";

import { createStreamChunks, parseMarkdownIntoChunks } from "./utils";

/**
 * Handle chat functionality by querying a collection
 */
export const handleChatQuery = async (userQuery: string, collectionId: string) => {
  // Dynamically import caller only when needed
  const { caller } = await import("@/orpc/server");

  // Query the specified collection for the best matching interaction
  const queryResult = await caller.interaction.query({
    limit: 1,
    publicId: collectionId,
    query: userQuery,
  });

  const [bestMatch] = queryResult.matches;
  if (!bestMatch) {
    throw new Error("No matching response found");
  }

  // Parse the markdown output into word-level chunks for streaming
  const { output } = bestMatch;
  const chunks = parseMarkdownIntoChunks(output);
  const streamChunks = createStreamChunks(chunks, userQuery, output);

  const result = streamText({
    model: new MockLanguageModelV3({
      doStream: () =>
        Promise.resolve({
          stream: simulateReadableStream({
            chunkDelayInMs: 20,
            chunks: streamChunks,
          }),
        }),
    }),
    prompt: userQuery,
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type !== "finish") {
        return;
      }

      return {
        interactionId: bestMatch.id,
        similarity: bestMatch.similarity,
        title: bestMatch.title,
      };
    },
  });
};
