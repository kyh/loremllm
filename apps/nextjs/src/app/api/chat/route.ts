import type { UIMessage } from "ai";
import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV2 } from "ai/test";

import { caller } from "@/trpc/server";

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const userQuery = extractUserQuery(messages);
  if (!userQuery) {
    return new Response("No user message found", { status: 400 });
  }

  try {
    // Query the "demo" collection for the best matching interaction
    const queryResult = await caller.interaction.query({
      publicId: "demo",
      query: userQuery,
      limit: 1,
    });

    const bestMatch = queryResult.matches[0];
    if (!bestMatch) {
      return new Response("No matching response found", { status: 404 });
    }

    // Parse the markdown output into word-level chunks for streaming
    const output = bestMatch.output;
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
    console.error("Error querying demo collection:", error);
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
