import type { ToolUIPart, UIMessage } from "ai";

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
export type ToolInvocationState = ToolUIPart["state"];

export type TextChunk = { type: "text"; value: string };

export type ToolCallChunk = {
  type: "tool";
  toolCallId: string;
  toolName: string;
  state?: ToolInvocationState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export type MarkdownChunk = TextChunk | ToolCallChunk;

const TOOL_BLOCK_REGEX = /```tool\s*\n([\s\S]*?)\n?```/g;

const isValidToolState = (
  value: unknown,
): ToolInvocationState | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const allowedStates: ToolInvocationState[] = [
    "input-streaming",
    "input-available",
    "output-available",
    "output-error",
  ];

  return allowedStates.includes(value as ToolInvocationState)
    ? (value as ToolInvocationState)
    : undefined;
};

const getStringField = (
  data: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
};

const parseToolCallChunk = (
  rawContent: string,
  fallbackId: string,
): ToolCallChunk | null => {
  const trimmed = rawContent.trim();

  if (!trimmed.length) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    console.error("Failed to parse tool call block:", error);
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const data = parsed as Record<string, unknown>;

  const toolCallId =
    getStringField(data, ["toolCallId", "tool_call_id", "callId", "id"]) ??
    fallbackId;
  const toolName =
    getStringField(data, ["toolName", "tool_name", "name"]) ?? "tool";
  const state = isValidToolState(data.state);
  const errorText =
    getStringField(data, ["errorText", "error_text", "error"]) ?? undefined;

  const chunk: ToolCallChunk = {
    type: "tool",
    toolCallId,
    toolName,
    state,
    errorText,
  };

  if ("input" in data) {
    chunk.input = data.input;
  }

  if ("output" in data) {
    chunk.output = data.output;
  }

  return chunk;
};

const splitIntoTextChunks = (segment: string): TextChunk[] => {
  if (!segment.length) {
    return [];
  }

  const tokens = segment.split(/(\s+)/);

  return tokens
    .filter((token) => token.length > 0)
    .map((token) => ({ type: "text" as const, value: token }));
};

export const parseMarkdownIntoChunks = (markdown: string): MarkdownChunk[] => {
  const chunks: MarkdownChunk[] = [];
  let lastIndex = 0;
  let toolIndex = 1;

  for (const match of markdown.matchAll(TOOL_BLOCK_REGEX)) {
    const fullMatch = match[0];
    const content = match[1] ?? "";
    const startIndex = match.index ?? 0;
    const endIndex = startIndex + fullMatch.length;

    const precedingText = markdown.slice(lastIndex, startIndex);
    chunks.push(...splitIntoTextChunks(precedingText));

    const fallbackId = `tool-call-${toolIndex++}`;
    const toolChunk = parseToolCallChunk(content, fallbackId);

    if (toolChunk) {
      chunks.push(toolChunk);
    } else {
      chunks.push(...splitIntoTextChunks(fullMatch));
    }

    lastIndex = endIndex;
  }

  const remainingText = markdown.slice(lastIndex);
  chunks.push(...splitIntoTextChunks(remainingText));

  return chunks;
};

/**
 * Create streaming chunks for the AI SDK
 */
export const createStreamChunks = (
  chunks: MarkdownChunk[],
  userQuery: string,
  output: string,
) => [
  { type: "text-start" as const, id: "text-1" },
  ...chunks.flatMap((chunk) => {
    if (chunk.type === "text") {
      return [
        {
          type: "text-delta" as const,
          id: "text-1",
          delta: chunk.value,
        },
      ];
    }

    const events: Array<Record<string, unknown>> = [
      {
        type: "tool-input-available" as const,
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        input: chunk.input ?? {},
      },
    ];

    const finalState = chunk.state;

    if (finalState === "output-error" || chunk.errorText) {
      events.push({
        type: "tool-output-error" as const,
        toolCallId: chunk.toolCallId,
        errorText: chunk.errorText ?? "An unknown tool error occurred.",
      });
    } else if (finalState === "output-available" || chunk.output !== undefined) {
      events.push({
        type: "tool-output-available" as const,
        toolCallId: chunk.toolCallId,
        output: chunk.output ?? null,
      });
    }

    return events;
  }),
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
