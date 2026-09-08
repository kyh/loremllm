import type { ToolUIPart } from "ai";
import type { JSONValue, LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

import type { JsonBody } from "./schema";

// Lenient by design: a malformed message or part degrades to empty/ignored
// instead of failing the whole request, mirroring how unmatched shapes were
// previously skipped.
const inboundTextPart = z
  .object({ text: z.string(), type: z.literal("text") })
  .nullable()
  // oxlint-disable-next-line promise/prefer-await-to-then -- zod's .catch(), not a promise's
  .catch(null);

const inboundMessage = z
  .object({
    // oxlint-disable-next-line promise/prefer-await-to-then -- zod's .catch(), not a promise's
    parts: z.array(inboundTextPart).catch([]),
    // oxlint-disable-next-line promise/prefer-await-to-then -- zod's .catch(), not a promise's
    role: z.string().catch(""),
  })
  // oxlint-disable-next-line promise/prefer-await-to-then -- zod's .catch(), not a promise's
  .catch({ parts: [], role: "" });

/**
 * Extract the user query from the messages array
 */
export const extractUserQuery = (messages: readonly JsonBody[]): string => {
  const inboundMessages = messages.map((message) => inboundMessage.parse(message));
  const lastUserMessage = inboundMessages.toReversed().find((message) => message.role === "user");

  return (lastUserMessage?.parts ?? [])
    .flatMap((part) => (part === null ? [] : [part.text]))
    .join("")
    .trim();
};

/**
 * Parse markdown into word-level chunks for smooth streaming
 * Preserves whitespace and newlines between words
 */
export type ToolInvocationState = ToolUIPart["state"];

export interface TextChunk {
  type: "text";
  value: string;
}

export interface ToolCallChunk {
  type: "tool";
  toolCallId: string;
  toolName: string;
  state?: ToolInvocationState;
  input?: JSONValue;
  output?: JSONValue;
  errorText?: string;
}

export type MarkdownChunk = TextChunk | ToolCallChunk;

const TOOL_FENCE_REGEX = /```tool[^\n]*\n[\s\S]*?```/giu;

const stripSurroundingQuotes = (value: string): string => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

interface ToolFenceHeader {
  headerToolName?: string;
  headerToolCallId?: string;
}

const parseToolFenceInfo = (infoString: string): ToolFenceHeader => {
  const tokens = infoString.trim().split(/\s+/u).filter(Boolean);

  if (!tokens.length) {
    return {};
  }

  let headerToolName: string | undefined;
  let headerToolCallId: string | undefined;

  for (const token of tokens) {
    const [rawKey = token, rawValue] = token.includes("=")
      ? token.split(/[=]/u, 2)
      : [token, undefined];

    if (rawValue !== undefined) {
      const key = rawKey.toLowerCase();
      const value = stripSurroundingQuotes(rawValue.trim());

      if (!value.length) {
        continue;
      }

      if (["name", "tool", "toolname"].includes(key) && !headerToolName) {
        headerToolName = value;
      } else if (["id", "toolcallid", "call", "callid"].includes(key) && !headerToolCallId) {
        headerToolCallId = value;
      }

      continue;
    }

    if (!headerToolName) {
      headerToolName = token;
    } else if (!headerToolCallId) {
      headerToolCallId = token;
    }
  }

  return { headerToolCallId, headerToolName };
};

const toolInvocationState = z.enum([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
  "output-available",
  "output-error",
  "output-denied",
]);

const parseToolState = (value: JSONValue | undefined): ToolInvocationState | undefined => {
  const result = toolInvocationState.safeParse(value);
  return result.success ? result.data : undefined;
};

const stringValue = z.string();

// YAML tool-fence bodies only carry JSON-shaped values under the default schema.
const toolFenceData = z.record(z.string(), z.json());

type ToolFenceData = z.infer<typeof toolFenceData>;

const getStringField = (data: ToolFenceData, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = stringValue.safeParse(data[key]);

    if (value.success && value.data.trim().length > 0) {
      return value.data;
    }
  }

  return undefined;
};

const parseToolCallChunk = (rawContent: string, fallbackId: string): ToolCallChunk | null => {
  const lines = rawContent.split("\n");

  if (lines.length === 0) {
    return null;
  }

  const [rawHeaderLine] = lines;

  if (!rawHeaderLine) {
    return null;
  }

  const infoString = rawHeaderLine.replace(/^```tool/iu, "");
  const { headerToolName, headerToolCallId } = parseToolFenceInfo(infoString);

  const bodyLines = lines.slice(1);

  while (bodyLines.length > 0) {
    const lastLine = bodyLines.at(-1);

    if (!lastLine || lastLine.trim() !== "```") {
      break;
    }

    bodyLines.pop();
  }

  const bodyContent = bodyLines.join("\n").trim();

  let data: ToolFenceData = {};

  if (bodyContent.length) {
    let parsedYaml;
    try {
      parsedYaml = parseYaml(bodyContent);
    } catch (error) {
      console.error("Failed to parse tool call fence:", error);
      return null;
    }

    const result = toolFenceData.safeParse(parsedYaml);

    if (!result.success) {
      return null;
    }

    ({ data } = result);
  }

  const toolCallId =
    headerToolCallId ??
    getStringField(data, ["toolCallId", "tool_call_id", "callId", "id", "toolCall"]) ??
    fallbackId;
  const toolName =
    headerToolName ?? getStringField(data, ["toolName", "tool_name", "name", "tool"]) ?? "tool";
  const state = parseToolState(data.state);
  const errorText = getStringField(data, ["errorText", "error_text", "error"]) ?? undefined;

  const chunk: ToolCallChunk = {
    errorText,
    state,
    toolCallId,
    toolName,
    type: "tool",
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

  const tokens = segment.split(/(?<whitespace>\s+)/u);

  return tokens
    .filter((token) => token.length > 0)
    .map((token) => ({ type: "text" as const, value: token }));
};

export const parseMarkdownIntoChunks = (markdown: string): MarkdownChunk[] => {
  const chunks: MarkdownChunk[] = [];
  let lastIndex = 0;
  let toolIndex = 1;

  for (const match of markdown.matchAll(TOOL_FENCE_REGEX)) {
    const [fullMatch] = match;
    const content = fullMatch;
    const startIndex = match.index ?? 0;
    const endIndex = startIndex + fullMatch.length;

    const precedingText = markdown.slice(lastIndex, startIndex);
    chunks.push(...splitIntoTextChunks(precedingText));

    const fallbackId = `tool-call-${toolIndex}`;
    toolIndex += 1;
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
const stringifyToolInput = (input: JSONValue | undefined): string => {
  const text = stringValue.safeParse(input);

  if (text.success) {
    return text.data;
  }

  try {
    return JSON.stringify(input ?? {});
  } catch (error) {
    console.error("Failed to serialize tool input:", error);
    return "{}";
  }
};

const normalizeToolResult = (output: JSONValue | undefined): NonNullable<JSONValue> => output ?? {};

export const createStreamChunks = (
  chunks: MarkdownChunk[],
  userQuery: string,
  output: string,
): LanguageModelV3StreamPart[] => [
  { id: "text-1", type: "text-start" },
  ...chunks.flatMap<LanguageModelV3StreamPart>((chunk) => {
    if (chunk.type === "text") {
      return [
        {
          delta: chunk.value,
          id: "text-1",
          type: "text-delta",
        },
      ];
    }

    const events: LanguageModelV3StreamPart[] = [
      {
        input: stringifyToolInput(chunk.input),
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        type: "tool-call",
      },
    ];

    const finalState = chunk.state;

    if (finalState === "output-error" || finalState === "output-denied" || chunk.errorText) {
      events.push({
        isError: true,
        result: chunk.errorText ?? "An unknown tool error occurred.",
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        type: "tool-result",
      });
    } else if (finalState === "output-available" || chunk.output !== undefined) {
      events.push({
        result: normalizeToolResult(chunk.output),
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        type: "tool-result",
      });
    }

    return events;
  }),
  { id: "text-1", type: "text-end" },
  {
    finishReason: {
      raw: "stop",
      unified: "stop",
    },
    type: "finish",
    usage: {
      inputTokens: {
        cacheRead: undefined,
        cacheWrite: undefined,
        noCache: undefined,
        total: userQuery.length,
      },
      outputTokens: {
        reasoning: undefined,
        text: output.length,
        total: output.length,
      },
    },
  },
];
