import type {
  ChatRequestOptions,
  ChatTransport,
  UIMessage,
  UIMessageChunk,
} from "ai";

type MaybePromise<T> = T | Promise<T>;

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
   */
  mockResponse: (
    context: StaticTransportContext<UI_MESSAGE>,
  ) => AsyncGenerator<UI_MESSAGE["parts"][number], void, unknown>;
  /**
   * Optional delay (in milliseconds) to wait between chunk emissions to simulate streaming.
   * Accepts:
   * - A number for constant delay
   * - A tuple [min, max] for random delay between values
   * - A function that returns a delay (or tuple) per chunk
   */
  chunkDelayMs?: ChunkDelayResolver;
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

export class StaticChatTransport<UI_MESSAGE extends UIMessage = UIMessage>
  implements ChatTransport<UI_MESSAGE>
{
  private readonly mockResponseOption: (
    context: StaticTransportContext<UI_MESSAGE>,
  ) => AsyncGenerator<UI_MESSAGE["parts"][number], void, unknown>;
  private readonly chunkDelayMs?: ChunkDelayResolver;
  private readonly lastResponses = new Map<string, UI_MESSAGE>();

  constructor(options: StaticChatTransportInit<UI_MESSAGE>) {
    this.mockResponseOption = options.mockResponse;
    this.chunkDelayMs = options.chunkDelayMs;
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
    const chunks = createChunksFromMessage(assistantMessage);
    const stream = this.createStreamFromChunks(chunks, abortSignal);

    // Cache for reconnectToStream
    this.lastResponses.set(chatId, assistantMessage);
    return stream;
  }

  async reconnectToStream({
    chatId,
  }: {
    chatId: string;
  }): Promise<ReadableStream<UIMessageChunk> | null> {
    const lastMessage = this.lastResponses.get(chatId);
    if (!lastMessage) {
      return null;
    }
    const chunks = createChunksFromMessage(lastMessage);
    return this.createStreamFromChunks(chunks);
  }

  protected async resolveMessages(
    context: StaticTransportContext<UI_MESSAGE>,
  ): Promise<UI_MESSAGE> {
    const parts: UI_MESSAGE["parts"] = [];
    const generator = this.mockResponseOption(context);

    for await (const part of generator) {
      parts.push(part);
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
    const chunkDelayMs = this.chunkDelayMs;
    let aborted = false;

    const isAborted = () => aborted || abortSignal?.aborted === true;

    const resolveDelay = async (
      chunk: UIMessageChunk,
    ): Promise<number | undefined> => {
      if (chunkDelayMs == null) {
        return undefined;
      }
      if (typeof chunkDelayMs === "number") {
        return chunkDelayMs;
      }
      if (Array.isArray(chunkDelayMs)) {
        return randomDelay(chunkDelayMs[0], chunkDelayMs[1]);
      }
      const result = await chunkDelayMs(chunk);
      if (result == null) {
        return undefined;
      }
      if (Array.isArray(result)) {
        return randomDelay(result[0], result[1]);
      }
      return result;
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
            controller.enqueue(chunk);

            const delay = await resolveDelay(chunk);
            if (delay && delay > 0) {
              await sleep(delay);
              if (isAborted()) {
                throw new AbortTransportError();
              }
            }
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

export const createStaticChatTransport = <
  UI_MESSAGE extends UIMessage = UIMessage,
>(
  options: StaticChatTransportInit<UI_MESSAGE>,
): StaticChatTransport<UI_MESSAGE> => {
  return new StaticChatTransport(options);
};

function createTextLikeChunks(
  chunks: UIMessageChunk[],
  type: "text" | "reasoning",
  id: string,
  part: { text: string; providerMetadata?: unknown },
): void {
  const prefix = type === "text" ? "text" : "reasoning";
  chunks.push({
    type: `${prefix}-start` as const,
    id,
    providerMetadata: part.providerMetadata,
  } as UIMessageChunk);
  if (part.text.length > 0) {
    chunks.push({
      type: `${prefix}-delta` as const,
      id,
      delta: part.text,
      providerMetadata: part.providerMetadata,
    } as UIMessageChunk);
  }
  chunks.push({
    type: `${prefix}-end` as const,
    id,
    providerMetadata: part.providerMetadata,
  } as UIMessageChunk);
}

function createToolChunks(
  chunks: UIMessageChunk[],
  part: { type: string; [key: string]: unknown },
): void {
  const toolPart = part as {
    type: `tool-${string}` | "dynamic-tool";
    toolCallId: string;
    toolName?: string;
    state?: string;
    input?: unknown;
    output?: unknown;
    errorText?: string;
    providerMetadata?: unknown;
  };

  chunks.push({
    type: "tool-input-available",
    toolCallId: toolPart.toolCallId,
    toolName: toolPart.toolName ?? "tool",
    input: toolPart.input ?? {},
    providerMetadata: toolPart.providerMetadata,
  } as UIMessageChunk);

  const finalState = toolPart.state;
  if (finalState === "output-error" || toolPart.errorText) {
    chunks.push({
      type: "tool-output-error",
      toolCallId: toolPart.toolCallId,
      errorText: toolPart.errorText ?? "An unknown tool error occurred.",
      providerMetadata: toolPart.providerMetadata,
    } as UIMessageChunk);
  } else if (
    finalState === "output-available" ||
    toolPart.output !== undefined
  ) {
    chunks.push({
      type: "tool-output-available",
      toolCallId: toolPart.toolCallId,
      output: toolPart.output ?? null,
      providerMetadata: toolPart.providerMetadata,
    } as UIMessageChunk);
  }
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

  for (const part of message.parts) {
    switch (part.type) {
      case "text": {
        openStepIfNeeded();
        const textId = `text-${++nextTextId}`;
        createTextLikeChunks(chunks, "text", textId, part);
        break;
      }
      case "reasoning": {
        openStepIfNeeded();
        const reasoningId = `reasoning-${++nextReasoningId}`;
        createTextLikeChunks(chunks, "reasoning", reasoningId, part);
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
          createToolChunks(chunks, part);
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
