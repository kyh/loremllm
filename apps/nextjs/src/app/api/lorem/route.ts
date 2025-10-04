import type { UIMessage } from "ai";
import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { loremIpsum } from "lorem-ipsum";
import { z } from "zod";

// Zod schema for lorem ipsum parameters
const LoremParamsSchema = z.object({
  messages: z.array(z.any()), // UIMessage array
  count: z.number().min(1).default(1),
  paragraphLowerBound: z.number().min(1).default(3),
  paragraphUpperBound: z.number().min(1).default(7),
  sentenceLowerBound: z.number().min(1).default(5),
  sentenceUpperBound: z.number().min(1).default(15),
  suffix: z.string().default("\n"),
  units: z.enum(["words", "sentences", "paragraphs"]).default("sentences"),
  words: z.array(z.string()).optional(),
});

type LoremParams = z.infer<typeof LoremParamsSchema>;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate and parse the request body using Zod schema
    const validatedData = LoremParamsSchema.parse(body);
    const { messages, ...params } = validatedData;

    const userQuery = extractUserQuery(messages);
    if (!userQuery) {
      return new Response("No user message found", { status: 400 });
    }

    // Generate lorem ipsum with validated parameters
    const loremParams = {
      count: params.count,
      paragraphLowerBound: params.paragraphLowerBound,
      paragraphUpperBound: params.paragraphUpperBound,
      sentenceLowerBound: params.sentenceLowerBound,
      sentenceUpperBound: params.sentenceUpperBound,
      suffix: params.suffix,
      units: params.units,
      words: params.words,
    };

    const output = loremIpsum(loremParams);
    const chunks = parseMarkdownIntoChunks(output);

    // Create streaming chunks for the AI SDK
    const streamChunks = [
      { type: "text-start" as const, id: "text-1" },
      ...chunks.map((chunk) => ({
        type: "text-delta" as const,
        id: "text-1",
        delta: chunk,
      })),
      { type: "text-end" as const, id: "text-1" },
      {
        type: "finish" as const,
        finishReason: "stop" as const,
        logprobs: undefined,
        usage: {
          inputTokens: userQuery.length,
          outputTokens: output.length,
          totalTokens: userQuery.length + output.length,
        },
      },
    ];

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
  } catch (error) {
    console.error("Error processing lorem ipsum request:", error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        `Validation error: ${error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        { status: 400 },
      );
    }
    
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}

const extractUserQuery = (messages: UIMessage[]): string => {
  const lastUserMessage = messages
    .reverse()
    .find((message) => message.role === "user");
  const textParts =
    lastUserMessage?.parts.filter(
      (part) =>
        typeof part === "object" && "type" in part && part.type === "text",
    ) ?? [];

  return textParts
    .map((part) => part.text)
    .join("")
    .trim();
};

/**
 * Parse markdown into word-level chunks for smooth streaming
 * Preserves whitespace and newlines between words
 */
const parseMarkdownIntoChunks = (markdown: string): string[] => {
  const chunks: string[] = [];

  // Split by whitespace while preserving the whitespace itself
  const tokens = markdown.split(/(\s+)/);

  for (const token of tokens) {
    if (token) {
      chunks.push(token);
    }
  }

  return chunks;
};