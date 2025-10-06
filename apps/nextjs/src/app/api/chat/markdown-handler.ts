import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV2 } from "ai/test";

import { createStreamChunks, parseMarkdownIntoChunks } from "./utils";

/**
 * Handle streaming markdown parsing response
 */
export const handleMarkdownParsing = async (
  markdown: string,
  userQuery: string,
) => {
  const normalizedMarkdown = markdown.trim();

  if (!normalizedMarkdown.length) {
    throw new Error("Markdown content is empty");
  }

  const chunks = parseMarkdownIntoChunks(normalizedMarkdown);
  const streamChunks = createStreamChunks(
    chunks,
    userQuery,
    normalizedMarkdown,
  );

  const result = streamText({
    prompt: userQuery,
    model: new MockLanguageModelV2({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: streamChunks,
          chunkDelayInMs: 20,
        }),
      }),
    }),
  });

  return result.toUIMessageStreamResponse();
};
