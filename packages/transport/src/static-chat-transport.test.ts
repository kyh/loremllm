import { describe, expect, it, vi } from "vitest";
import type { UIMessage, UIMessageChunk } from "ai";

import { StaticChatTransport } from "./index";

const createUserMessage = (text: string, id = "user-1"): UIMessage =>
  ({
    id,
    role: "user",
    parts: [{ type: "text", text }],
  }) as UIMessage;

const createAssistantMessage = (
  parts: UIMessage["parts"],
  id = "assistant-1",
): UIMessage =>
  ({
    id,
    role: "assistant",
    parts,
  }) as UIMessage;

const readAllChunks = async (
  stream: ReadableStream<UIMessageChunk>,
): Promise<UIMessageChunk[]> => {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  return chunks;
};

describe("StaticChatTransport", () => {
  const createSendContext = ({
    trigger = "submit-message" as const,
    chatId = "chat-1",
    messageId,
    messages,
  }: {
    trigger?: "submit-message" | "regenerate-message";
    chatId?: string;
    messageId?: string;
    messages: UIMessage[];
  }) => ({
    trigger,
    chatId,
    messageId,
    messages,
    headers: undefined,
    body: undefined,
    metadata: undefined,
  });

  it("streams the assistant message as UI message chunks", async () => {
    const userMessage = createUserMessage("Hello");
    const assistantMessage = createAssistantMessage([
      { type: "text", text: "Hi there!" },
    ]);

    const transport = new StaticChatTransport({
      resolveMessages: () => [userMessage, assistantMessage],
    });

    const stream = await transport.sendMessages({
      ...createSendContext({ messages: [userMessage] }),
      abortSignal: undefined,
    });

    const chunks = await readAllChunks(stream);
    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "start",
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "finish-step",
      "finish",
    ]);
    expect(
      chunks.filter((chunk) => chunk.type === "text-delta")[0],
    ).toMatchObject({ delta: "Hi there!" });
  });

  it("can replay the last assistant response via reconnectToStream", async () => {
    const userMessage = createUserMessage("Hello");
    const assistantMessage = createAssistantMessage([
      { type: "text", text: "Response" },
    ]);

    const transport = new StaticChatTransport({
      resolveMessages: () => [userMessage, assistantMessage],
    });

    await readAllChunks(
      await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    );

    const reconnect = await transport.reconnectToStream({ chatId: "chat-1" });
    expect(reconnect).not.toBeNull();
    const chunks = await readAllChunks(reconnect!);
    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "start",
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "finish-step",
      "finish",
    ]);
  });

  it("supports data-* parts", async () => {
    const userMessage = createUserMessage("Hello");
    const assistantMessage = createAssistantMessage([
      { type: "data-widget", data: { foo: "bar" } },
    ]);

    const transport = new StaticChatTransport({
      resolveMessages: () => [userMessage, assistantMessage],
    });

    const chunks = await readAllChunks(
      await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    );

    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "start",
      "data-widget",
      "finish",
    ]);
    expect(chunks[1]).toMatchObject({
      type: "data-widget",
      data: { foo: "bar" },
    });
  });

  it("requires resolveMessages to return an assistant response", async () => {
    const userMessage = createUserMessage("Hello");

    const transport = new StaticChatTransport({
      resolveMessages: () => [userMessage],
    });

    await expect(
      transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    ).rejects.toThrow(/assistant/i);
  });

  it("throws if resolveMessages is not provided", async () => {
    const userMessage = createUserMessage("Hello");
    const transport = new StaticChatTransport();

    await expect(
      transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    ).rejects.toThrow(/resolveMessages/i);
  });

  it("invokes the chunk delay resolver for every chunk", async () => {
    const userMessage = createUserMessage("Hello");
    const assistantMessage = createAssistantMessage([
      { type: "text", text: "Hello again!" },
    ]);
    const chunkDelay = vi.fn<(chunk: UIMessageChunk) => number>().mockReturnValue(0);

    const transport = new StaticChatTransport({
      resolveMessages: () => [userMessage, assistantMessage],
      chunkDelayMs: chunkDelay,
    });

    await readAllChunks(
      await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    );

    expect(chunkDelay).toHaveBeenCalled();
    expect(chunkDelay.mock.calls.length).toBeGreaterThan(0);
  });

  it("aborts the stream when the abort signal fires", async () => {
    const userMessage = createUserMessage("Hello");
    const assistantMessage = createAssistantMessage([
      { type: "text", text: "Streaming..." },
    ]);
    const transport = new StaticChatTransport({
      resolveMessages: () => [userMessage, assistantMessage],
      chunkDelayMs: () => 50,
    });

    const abortController = new AbortController();
    const streamPromise = transport.sendMessages({
      ...createSendContext({ messages: [userMessage] }),
      abortSignal: abortController.signal,
    });
    const stream = await streamPromise;
    const reader = readAllChunks(stream);

    abortController.abort();

    await expect(reader).rejects.toThrow(/aborted/i);
  });

  it("regenerates an existing assistant message by id", async () => {
    const userMessage = createUserMessage("Hello");
    const previousAssistant = createAssistantMessage(
      [{ type: "text", text: "Old response" }],
      "assistant-1",
    );
    const regeneratedAssistant = createAssistantMessage(
      [{ type: "text", text: "Fresh response" }],
      "assistant-1",
    );

    const transport = new StaticChatTransport({
      resolveMessages: () => [userMessage, regeneratedAssistant],
    });

    const chunks = await readAllChunks(
      await transport.sendMessages({
        ...createSendContext({
          trigger: "regenerate-message",
          messageId: "assistant-1",
          messages: [userMessage, previousAssistant],
        }),
        abortSignal: undefined,
      }),
    );

    const textChunk = chunks.find(
      (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
        chunk.type === "text-delta",
    );
    expect(textChunk?.delta).toBe("Fresh response");
  });

  it("throws when resolveMessages appends more than one new message", async () => {
    const userMessage = createUserMessage("Hello");
    const assistantMessage = createAssistantMessage([
      { type: "text", text: "Response one" },
    ]);
    const extraAssistant = createAssistantMessage(
      [{ type: "text", text: "Response two" }],
      "assistant-2",
    );

    const transport = new StaticChatTransport({
      resolveMessages: () => [userMessage, assistantMessage, extraAssistant],
    });

    await expect(
      transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    ).rejects.toThrow(/only one new assistant message/i);
  });
});
