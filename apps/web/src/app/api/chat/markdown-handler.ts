import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";

import { createStreamChunks, parseMarkdownIntoChunks } from "./utils";

/**
 * Handle streaming markdown parsing response
 */
export const handleMarkdownParsing = (markdown: string) => {
  const normalizedMarkdown = markdown.trim();

  if (!normalizedMarkdown.length) {
    throw new Error("Markdown content is empty");
  }

  const chunks = parseMarkdownIntoChunks(normalizedMarkdown);
  const streamChunks = createStreamChunks(chunks, "", normalizedMarkdown);

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
    prompt: "",
  });

  return result.toUIMessageStreamResponse();
};
