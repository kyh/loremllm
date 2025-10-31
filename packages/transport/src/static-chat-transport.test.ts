import type { UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it, vi } from "vitest";

import { StaticChatTransport } from "./index";

const createUserMessage = (text: string, id = "user-1"): UIMessage =>
  ({
    id,
    role: "user",
    parts: [{ type: "text", text }],
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

    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Hi there!" };
      },
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

    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Response" };
      },
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

    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "data-widget", data: { foo: "bar" } };
      },
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

  it("requires mockResponse to yield at least one part", async () => {
    const userMessage = createUserMessage("Hello");

    const transport = new StaticChatTransport({
      async *mockResponse() {
        // Yield nothing
      },
    });

    await expect(
      transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    ).rejects.toThrow(/at least one part/i);
  });

  it("invokes the chunk delay resolver for every chunk", async () => {
    const userMessage = createUserMessage("Hello");
    const chunkDelay = vi
      .fn<(chunk: UIMessageChunk) => number>()
      .mockReturnValue(0);

    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Hello again!" };
      },
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

  it("supports tuple delay range for random delays", async () => {
    const userMessage = createUserMessage("Hello");
    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Test" };
      },
      chunkDelayMs: [10, 20], // Random delay between 10ms and 20ms
    });

    const start = Date.now();
    await readAllChunks(
      await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    );
    const duration = Date.now() - start;

    // Should have some delay (at least 10ms)
    // We check for at least 5ms to account for test execution time variance
    expect(duration).toBeGreaterThanOrEqual(5);
  });

  it("supports function returning tuple for per-chunk random delays", async () => {
    const userMessage = createUserMessage("Hello");
    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Test" };
      },
      chunkDelayMs: (chunk) => {
        if (chunk.type === "text-delta") {
          return [15, 25]; // Random delay between 15ms and 25ms for text deltas
        }
        return 0;
      },
    });

    const start = Date.now();
    await readAllChunks(
      await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      }),
    );
    const duration = Date.now() - start;

    // Should have some delay from text-delta chunks
    expect(duration).toBeGreaterThanOrEqual(5);
  });

  it("aborts the stream when the abort signal fires", async () => {
    const userMessage = createUserMessage("Hello");
    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Streaming..." };
      },
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
    const previousAssistant: UIMessage = {
      id: "assistant-1",
      role: "assistant",
      parts: [{ type: "text", text: "Old response" }],
    } as UIMessage;

    const transport = new StaticChatTransport({
      async *mockResponse({ messageId }) {
        // Use the provided messageId for regeneration
        yield { type: "text", text: "Fresh response" };
      },
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

  it("yields multiple parts in sequence", async () => {
    const userMessage = createUserMessage("Hello");

    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Response one" };
        yield { type: "text", text: "Response two" };
      },
    });

    const stream = await transport.sendMessages({
      ...createSendContext({ messages: [userMessage] }),
      abortSignal: undefined,
    });

    const chunks = await readAllChunks(stream);
    const textChunks = chunks.filter(
      (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
        chunk.type === "text-delta",
    );
    expect(textChunks).toHaveLength(2);
    expect(textChunks[0]?.delta).toBe("Response one");
    expect(textChunks[1]?.delta).toBe("Response two");
  });

  describe("tool calls", () => {
    it("streams tool-input-available and tool-output-available for tool parts with output", async () => {
      const userMessage = createUserMessage("Search for cats");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_123",
            state: "output-available",
            input: { query: "cats" },
            output: { results: [{ title: "All About Cats" }] },
          } as UIMessage["parts"][number] & { toolName?: string };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      expect(chunks.map((chunk) => chunk.type)).toEqual([
        "start",
        "tool-input-available",
        "tool-output-available",
        "finish",
      ]);

      const inputChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      expect(inputChunk).toMatchObject({
        type: "tool-input-available",
        toolCallId: "call_123",
        toolName: "tool", // toolName defaults to "tool" when not provided
        input: { query: "cats" },
      });

      const outputChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<
          UIMessageChunk,
          { type: "tool-output-available" }
        > => chunk.type === "tool-output-available",
      );
      expect(outputChunk).toMatchObject({
        type: "tool-output-available",
        toolCallId: "call_123",
        output: { results: [{ title: "All About Cats" }] },
      });
    });

    it("streams tool-input-available and tool-output-error for tool parts with error", async () => {
      const userMessage = createUserMessage("Book a reservation");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-booking",
            toolCallId: "call_failure",
            state: "output-error",
            input: { reservationId: 123 },
            errorText: "Reservation not found",
          } as UIMessage["parts"][number] & { toolName?: string };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      expect(chunks.map((chunk) => chunk.type)).toEqual([
        "start",
        "tool-input-available",
        "tool-output-error",
        "finish",
      ]);

      const errorChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "tool-output-error" }> =>
          chunk.type === "tool-output-error",
      );
      expect(errorChunk).toMatchObject({
        type: "tool-output-error",
        toolCallId: "call_failure",
        errorText: "Reservation not found",
      });
    });

    it("handles dynamic-tool type", async () => {
      const userMessage = createUserMessage("Use a tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "dynamic-tool",
            toolCallId: "call_dynamic",
            state: "output-available",
            input: { action: "perform" },
            output: { result: "success" },
          } as UIMessage["parts"][number] & { toolName?: string };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      expect(chunks.map((chunk) => chunk.type)).toEqual([
        "start",
        "tool-input-available",
        "tool-output-available",
        "finish",
      ]);

      const inputChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      expect(inputChunk).toMatchObject({
        toolCallId: "call_dynamic",
        toolName: "tool", // toolName defaults to "tool" when not provided
      });
    });

    it("handles tool parts without toolName (defaults to 'tool')", async () => {
      const userMessage = createUserMessage("Call a tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-custom",
            toolCallId: "call_no_name",
            state: "input-streaming",
            input: { data: "test" },
          } as UIMessage["parts"][number];
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const inputChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      expect(inputChunk).toMatchObject({
        toolCallId: "call_no_name",
        toolName: "tool",
        input: { data: "test" },
      });
    });

    it("handles tool parts with explicit toolName", async () => {
      const userMessage = createUserMessage("Use named tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_named",
            toolName: "search-tool",
            state: "output-available",
            input: { query: "test" },
            output: { results: [] },
          } as any;
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const inputChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      expect(inputChunk).toMatchObject({
        toolCallId: "call_named",
        toolName: "search-tool", // toolName is used when provided
        input: { query: "test" },
      });
    });

    it("handles tool parts with only input (no output state)", async () => {
      const userMessage = createUserMessage("Start a tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-task",
            toolCallId: "call_input_only",
            state: "input-streaming",
            input: { task: "do something" },
          } as UIMessage["parts"][number];
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      expect(chunks.map((chunk) => chunk.type)).toEqual([
        "start",
        "tool-input-available",
        "finish",
      ]);
    });

    it("handles tool parts with output but no state (uses output presence)", async () => {
      const userMessage = createUserMessage("Get results");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-query",
            toolCallId: "call_output_no_state",
            state: "output-available",
            input: { query: "test" },
            output: { result: "data" },
          } as UIMessage["parts"][number];
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      expect(chunks.map((chunk) => chunk.type)).toEqual([
        "start",
        "tool-input-available",
        "tool-output-available",
        "finish",
      ]);
    });

    it("handles tool parts with errorText but no state", async () => {
      const userMessage = createUserMessage("Try operation");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-operation",
            toolCallId: "call_error",
            state: "output-error",
            input: { op: "test" },
            errorText: "Operation failed",
          } as UIMessage["parts"][number];
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      expect(chunks.map((chunk) => chunk.type)).toEqual([
        "start",
        "tool-input-available",
        "tool-output-error",
        "finish",
      ]);

      const errorChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "tool-output-error" }> =>
          chunk.type === "tool-output-error",
      );
      expect(errorChunk?.errorText).toBe("Operation failed");
    });

    it("handles multiple tool parts in sequence", async () => {
      const userMessage = createUserMessage("Check multiple sources");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_a",
            state: "output-available",
            input: { query: "coffee" },
            output: { results: [] },
          } as UIMessage["parts"][number];
          yield {
            type: "tool-map",
            toolCallId: "call_b",
            state: "output-available",
            input: { origin: "A", destination: "B" },
            output: { etaMinutes: 5 },
          } as UIMessage["parts"][number];
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const toolChunks = chunks.filter(
        (chunk) =>
          chunk.type === "tool-input-available" ||
          chunk.type === "tool-output-available",
      );
      expect(toolChunks).toHaveLength(4); // 2 input + 2 output

      const firstInput = toolChunks[0] as Extract<
        UIMessageChunk,
        { type: "tool-input-available" }
      >;
      expect(firstInput.toolCallId).toBe("call_a");

      const secondInput = toolChunks[2] as Extract<
        UIMessageChunk,
        { type: "tool-input-available" }
      >;
      expect(secondInput.toolCallId).toBe("call_b");
    });

    it("handles tool parts mixed with text parts", async () => {
      const userMessage = createUserMessage("Search and explain");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Let me search for that." };
          yield {
            type: "tool-search",
            toolCallId: "call_mixed",
            state: "output-available",
            input: { query: "something" },
            output: { results: [] },
          } as UIMessage["parts"][number];
          yield { type: "text", text: "Here are the results!" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      expect(chunks.map((chunk) => chunk.type)).toEqual([
        "start",
        "start-step",
        "text-start",
        "text-delta",
        "text-end",
        "tool-input-available",
        "tool-output-available",
        "text-start",
        "text-delta",
        "text-end",
        "finish-step",
        "finish",
      ]);
    });

    it("replays tool calls via reconnectToStream", async () => {
      const userMessage = createUserMessage("Search");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_reconnect",
            state: "output-available",
            input: { query: "test" },
            output: { results: [] },
          } as UIMessage["parts"][number];
        },
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
        "tool-input-available",
        "tool-output-available",
        "finish",
      ]);
    });
  });
});
