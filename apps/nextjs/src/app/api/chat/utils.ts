import type { UIMessage } from "ai";

/**
 * Extract the user query from the messages array
 */
export const extractUserQuery = (messages: unknown[]): string => {
  const uiMessages = messages as UIMessage[];
  const lastUserMessage = uiMessages
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
export const parseMarkdownIntoChunks = (markdown: string): string[] => {
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

/**
 * Create streaming chunks for the AI SDK
 */
export const createStreamChunks = (
  chunks: string[],
  userQuery: string,
  output: string,
) => [
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
