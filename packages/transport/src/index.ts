import type {
  ChatRequestOptions,
  ChatTransport,
  ToolUIPart,
  UIMessage,
  UIMessageChunk,
} from "ai";

type MaybePromise<T> = T | Promise<T>;

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
export type SpecialToolPart = {
  type: `tool-${string}`;
  toolCallId: string;
  [key: string]: unknown;
};

export type StaticTransportContext<UI_MESSAGE extends UIMessage> = {
  id: string;
  messages: UI_MESSAGE[];
  requestMetadata: unknown;
  trigger: "submit-message" | "regenerate-message";
  messageId: string | undefined;
};

export type ChunkDelayResolver =
  | number
  | [number, number]
  | ((
      chunk: UIMessageChunk,
    ) => MaybePromise<number | [number, number] | undefined>);

export type StaticChatTransportInit<UI_MESSAGE extends UIMessage> = {
  /**
   * Async generator function that yields UIMessagePart objects.
   * All yielded parts will be collected into a single assistant message.
   *
   * Special tool parts (like tool-approval-request) that don't follow the standard
   * state pattern are supported and will be skipped during processing.
   */
  mockResponse: (
    context: StaticTransportContext<UI_MESSAGE>,
  ) => AsyncGenerator<
    UI_MESSAGE["parts"][number] | SpecialToolPart,
    void,
    unknown
  >;
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
};

class AbortTransportError extends Error {
  constructor() {
    super("The transport request was aborted.");
    this.name = "AbortError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMessageId(): string {
  return `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

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
  ) => AsyncGenerator<
    UI_MESSAGE["parts"][number] | SpecialToolPart,
    void,
    unknown
  >;
  private readonly chunkDelayMs?: ChunkDelayResolver;
  private readonly autoChunkText: boolean | RegExp;
  private readonly autoChunkReasoning: boolean | RegExp;
  private readonly lastResponses = new Map<string, UI_MESSAGE>();

  constructor(options: StaticChatTransportInit<UI_MESSAGE>) {
    this.mockResponseOption = options.mockResponse;
    this.chunkDelayMs = options.chunkDelayMs;
    this.autoChunkText = options.autoChunkText ?? true;
    this.autoChunkReasoning = options.autoChunkReasoning ?? true;
  }

  async sendMessages(
    options: SendMessagesOptions<UI_MESSAGE>,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { abortSignal, chatId, metadata } = options;

    const context: StaticTransportContext<UI_MESSAGE> = {
      id: chatId,
      messages: options.messages,
      requestMetadata: metadata,
      trigger: options.trigger,
      messageId: options.messageId,
    };

    const assistantMessage = await this.resolveMessages(context);
    const chunks = createChunksFromMessage(
      assistantMessage,
      this.autoChunkText,
      this.autoChunkReasoning,
    );
    const stream = this.createStreamFromChunks(chunks, abortSignal);

    // Cache for reconnectToStream
    this.lastResponses.set(chatId, assistantMessage);
    return stream;
  }

  reconnectToStream({
    chatId,
  }: {
    chatId: string;
  }): Promise<ReadableStream<UIMessageChunk> | null> {
    const lastMessage = this.lastResponses.get(chatId);
    if (!lastMessage) {
      return Promise.resolve(null);
    }

    const chunks = createChunksFromMessage(
      lastMessage,
      this.autoChunkText,
      this.autoChunkReasoning,
    );
    return Promise.resolve(this.createStreamFromChunks(chunks));
  }

  protected async resolveMessages(
    context: StaticTransportContext<UI_MESSAGE>,
  ): Promise<UI_MESSAGE> {
    const parts: UI_MESSAGE["parts"] = [];
    const generator = this.mockResponseOption(context);

    for await (const part of generator) {
      // Special tool parts (like tool-approval-request) are cast to parts array type
      // They'll be handled specially during chunk processing (skipped if no state)
      parts.push(part as UI_MESSAGE["parts"][number]);
    }

    if (parts.length === 0) {
      throw new Error(
        "StaticChatTransport: mockResponse must yield at least one part.",
      );
    }

    const messageId = context.messageId ?? generateMessageId();

    const assistantMessage: UI_MESSAGE = {
      id: messageId,
      role: "assistant",
      parts,
    } as UI_MESSAGE;

    return assistantMessage;
  }

  private createStreamFromChunks(
    chunks: UIMessageChunk[],
    abortSignal?: AbortSignal,
  ): ReadableStream<UIMessageChunk> {
    let aborted = false;

    const isAborted = () => aborted || abortSignal?.aborted === true;

    const resolveDelay = async (
      chunk: UIMessageChunk,
    ): Promise<number | undefined> => {
      const { chunkDelayMs } = this;
      if (chunkDelayMs == null) {
        return undefined;
      }

      if (typeof chunkDelayMs === "number") {
        return chunkDelayMs;
      }

      if (Array.isArray(chunkDelayMs)) {
        return randomDelay(chunkDelayMs[0], chunkDelayMs[1]);
      }

      // Function resolver
      const result = await chunkDelayMs(chunk);
      if (result == null) {
        return undefined;
      }

      return Array.isArray(result) ? randomDelay(result[0], result[1]) : result;
    };

    return new ReadableStream<UIMessageChunk>({
      start: async (controller) => {
        const onAbort = () => {
          aborted = true;
        };
        if (abortSignal) {
          if (abortSignal.aborted) {
            aborted = true;
          }
          abortSignal.addEventListener("abort", onAbort, { once: true });
        }

        try {
          for (const chunk of chunks) {
            if (isAborted()) {
              throw new AbortTransportError();
            }

            const isDeltaChunk =
              chunk.type === "text-delta" || chunk.type === "reasoning-delta";
            const isToolChunk =
              chunk.type === "tool-input-available" ||
              chunk.type === "tool-output-available" ||
              chunk.type === "tool-output-error";
            const isDataChunk =
              typeof chunk.type === "string" && chunk.type.startsWith("data-");

            // Delay on delta chunks (actual content chunks), tool chunks, and data chunks
            // Control chunks (start, end, text-start, etc.) are sent immediately
            // Delay happens BEFORE enqueueing the chunk
            if (isDeltaChunk || isToolChunk || isDataChunk) {
              const delay = await resolveDelay(chunk);
              if (delay && delay > 0) {
                await sleep(delay);
                if (isAborted()) {
                  throw new AbortTransportError();
                }
              }
            }

            controller.enqueue(chunk);
          }
          if (isAborted()) {
            throw new AbortTransportError();
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

function createTextLikeChunks(
  chunks: UIMessageChunk[],
  type: "text" | "reasoning",
  id: string,
  part: { text: string; providerMetadata?: unknown },
  autoChunk: boolean | RegExp,
): void {
  const prefix = type === "text" ? "text" : "reasoning";
  chunks.push({
    type: `${prefix}-start` as const,
    id,
    providerMetadata: part.providerMetadata,
  } as UIMessageChunk);

  if (part.text.length === 0) {
    return;
  }

  // Helper to push a delta chunk
  const pushDelta = (delta: string) => {
    if (delta.length > 0) {
      chunks.push({
        type: `${prefix}-delta` as const,
        id,
        delta,
        providerMetadata: part.providerMetadata,
      } as UIMessageChunk);
    }
  };

  // No chunking - send entire text as single delta
  if (autoChunk === false) {
    pushDelta(part.text);
  } else {
    // Determine the regex pattern
    const matchPattern =
      autoChunk === true
        ? /(\S+|\s+)/g // Default: word-by-word (words and spaces)
        : autoChunk.global
          ? autoChunk
          : new RegExp(autoChunk.source, autoChunk.flags + "g");

    // Check if regex has capturing groups (matches content) vs separators (splits on)
    const hasCapturingGroups = matchPattern.source.includes("(");

    if (hasCapturingGroups) {
      // Match content pattern (e.g., /(\S+|\s+)/g)
      for (const match of part.text.matchAll(matchPattern)) {
        pushDelta(match[0]);
      }
    } else {
      // Split pattern (e.g., /[,.]/g) - add capturing group to preserve separators
      const splitPattern = new RegExp(
        `(${matchPattern.source})`,
        matchPattern.flags,
      );
      for (const segment of part.text.split(splitPattern)) {
        pushDelta(segment);
      }
    }
  }

  chunks.push({
    type: `${prefix}-end` as const,
    id,
    providerMetadata: part.providerMetadata,
  } as UIMessageChunk);
}

function createDataChunks(
  chunks: UIMessageChunk[],
  part: { type: string; [key: string]: unknown },
): void {
  const dataPart = part as {
    type: `data-${string}`;
    id?: string;
    data: unknown;
    transient?: boolean;
  };
  chunks.push({
    type: dataPart.type,
    id: dataPart.id,
    data: dataPart.data,
    transient: dataPart.transient,
  } as UIMessageChunk);
}

function createChunksFromMessage<UI_MESSAGE extends UIMessage>(
  message: UI_MESSAGE,
  autoChunkText: boolean | RegExp,
  autoChunkReasoning: boolean | RegExp,
): UIMessageChunk[] {
  const chunks: UIMessageChunk[] = [];
  chunks.push({
    type: "start",
    messageId: message.id,
    messageMetadata: message.metadata,
  });

  // Step management: steps group related content (text/reasoning) together
  // Steps are opened automatically for text/reasoning parts and must be closed explicitly
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

  // Track tool parts to emit progressive states
  // We need to process parts in order to preserve progressive loading states
  const toolPartStateMap = new Map<
    string,
    {
      hasEmittedInput: boolean;
      lastInput?: unknown;
      lastState?: string;
      lastOutput?: unknown;
      lastErrorText?: string;
    }
  >();

  for (const part of message.parts) {
    switch (part.type) {
      case "text": {
        openStepIfNeeded();
        const textId = `text-${++nextTextId}`;
        createTextLikeChunks(chunks, "text", textId, part, autoChunkText);
        break;
      }
      case "reasoning": {
        openStepIfNeeded();
        const reasoningId = `reasoning-${++nextReasoningId}`;
        createTextLikeChunks(
          chunks,
          "reasoning",
          reasoningId,
          part,
          autoChunkReasoning,
        );
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
          type: "file",
          mediaType: part.mediaType,
          url: part.url,
          providerMetadata: part.providerMetadata,
        });
        break;
      }
      case "source-url": {
        chunks.push({
          type: "source-url",
          sourceId: part.sourceId,
          url: part.url,
          title: part.title,
          providerMetadata: part.providerMetadata,
        });
        break;
      }
      case "source-document": {
        chunks.push({
          type: "source-document",
          sourceId: part.sourceId,
          mediaType: part.mediaType,
          title: part.title,
          filename: part.filename,
          providerMetadata: part.providerMetadata,
        });
        break;
      }
      default: {
        if (
          (typeof part.type === "string" && part.type.startsWith("tool-")) ||
          part.type === "dynamic-tool"
        ) {
          const toolPart = part as {
            type: `tool-${string}` | "dynamic-tool";
            toolCallId: string;
            toolName?: string;
            state?: string;
            input?: unknown;
            output?: unknown;
            errorText?: string;
            providerMetadata?: unknown;
            [key: string]: unknown;
          };

          // Skip state-based processing for special tool parts that don't follow the standard pattern
          // (e.g., tool-approval-request, which has approvalId instead of state)
          const hasStandardState =
            "state" in toolPart && toolPart.state !== undefined;

          if (hasStandardState) {
            const toolState = toolPartStateMap.get(toolPart.toolCallId);
            const currentState = toolPart.state;

            // Emit tool-input-available only on first occurrence
            if (!toolState?.hasEmittedInput) {
              chunks.push({
                type: "tool-input-available",
                toolCallId: toolPart.toolCallId,
                toolName: toolPart.toolName ?? "tool",
                input: toolPart.input ?? {},
                providerMetadata: toolPart.providerMetadata,
              } as UIMessageChunk);
            }

            // Emit output chunks only when state changes from a non-output state to an output state
            // or when transitioning between output states (e.g., error to success)
            if (currentState === "output-error") {
              // Only emit if we haven't already emitted an error, or if transitioning from output-available
              if (
                toolState?.lastState !== "output-error" &&
                toolState?.lastState !== "output-available"
              ) {
                chunks.push({
                  type: "tool-output-error",
                  toolCallId: toolPart.toolCallId,
                  errorText:
                    toolPart.errorText ?? "An unknown tool error occurred.",
                  providerMetadata: toolPart.providerMetadata,
                } as UIMessageChunk);
              }
            } else if (currentState === "output-available") {
              // Only emit if we haven't already emitted output-available
              if (toolState?.lastState !== "output-available") {
                chunks.push({
                  type: "tool-output-available",
                  toolCallId: toolPart.toolCallId,
                  output: toolPart.output ?? null,
                  providerMetadata: toolPart.providerMetadata,
                } as UIMessageChunk);
              }
            }

            // Update state tracking
            toolPartStateMap.set(toolPart.toolCallId, {
              hasEmittedInput: true,
              lastInput: toolPart.input,
              lastState: currentState,
              lastOutput: toolPart.output,
              lastErrorText: toolPart.errorText,
            });
          }
          // For special tool parts without state (like tool-approval-request),
          // we skip the standard processing to avoid type errors
          break;
        }
        if (part.type.startsWith("data-")) {
          createDataChunks(chunks, part);
          break;
        }
        throw new Error(
          `StaticChatTransport does not yet support streaming parts of type "${part.type}".`,
        );
      }
    }
  }

  // Ensure any open step is closed before finishing
  closeStepIfNeeded();

  chunks.push({
    type: "finish",
    messageMetadata: message.metadata,
  });

  return chunks;
}
