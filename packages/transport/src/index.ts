import type {
  ChatRequestOptions,
  ChatTransport,
  UIMessage,
  UIMessageChunk,
} from "ai";

type MaybePromise<T> = T | Promise<T>;

export type StaticTransportContext<UI_MESSAGE extends UIMessage> = {
  trigger: "submit-message" | "regenerate-message";
  chatId: string;
  messageId: string | undefined;
  messages: UI_MESSAGE[];
} & ChatRequestOptions;

export type ChunkDelayResolver =
  | number
  | ((chunk: UIMessageChunk) => MaybePromise<number | undefined>);

export type StaticChatTransportInit<UI_MESSAGE extends UIMessage> = {
  /**
   * Computes the messages that should be visible after the transport completes.
   * Must include the assistant response that should be streamed to the UI.
   */
  resolveMessages?: (
    context: StaticTransportContext<UI_MESSAGE>,
  ) => MaybePromise<UI_MESSAGE[]>;
  /**
   * Optional delay (in milliseconds) to wait between chunk emissions to simulate streaming.
   */
  chunkDelayMs?: ChunkDelayResolver;
};

class AbortTransportError extends Error {
  constructor() {
    super("The transport request was aborted.");
    this.name = "AbortError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SendMessagesOptions<UI_MESSAGE extends UIMessage> =
  StaticTransportContext<UI_MESSAGE> & {
    abortSignal: AbortSignal | undefined;
  };

export class StaticChatTransport<UI_MESSAGE extends UIMessage = UIMessage>
  implements ChatTransport<UI_MESSAGE>
{
  private readonly resolveMessagesOption?: (
    context: StaticTransportContext<UI_MESSAGE>,
  ) => MaybePromise<UI_MESSAGE[]>;
  private readonly chunkDelayMs?: ChunkDelayResolver;
  private readonly lastResponses = new Map<string, UI_MESSAGE>();

  constructor(options: StaticChatTransportInit<UI_MESSAGE> = {}) {
    this.resolveMessagesOption = options.resolveMessages;
    this.chunkDelayMs = options.chunkDelayMs;
  }

  async sendMessages(
    options: SendMessagesOptions<UI_MESSAGE>,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { abortSignal, ...context } = options;
    const resolvedMessages = await this.resolveMessages(context);
    if (!Array.isArray(resolvedMessages) || resolvedMessages.length === 0) {
      throw new Error(
        "StaticChatTransport: resolveMessages must return at least one message.",
      );
    }

    const responses = determineResponseMessages({
      previousMessages: options.messages,
      resolvedMessages,
      trigger: options.trigger,
      regeneratedMessageId: options.messageId,
    });
    if (responses.length !== 1) {
      throw new Error(
        "StaticChatTransport currently supports streaming exactly one assistant message at a time.",
      );
    }
    const assistantMessage = responses[0];
    if (!assistantMessage) {
      throw new Error(
        "StaticChatTransport could not determine the assistant message to stream.",
      );
    }
    if (assistantMessage.role !== "assistant") {
      throw new Error(
        'StaticChatTransport expects the streamed message to have role "assistant".',
      );
    }

    const chunks = createChunksFromMessage(assistantMessage);
    const stream = this.createStreamFromChunks(chunks, abortSignal);
    this.lastResponses.set(options.chatId, assistantMessage);
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

  protected resolveMessages(
    context: StaticTransportContext<UI_MESSAGE>,
  ): MaybePromise<UI_MESSAGE[]> {
    if (!this.resolveMessagesOption) {
      throw new Error(
        "StaticChatTransport requires a resolveMessages option or an override of resolveMessages.",
      );
    }
    return this.resolveMessagesOption(context);
  }

  private createStreamFromChunks(
    chunks: UIMessageChunk[],
    abortSignal?: AbortSignal,
  ): ReadableStream<UIMessageChunk> {
    const chunkDelayMs = this.chunkDelayMs;
    let aborted = false;

    const resolveDelay = async (
      chunk: UIMessageChunk,
    ): Promise<number | undefined> => {
      if (chunkDelayMs == null) {
        return undefined;
      }
      if (typeof chunkDelayMs === "number") {
        return chunkDelayMs;
      }
      return chunkDelayMs(chunk);
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
            if (aborted || abortSignal?.aborted) {
              throw new AbortTransportError();
            }
            controller.enqueue(chunk);
            const delay = await resolveDelay(chunk);
            if (delay && delay > 0) {
              await sleep(delay);
              if (aborted || abortSignal?.aborted) {
                throw new AbortTransportError();
              }
            }
          }
          if (aborted || abortSignal?.aborted) {
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

function determineResponseMessages<UI_MESSAGE extends UIMessage>({
  previousMessages,
  resolvedMessages,
  trigger,
  regeneratedMessageId,
}: {
  previousMessages: UI_MESSAGE[];
  resolvedMessages: UI_MESSAGE[];
  trigger: "submit-message" | "regenerate-message";
  regeneratedMessageId: string | undefined;
}): UI_MESSAGE[] {
  if (resolvedMessages.length === 0) {
    return [];
  }

  const previousIds = new Set(previousMessages.map((message) => message.id));
  const appended = resolvedMessages.filter(
    (message) => !previousIds.has(message.id),
  );

  if (trigger === "regenerate-message" && regeneratedMessageId) {
    const replacement = resolvedMessages.find(
      (message) => message.id === regeneratedMessageId,
    );
    if (replacement) {
      return [replacement];
    }
    if (appended.length === 1) {
      return appended;
    }
    throw new Error(
      `StaticChatTransport: resolveMessages must include the regenerated assistant message with id ${regeneratedMessageId}.`,
    );
  }

  if (appended.length === 1) {
    return appended;
  }

  if (appended.length === 0) {
    throw new Error(
      "StaticChatTransport expected resolveMessages to append exactly one new assistant message.",
    );
  }

  throw new Error(
    "StaticChatTransport expected resolveMessages to append only one new assistant message.",
  );
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
        chunks.push({
          type: "text-start",
          id: textId,
          providerMetadata: part.providerMetadata,
        });
        if (part.text.length > 0) {
          chunks.push({
            type: "text-delta",
            id: textId,
            delta: part.text,
            providerMetadata: part.providerMetadata,
          });
        }
        chunks.push({
          type: "text-end",
          id: textId,
          providerMetadata: part.providerMetadata,
        });
        break;
      }
      case "reasoning": {
        openStepIfNeeded();
        const reasoningId = `reasoning-${++nextReasoningId}`;
        chunks.push({
          type: "reasoning-start",
          id: reasoningId,
          providerMetadata: part.providerMetadata,
        });
        if (part.text.length > 0) {
          chunks.push({
            type: "reasoning-delta",
            id: reasoningId,
            delta: part.text,
            providerMetadata: part.providerMetadata,
          });
        }
        chunks.push({
          type: "reasoning-end",
          id: reasoningId,
          providerMetadata: part.providerMetadata,
        });
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
        // Handle tool-* parts and dynamic-tool
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
          };

          // Always emit tool-input-available
          chunks.push({
            type: "tool-input-available",
            toolCallId: toolPart.toolCallId,
            toolName: toolPart.toolName ?? "tool",
            input: toolPart.input ?? {},
            providerMetadata: toolPart.providerMetadata,
          } as UIMessageChunk);

          // Emit tool-output-error if state is output-error or errorText is provided
          const finalState = toolPart.state;
          if (finalState === "output-error" || toolPart.errorText) {
            chunks.push({
              type: "tool-output-error",
              toolCallId: toolPart.toolCallId,
              errorText:
                toolPart.errorText ?? "An unknown tool error occurred.",
              providerMetadata: toolPart.providerMetadata,
            } as UIMessageChunk);
          } else if (
            finalState === "output-available" ||
            toolPart.output !== undefined
          ) {
            // Emit tool-output-available if state is output-available or output is provided
            chunks.push({
              type: "tool-output-available",
              toolCallId: toolPart.toolCallId,
              output: toolPart.output ?? null,
              providerMetadata: toolPart.providerMetadata,
            } as UIMessageChunk);
          }
          break;
        }
        // Handle data-* parts
        if (part.type.startsWith("data-")) {
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
          break;
        }
        throw new Error(
          `StaticChatTransport does not yet support streaming parts of type "${part.type}".`,
        );
      }
    }
  }

  closeStepIfNeeded();

  chunks.push({
    type: "finish",
    messageMetadata: message.metadata,
  });

  return chunks;
}
