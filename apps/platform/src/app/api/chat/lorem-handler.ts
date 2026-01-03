import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { loremIpsum } from "lorem-ipsum";

import { createStreamChunks, parseMarkdownIntoChunks } from "./utils";

export type LoremParams = {
  count?: number;
  paragraphLowerBound?: number;
  paragraphUpperBound?: number;
  sentenceLowerBound?: number;
  sentenceUpperBound?: number;
  suffix?: string;
  units?: "words" | "sentences" | "paragraphs";
  words?: string[];
};

/**
 * Handle lorem ipsum generation
 */
export const handleLoremGeneration = async (params: LoremParams) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  // Generate lorem ipsum with validated parameters and defaults
  const loremParams = {
    count: params.count ?? 1,
    paragraphLowerBound: params.paragraphLowerBound ?? 3,
    paragraphUpperBound: params.paragraphUpperBound ?? 7,
    sentenceLowerBound: params.sentenceLowerBound ?? 5,
    sentenceUpperBound: params.sentenceUpperBound ?? 15,
    suffix: params.suffix ?? "\n",
    units: params.units ?? "sentences",
    words: params.words,
  };

  const output = loremIpsum(loremParams);
  const chunks = parseMarkdownIntoChunks(output);
  const streamChunks = createStreamChunks(chunks, "", output);

  const result = streamText({
    prompt: "",
    model: new MockLanguageModelV3({
      doStream: async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
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
