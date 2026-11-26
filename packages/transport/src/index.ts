import type {
  ChatRequestOptions,
  ChatTransport,
  DataUIPart,
  JSONValue,
  ProviderMetadata,
  ToolUIPart,
  UIDataTypes,
  UIMessage,
  UIMessageChunk,
  UIMessagePart,
  UITools,
} from "ai";
import { z } from "zod";

import type { DelayResolver, ToolLikePart } from "./shared.ts";
import { eachInOrder, parseToolPart, resolveChunkDelay, segmentText, sleep } from "./shared.ts";

/**
 * Tool state values supported by the transport.
 * This type is derived from ToolUIPart["state"] to match the AI SDK's tool state values.
 */
export type ToolState = ToolUIPart["state"];

/**
 * Tool part that can be yielded in mockResponse.
 * Represents a tool invocation with its parameters and results.
 * This type extends ToolUIPart with optional properties for mockResponse usage.
 */
export type ToolPart = ToolUIPart & {
  /**
   * Human-readable name of the tool (optional, for better UX)
   */
  toolName?: string;
  /**
   * Provider-specific metadata (optional)
   */
  providerMetadata?: unknown;
};

/**
 * Special tool part type for tool parts that don't follow the standard state pattern
 * (e.g., tool-approval-request). These parts are supported but will be skipped during
 * standard tool processing since they don't have a `state` property.
 */
export interface SpecialToolPart {
  type: `tool-${string}`;
  toolCallId: string;
  [key: string]: JSONValue | undefined;
}

export interface StaticTransportContext<UI_MESSAGE extends UIMessage> {
  id: string;
  messages: UI_MESSAGE[];
  requestMetadata: unknown;
  trigger: "submit-message" | "regenerate-message";
  messageId: string | undefined;
}

export type ChunkDelayResolver = DelayResolver<UIMessageChunk>;

export interface StaticChatTransportInit<UI_MESSAGE extends UIMessage> {
  /**
   * Async generator function that yields UIMessagePart objects.
   * All yielded parts will be collected into a single assistant message.
   *
   * Special tool parts (like tool-approval-request) that don't follow the standard
   * state pattern are supported and will be skipped during processing.
   */
  mockResponse: (
    context: StaticTransportContext<UI_MESSAGE>,
  ) => AsyncGenerator<UI_MESSAGE["parts"][number] | SpecialToolPart, void, unknown>;
  /**
   * Optional delay (in milliseconds) to wait between chunk emissions to simulate streaming.
   * Accepts:
   * - A number for constant delay
   * - A tuple [min, max] for random delay between values
   * - A function that returns a delay (or tuple) per chunk
   */
  chunkDelayMs?: ChunkDelayResolver;
  /**
   * Whether to automatically chunk text parts into words for streaming.
   * - `true` (default): splits text by whitespace (word-by-word)
   * - `false`: sends text as a single chunk
   * - `RegExp`: splits text using the provided regex pattern
   */
  autoChunkText?: boolean | RegExp;
  /**
   * Whether to automatically chunk reasoning parts into words for streaming.
   * - `true` (default): splits reasoning by whitespace (word-by-word)
   * - `false`: sends reasoning as a single chunk
   * - `RegExp`: splits reasoning using the provided regex pattern
   */
  autoChunkReasoning?: boolean | RegExp;
}

const generateMessageId = () =>
  `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

type MockPart = UIMessagePart<UIDataTypes, UITools> | SpecialToolPart;

interface StaticAssistantMessage {
  id: string;
  metadata?: unknown;
  parts: MockPart[];
  role: "assistant";
}

const isDataPart = (part: MockPart): part is DataUIPart<UIDataTypes> =>
  part.type.startsWith("data-");

const transientFlag = z.boolean().optional().catch(undefined);

const unsupportedPart = (type: string) =>
  new Error(`StaticChatTransport does not yet support streaming parts of type "${type}".`);

interface ToolPartState {
  hasEmittedInput: boolean;
  lastInput?: unknown;
  lastState?: string;
  lastOutput?: unknown;
  lastErrorText?: string;
}

const pushToolChunks = (
  chunks: UIMessageChunk[],
  toolPart: ToolLikePart,
  toolPartStateMap: Map<string, ToolPartState>,
) => {
  const hasStandardState = "state" in toolPart && toolPart.state !== undefined;

  if (!hasStandardState) {
    return;
  }

  const toolState = toolPartStateMap.get(toolPart.toolCallId);
  const currentState = toolPart.state;

  if (toolState?.hasEmittedInput !== true) {
    chunks.push({
      input: toolPart.input ?? {},
      providerMetadata: toolPart.providerMetadata,
      toolCallId: toolPart.toolCallId,
      toolName: toolPart.toolName ?? "tool",
      type: "tool-input-available",
    });
  }

  if (
    currentState === "output-error" &&
    toolState?.lastState !== "output-error" &&
    toolState?.lastState !== "output-available"
  ) {
    chunks.push({
      errorText: toolPart.errorText ?? "An unknown tool error occurred.",
      providerMetadata: toolPart.providerMetadata,
      toolCallId: toolPart.toolCallId,
      type: "tool-output-error",
    });
  } else if (currentState === "output-available" && toolState?.lastState !== "output-available") {
    chunks.push({
      output: toolPart.output ?? null,
      providerMetadata: toolPart.providerMetadata,
      toolCallId: toolPart.toolCallId,
      type: "tool-output-available",
    });
  }

  toolPartStateMap.set(toolPart.toolCallId, {
    hasEmittedInput: true,
    lastErrorText: toolPart.errorText,
    lastInput: toolPart.input,
    lastOutput: toolPart.output,
    lastState: currentState,
  });
};

const createTextLikeChunks = (
  chunks: UIMessageChunk[],
  type: "text" | "reasoning",
  id: string,
  part: { text: string; providerMetadata?: ProviderMetadata },
  autoChunk: boolean | RegExp,
) => {
  const { providerMetadata } = part;

  chunks.push(
    type === "text"
      ? { id, providerMetadata, type: "text-start" }
      : { id, providerMetadata, type: "reasoning-start" },
  );

  if (part.text.length === 0) {
    return;
  }

  const pushDelta = (delta: string) => {
    if (delta.length > 0) {
      chunks.push(
        type === "text"
          ? { delta, id, providerMetadata, type: "text-delta" }
          : { delta, id, providerMetadata, type: "reasoning-delta" },
      );
    }
  };

  for (const segment of segmentText(part.text, autoChunk)) {
    pushDelta(segment);
  }

  chunks.push(
    type === "text"
      ? { id, providerMetadata, type: "text-end" }
      : { id, providerMetadata, type: "reasoning-end" },
  );
};

const createDataChunks = (chunks: UIMessageChunk[], part: DataUIPart<UIDataTypes>) => {
  chunks.push({
    data: part.data,
    id: part.id,
    transient: transientFlag.parse("transient" in part ? part.transient : undefined),
    type: part.type,
  });
};

const createChunksFromMessage = (
  message: StaticAssistantMessage,
  autoChunkText: boolean | RegExp,
  autoChunkReasoning: boolean | RegExp,
) => {
  const chunks: UIMessageChunk[] = [];
  chunks.push({
    messageId: message.id,
    messageMetadata: message.metadata,
    type: "start",
  });

  let isStepOpen = false;
  let nextTextId = 0;
  let nextReasoningId = 0;

  const openStepIfNeeded = () => {
    if (!isStepOpen) {
      chunks.push({ type: "start-step" });
      isStepOpen = true;
    }
  };

  const closeStepIfNeeded = () => {
    if (isStepOpen) {
      chunks.push({ type: "finish-step" });
      isStepOpen = false;
    }
  };

  const toolPartStateMap = new Map<string, ToolPartState>();

  for (const part of message.parts) {
    switch (part.type) {
      case "text": {
        openStepIfNeeded();
        const textId = `text-${(nextTextId += 1)}`;
        createTextLikeChunks(chunks, "text", textId, part, autoChunkText);
        break;
      }

      case "reasoning": {
        openStepIfNeeded();
        const reasoningId = `reasoning-${(nextReasoningId += 1)}`;
        createTextLikeChunks(chunks, "reasoning", reasoningId, part, autoChunkReasoning);
        break;
      }

      case "step-start": {
        closeStepIfNeeded();
        chunks.push({ type: "start-step" });
        isStepOpen = true;
        break;
      }

      case "file": {
        chunks.push({
          mediaType: part.mediaType,
          providerMetadata: part.providerMetadata,
          type: "file",
          url: part.url,
        });
        break;
      }

      case "source-url": {
        chunks.push({
          providerMetadata: part.providerMetadata,
          sourceId: part.sourceId,
          title: part.title,
          type: "source-url",
          url: part.url,
        });
        break;
      }

      case "source-document": {
        chunks.push({
          filename: part.filename,
          mediaType: part.mediaType,
          providerMetadata: part.providerMetadata,
          sourceId: part.sourceId,
          title: part.title,
          type: "source-document",
        });
        break;
      }

      case "dynamic-tool": {
        pushToolChunks(chunks, parseToolPart(part), toolPartStateMap);
        break;
      }

      case "steering-message": {
        chunks.push({ id: part.id, parts: part.parts, type: "steering-message" });
        break;
      }

      case "custom":
      case "reasoning-file": {
        throw unsupportedPart(part.type);
      }

      default: {
        if (part.type.startsWith("tool-")) {
          pushToolChunks(chunks, parseToolPart(part), toolPartStateMap);
          break;
        }

        if (isDataPart(part)) {
          createDataChunks(chunks, part);
          break;
        }

        throw unsupportedPart(part.type);
      }
    }
  }

  closeStepIfNeeded();

  chunks.push({
    messageMetadata: message.metadata,
    type: "finish",
  });

  return chunks;
};

type SendMessagesOptions<UI_MESSAGE extends UIMessage> = {
  trigger: "submit-message" | "regenerate-message";
  chatId: string;
  messageId: string | undefined;
  messages: UI_MESSAGE[];
  abortSignal: AbortSignal | undefined;
} & ChatRequestOptions;

export class StaticChatTransport<
  UI_MESSAGE extends UIMessage = UIMessage,
> implements ChatTransport<UI_MESSAGE> {
  private readonly mockResponseOption: (
    context: StaticTransportContext<UI_MESSAGE>,
  ) => AsyncGenerator<UI_MESSAGE["parts"][number] | SpecialToolPart, void, unknown>;
  private readonly chunkDelayMs?: ChunkDelayResolver;
  private readonly autoChunkText: boolean | RegExp;
  private readonly autoChunkReasoning: boolean | RegExp;
  private readonly lastResponses = new Map<string, StaticAssistantMessage>();

  constructor(options: StaticChatTransportInit<UI_MESSAGE>) {
    this.mockResponseOption = options.mockResponse;
    this.chunkDelayMs = options.chunkDelayMs;
    this.autoChunkText = options.autoChunkText ?? true;
    this.autoChunkReasoning = options.autoChunkReasoning ?? true;
  }

  async sendMessages(options: SendMessagesOptions<UI_MESSAGE>) {
    const { abortSignal, chatId, metadata } = options;

    const context: StaticTransportContext<UI_MESSAGE> = {
      id: chatId,
      messageId: options.messageId,
      messages: options.messages,
      requestMetadata: metadata,
      trigger: options.trigger,
    };

    const assistantMessage = await this.resolveMessages(context);

    const chunks = createChunksFromMessage(
      assistantMessage,
      this.autoChunkText,
      this.autoChunkReasoning,
    );

    const stream = this.createStreamFromChunks(chunks, abortSignal);

    this.lastResponses.set(chatId, assistantMessage);

    return stream;
  }

  async reconnectToStream({ chatId }: { chatId: string }) {
    const lastMessage = this.lastResponses.get(chatId);

    const stream: ReadableStream<UIMessageChunk> | null = lastMessage
      ? this.createStreamFromChunks(
          createChunksFromMessage(lastMessage, this.autoChunkText, this.autoChunkReasoning),
        )
      : null;

    return await Promise.resolve(stream);
  }

  /**
   * Clears the cached responses used for reconnectToStream.
   * @param chatId - If provided, clears only the cache for that chat. Otherwise clears all caches.
   */
  clearCache(chatId?: string) {
    if (chatId !== undefined && chatId !== "") {
      this.lastResponses.delete(chatId);
    } else {
      this.lastResponses.clear();
    }
  }

  protected async resolveMessages(context: StaticTransportContext<UI_MESSAGE>) {
    const parts: MockPart[] = [];
    const generator = this.mockResponseOption(context);

    for await (const part of generator) {
      parts.push(part);
    }

    if (parts.length === 0) {
      throw new Error("StaticChatTransport: mockResponse must yield at least one part.");
    }

    const assistantMessage: StaticAssistantMessage = {
      id: context.messageId ?? generateMessageId(),
      parts,
      role: "assistant",
    };

    return assistantMessage;
  }

  private createStreamFromChunks(chunks: UIMessageChunk[], abortSignal?: AbortSignal) {
    let aborted = false;

    const isAborted = () => aborted || abortSignal?.aborted === true;

    const onAbort = () => {
      aborted = true;
    };

    const resolveDelay = async (chunk: UIMessageChunk) =>
      await resolveChunkDelay(this.chunkDelayMs, chunk);

    return new ReadableStream<UIMessageChunk>({
      start: async (controller) => {
        if (abortSignal) {
          if (abortSignal.aborted) {
            aborted = true;
          }

          abortSignal.addEventListener("abort", onAbort, { once: true });
        }

        try {
          await eachInOrder(chunks, async (chunk) => {
            if (isAborted()) {
              throw new DOMException("The transport request was aborted.", "AbortError");
            }

            const isDeltaChunk = chunk.type === "text-delta" || chunk.type === "reasoning-delta";

            const isToolChunk =
              chunk.type === "tool-input-available" ||
              chunk.type === "tool-output-available" ||
              chunk.type === "tool-output-error";

            const isDataChunk = chunk.type.startsWith("data-");

            if (isDeltaChunk || isToolChunk || isDataChunk) {
              const delay = await resolveDelay(chunk);

              if (delay !== null && delay > 0) {
                await sleep(delay);

                if (isAborted()) {
                  throw new DOMException("The transport request was aborted.", "AbortError");
                }
              }
            }

            controller.enqueue(chunk);

            return "next";
          });

          if (isAborted()) {
            throw new DOMException("The transport request was aborted.", "AbortError");
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          if (abortSignal) {
            abortSignal.removeEventListener("abort", onAbort);
          }
        }
      },
    });
  }
}
