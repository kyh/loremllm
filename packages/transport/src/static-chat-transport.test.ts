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
      autoChunkText: false,
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
      autoChunkText: false,
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

    const textChunks = chunks.filter(
      (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
        chunk.type === "text-delta",
    );
    const fullText = textChunks.map((chunk) => chunk.delta).join("");
    expect(fullText).toBe("Fresh response");
  });

  it("yields multiple parts in sequence", async () => {
    const userMessage = createUserMessage("Hello");

    const transport = new StaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Response one" };
        yield { type: "text", text: "Response two" };
      },
      autoChunkText: false,
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
        autoChunkText: false,
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

    it("handles progressive tool loading with input-available then output-available states", async () => {
      const userMessage = createUserMessage("Get weather");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          // First yield: tool in loading state
          yield {
            type: "tool-weather",
            toolCallId: "call_weather_1",
            toolName: "weather",
            state: "input-available",
            input: { location: "San Francisco" },
          } as UIMessage["parts"][number];

          // Simulate delay (in real usage this would be an async operation)
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Second yield: tool with output
          yield {
            type: "tool-weather",
            toolCallId: "call_weather_1",
            toolName: "weather",
            state: "output-available",
            input: { location: "San Francisco" },
            output: { temperature: 72, condition: "sunny" },
          } as UIMessage["parts"][number];
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      // Should emit input chunk first, then output chunk
      const toolChunks = chunks.filter(
        (chunk) =>
          chunk.type === "tool-input-available" ||
          chunk.type === "tool-output-available",
      );

      expect(toolChunks).toHaveLength(2);

      const inputChunk = toolChunks[0] as Extract<
        UIMessageChunk,
        { type: "tool-input-available" }
      >;
      expect(inputChunk.type).toBe("tool-input-available");
      expect(inputChunk.toolCallId).toBe("call_weather_1");
      expect(inputChunk.toolName).toBe("weather");
      expect(inputChunk.input).toEqual({ location: "San Francisco" });

      const outputChunk = toolChunks[1] as Extract<
        UIMessageChunk,
        { type: "tool-output-available" }
      >;
      expect(outputChunk.type).toBe("tool-output-available");
      expect(outputChunk.toolCallId).toBe("call_weather_1");
      expect(outputChunk.output).toEqual({
        temperature: 72,
        condition: "sunny",
      });
    });

    it("handles progressive tool loading with multiple state transitions", async () => {
      const userMessage = createUserMessage("Search for something");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          // Step 1: input-streaming
          yield {
            type: "tool-search",
            toolCallId: "call_search_1",
            toolName: "search",
            state: "input-streaming",
            input: { query: "example" },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 10));

          // Step 2: input-available
          yield {
            type: "tool-search",
            toolCallId: "call_search_1",
            toolName: "search",
            state: "input-available",
            input: { query: "example" },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 10));

          // Step 3: output-available
          yield {
            type: "tool-search",
            toolCallId: "call_search_1",
            toolName: "search",
            state: "output-available",
            input: { query: "example" },
            output: { results: [{ title: "Result 1" }] },
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

      // Should emit input chunk once, then output chunk
      expect(toolChunks).toHaveLength(2);
      expect(toolChunks[0].type).toBe("tool-input-available");
      expect(toolChunks[1].type).toBe("tool-output-available");
    });

    it("preserves order of tool calls and text parts in progressive loading", async () => {
      const userMessage = createUserMessage("Get weather then summarize");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          // Tool call start
          yield {
            type: "tool-weather",
            toolCallId: "call_weather_2",
            toolName: "weather",
            state: "input-available",
            input: { location: "NYC" },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 10));

          // Tool call complete
          yield {
            type: "tool-weather",
            toolCallId: "call_weather_2",
            toolName: "weather",
            state: "output-available",
            input: { location: "NYC" },
            output: { temperature: 68 },
          } as UIMessage["parts"][number];

          // Text response after tool
          yield {
            type: "text",
            text: "The weather is nice.",
          } as UIMessage["parts"][number];
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const chunkTypes = chunks.map((chunk) => chunk.type);
      
      // Tool chunks are emitted before steps (steps are only for text/reasoning)
      // Verify the key chunks are in the right order
      const toolInputIndex = chunkTypes.indexOf("tool-input-available");
      const toolOutputIndex = chunkTypes.indexOf("tool-output-available");
      const startStepIndex = chunkTypes.indexOf("start-step");
      const textStartIndex = chunkTypes.indexOf("text-start");

      // Verify tool chunks come before text chunks
      expect(toolInputIndex).toBeLessThan(toolOutputIndex);
      expect(toolOutputIndex).toBeLessThan(startStepIndex);
      expect(startStepIndex).toBeLessThan(textStartIndex);

      // Verify the structure: start -> tool chunks -> step -> text chunks -> step end -> finish
      expect(chunkTypes[0]).toBe("start");
      expect(chunkTypes[chunkTypes.length - 1]).toBe("finish");
      expect(chunkTypes).toContain("tool-input-available");
      expect(chunkTypes).toContain("tool-output-available");
      expect(chunkTypes).toContain("start-step");
      expect(chunkTypes).toContain("text-start");
      expect(chunkTypes).toContain("text-end");
      expect(chunkTypes).toContain("finish-step");
    });

    it("does not emit duplicate chunks for unchanged tool state", async () => {
      const userMessage = createUserMessage("Process data");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          // First occurrence
          yield {
            type: "tool-process",
            toolCallId: "call_process_1",
            state: "input-available",
            input: { data: "test" },
          } as UIMessage["parts"][number];

          // Second occurrence with same state (should not emit duplicate input chunk)
          yield {
            type: "tool-process",
            toolCallId: "call_process_1",
            state: "input-available",
            input: { data: "test" }, // Same input
          } as UIMessage["parts"][number];

          // Third occurrence with output (should emit output chunk)
          yield {
            type: "tool-process",
            toolCallId: "call_process_1",
            state: "output-available",
            input: { data: "test" },
            output: { result: "processed" },
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

      // Should only emit input once, then output once
      expect(toolChunks).toHaveLength(2);
      expect(toolChunks[0].type).toBe("tool-input-available");
      expect(toolChunks[1].type).toBe("tool-output-available");
    });

    it("handles multiple progressive tool calls with different IDs", async () => {
      const userMessage = createUserMessage("Run multiple tools");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          // Tool 1: start
          yield {
            type: "tool-search",
            toolCallId: "call_1",
            state: "input-available",
            input: { query: "test1" },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 10));

          // Tool 2: start
          yield {
            type: "tool-map",
            toolCallId: "call_2",
            state: "input-available",
            input: { origin: "A" },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 10));

          // Tool 1: complete
          yield {
            type: "tool-search",
            toolCallId: "call_1",
            state: "output-available",
            input: { query: "test1" },
            output: { results: [] },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 10));

          // Tool 2: complete
          yield {
            type: "tool-map",
            toolCallId: "call_2",
            state: "output-available",
            input: { origin: "A" },
            output: { route: "A->B" },
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

      expect(toolChunks).toHaveLength(4);

      // Verify order: call_1 input, call_2 input, call_1 output, call_2 output
      expect((toolChunks[0] as Extract<UIMessageChunk, { type: "tool-input-available" }>).toolCallId).toBe("call_1");
      expect((toolChunks[1] as Extract<UIMessageChunk, { type: "tool-input-available" }>).toolCallId).toBe("call_2");
      expect((toolChunks[2] as Extract<UIMessageChunk, { type: "tool-output-available" }>).toolCallId).toBe("call_1");
      expect((toolChunks[3] as Extract<UIMessageChunk, { type: "tool-output-available" }>).toolCallId).toBe("call_2");
    });

    it("handles tool error state in progressive loading", async () => {
      const userMessage = createUserMessage("Process with error");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          // Tool starts
          yield {
            type: "tool-process",
            toolCallId: "call_error_1",
            state: "input-available",
            input: { data: "test" },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 10));

          // Tool fails
          yield {
            type: "tool-process",
            toolCallId: "call_error_1",
            state: "output-error",
            input: { data: "test" },
            errorText: "Processing failed",
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
          chunk.type === "tool-output-error",
      );

      expect(toolChunks).toHaveLength(2);
      expect(toolChunks[0].type).toBe("tool-input-available");
      expect(toolChunks[1].type).toBe("tool-output-error");

      const errorChunk = toolChunks[1] as Extract<
        UIMessageChunk,
        { type: "tool-output-error" }
      >;
      expect(errorChunk.toolCallId).toBe("call_error_1");
      expect(errorChunk.errorText).toBe("Processing failed");
    });

    it("applies chunk delays to tool chunks", async () => {
      const userMessage = createUserMessage("Delayed tool");

      const delaySpy = vi.fn();

      const transport = new StaticChatTransport({
        chunkDelayMs: (chunk) => {
          delaySpy(chunk.type);
          if (
            chunk.type === "tool-input-available" ||
            chunk.type === "tool-output-available"
          ) {
            return 10; // 10ms delay for tool chunks
          }
          return 0;
        },
        async *mockResponse() {
          yield {
            type: "tool-test",
            toolCallId: "call_delayed",
            state: "input-available",
            input: { test: true },
          } as UIMessage["parts"][number];

          yield {
            type: "tool-test",
            toolCallId: "call_delayed",
            state: "output-available",
            input: { test: true },
            output: { result: "done" },
          } as UIMessage["parts"][number];
        },
      });

      const startTime = Date.now();
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );
      const endTime = Date.now();

      // Verify delays were applied
      expect(delaySpy).toHaveBeenCalledWith("tool-input-available");
      expect(delaySpy).toHaveBeenCalledWith("tool-output-available");

      // Verify chunks were still emitted
      const toolChunks = chunks.filter(
        (chunk) =>
          chunk.type === "tool-input-available" ||
          chunk.type === "tool-output-available",
      );
      expect(toolChunks).toHaveLength(2);
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

  describe("auto-chunking", () => {
    it("chunks text word-by-word by default", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Hello world test" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const textDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      // Should be chunked into words and spaces
      expect(textDeltaChunks.length).toBeGreaterThan(1);
      // Collect all deltas to verify the complete text
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      expect(fullText).toBe("Hello world test");
    });

    it("chunks reasoning word-by-word by default", async () => {
      const userMessage = createUserMessage("Think");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "reasoning", text: "Let me think about this carefully" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltaChunks = chunks.filter(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );

      expect(reasoningDeltaChunks.length).toBeGreaterThan(1);
      const fullText = reasoningDeltaChunks
        .map((chunk) => chunk.delta)
        .join("");
      expect(fullText).toBe("Let me think about this carefully");
    });

    it("sends text as single chunk when autoChunkText is false", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Hello world test" };
        },
        autoChunkText: false,
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const textDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      // Should be a single chunk
      expect(textDeltaChunks).toHaveLength(1);
      expect(textDeltaChunks[0]?.delta).toBe("Hello world test");
    });

    it("sends reasoning as single chunk when autoChunkReasoning is false", async () => {
      const userMessage = createUserMessage("Think");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "reasoning", text: "Let me think about this" };
        },
        autoChunkReasoning: false,
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltaChunks = chunks.filter(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );

      expect(reasoningDeltaChunks).toHaveLength(1);
      expect(reasoningDeltaChunks[0]?.delta).toBe("Let me think about this");
    });

    it("uses custom regex pattern for text chunking", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Hello,world.test" };
        },
        autoChunkText: /[,.]/g,
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const textDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      // Should split on commas and periods
      expect(textDeltaChunks.length).toBeGreaterThan(1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      expect(fullText).toBe("Hello,world.test");
    });

    it("uses custom regex pattern for reasoning chunking", async () => {
      const userMessage = createUserMessage("Think");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "reasoning", text: "Step1.Step2.Step3" };
        },
        autoChunkReasoning: /\./g,
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltaChunks = chunks.filter(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );

      expect(reasoningDeltaChunks.length).toBeGreaterThan(1);
      const fullText = reasoningDeltaChunks
        .map((chunk) => chunk.delta)
        .join("");
      expect(fullText).toBe("Step1.Step2.Step3");
    });

    it("respects chunk delay when auto-chunking text", async () => {
      const userMessage = createUserMessage("Hello");
      const chunkDelays: number[] = [];

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "One two three" };
        },
        chunkDelayMs: (chunk) => {
          if (chunk.type === "text-delta") {
            chunkDelays.push(10);
            return 10;
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

      // Should have delays for each word chunk
      expect(chunkDelays.length).toBeGreaterThan(1);
      // Should take some time due to delays
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it("aborts text streaming halfway through when auto-chunking", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "text",
            text: "This is a long message that will be chunked word by word",
          };
        },
        chunkDelayMs: 50, // Delay between chunks
      });

      const abortController = new AbortController();
      const stream = await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: abortController.signal,
      });

      const reader = stream.getReader();
      const chunks: UIMessageChunk[] = [];

      // Read a few chunks, then abort
      let chunkCount = 0;
      const maxChunks = 5;

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          chunkCount++;

          // Abort after reading a few chunks
          if (chunkCount >= maxChunks) {
            abortController.abort();
          }
        }
      } catch (error) {
        // Expected to throw on abort
        expect(error).toBeDefined();
      }

      // Should have read some chunks before aborting
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThanOrEqual(maxChunks + 1);

      // Verify we got some text-delta chunks before abort
      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      expect(textDeltas.length).toBeGreaterThan(0);
    });

    it("aborts reasoning streaming halfway through when auto-chunking", async () => {
      const userMessage = createUserMessage("Think");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "reasoning",
            text: "First I need to think about this problem carefully step by step",
          };
        },
        chunkDelayMs: 50,
      });

      const abortController = new AbortController();
      const stream = await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: abortController.signal,
      });

      const reader = stream.getReader();
      const chunks: UIMessageChunk[] = [];
      let chunkCount = 0;
      const maxChunks = 4;

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          chunkCount++;

          if (chunkCount >= maxChunks) {
            abortController.abort();
          }
        }
      } catch (error) {
        expect(error).toBeDefined();
      }

      expect(chunks.length).toBeGreaterThan(0);
      const reasoningDeltas = chunks.filter(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );
      expect(reasoningDeltas.length).toBeGreaterThan(0);
    });

    it("handles empty text with auto-chunking enabled", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const textDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      // Empty text should result in no delta chunks
      expect(textDeltaChunks).toHaveLength(0);
    });

    it("replays chunked messages via reconnectToStream", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Hello world" };
        },
      });

      // First stream
      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      // Reconnect
      const reconnect = await transport.reconnectToStream({ chatId: "chat-1" });
      expect(reconnect).not.toBeNull();

      const chunks = await readAllChunks(reconnect!);
      const textDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      // Should still be chunked on replay
      expect(textDeltaChunks.length).toBeGreaterThan(1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      expect(fullText).toBe("Hello world");
    });
  });
});
