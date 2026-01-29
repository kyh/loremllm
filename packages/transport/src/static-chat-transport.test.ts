import type { UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it, vi } from "vitest";

import { StaticChatTransport } from "./index";

// ============================================================================
// Test Helpers
// ============================================================================

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

// Helper to process chunks like useChat would - extract text from text-delta chunks
const extractTextFromChunks = (chunks: UIMessageChunk[]): string => {
  const textDeltas = chunks.filter(
    (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
      chunk.type === "text-delta",
  );
  return textDeltas.map((chunk) => chunk.delta).join("");
};

// ============================================================================
// Basic Functionality
// ============================================================================

describe("StaticChatTransport", () => {
  describe("Basic Streaming", () => {
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

    it("regenerates an existing assistant message by id", async () => {
      const userMessage = createUserMessage("Hello");
      const previousAssistant: UIMessage = {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "Old response" }],
      } as UIMessage;

      const transport = new StaticChatTransport({
        async *mockResponse({ messageId }) {
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
  });

  // ============================================================================
  // Message Parts
  // ============================================================================

  describe("Message Parts", () => {
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

    it("handles reasoning and text parts together", async () => {
      const userMessage = createUserMessage("Question");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "reasoning",
            text: "First I think about this problem carefully step by step",
          };
          yield { type: "text", text: "Here is my final answer to you" };
        },
        autoChunkText: false,
        autoChunkReasoning: false,
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltas = chunks.filter(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );
      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      expect(reasoningDeltas.length).toBeGreaterThan(0);
      expect(textDeltas.length).toBeGreaterThan(0);

      const reasoningText = reasoningDeltas
        .map((chunk) => chunk.delta)
        .join("");
      const textContent = textDeltas.map((chunk) => chunk.delta).join("");

      expect(reasoningText).toBe(
        "First I think about this problem carefully step by step",
      );
      expect(textContent).toBe("Here is my final answer to you");
    });
  });

  // ============================================================================
  // Tool Calls
  // ============================================================================

  describe("Tool Calls", () => {
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
        toolName: "tool",
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
        toolName: "tool",
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
        toolName: "search-tool",
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

    it("handles progressive tool loading with state transitions", async () => {
      const userMessage = createUserMessage("Get weather");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-weather",
            toolCallId: "call_weather_1",
            toolName: "weather",
            state: "input-available",
            input: { location: "San Francisco" },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 50));

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

    it("does not emit duplicate chunks for unchanged tool state", async () => {
      const userMessage = createUserMessage("Process data");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-process",
            toolCallId: "call_process_1",
            state: "input-available",
            input: { data: "test" },
          } as UIMessage["parts"][number];

          yield {
            type: "tool-process",
            toolCallId: "call_process_1",
            state: "input-available",
            input: { data: "test" },
          } as UIMessage["parts"][number];

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

      expect(toolChunks).toHaveLength(2);
      expect(toolChunks[0].type).toBe("tool-input-available");
      expect(toolChunks[1].type).toBe("tool-output-available");
    });

    it("handles tool error state in progressive loading", async () => {
      const userMessage = createUserMessage("Process with error");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-process",
            toolCallId: "call_error_1",
            state: "input-available",
            input: { data: "test" },
          } as UIMessage["parts"][number];

          await new Promise((resolve) => setTimeout(resolve, 10));

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
  });

  // ============================================================================
  // Auto-Chunking
  // ============================================================================

  describe("Auto-Chunking", () => {
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

      expect(textDeltaChunks.length).toBeGreaterThan(1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      expect(fullText).toBe("Hello world test");
    });

    it("chunks reasoning word-by-word by default", async () => {
      const userMessage = createUserMessage("Think");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "reasoning",
            text: "Let me think about this carefully",
          };
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

      expect(textDeltaChunks).toHaveLength(0);
    });
  });

  // ============================================================================
  // Stream Control
  // ============================================================================

  describe("Stream Control", () => {
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
        chunkDelayMs: [10, 20],
      });

      const start = Date.now();
      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );
      const duration = Date.now() - start;

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
            return [15, 25];
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

    it("aborts text streaming halfway through when auto-chunking", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "text",
            text: "This is a long message that will be chunked word by word",
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
      const maxChunks = 5;

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
      expect(chunks.length).toBeLessThanOrEqual(maxChunks + 1);

      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      expect(textDeltas.length).toBeGreaterThan(0);
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
            return 10;
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

      expect(delaySpy).toHaveBeenCalledWith("tool-input-available");
      expect(delaySpy).toHaveBeenCalledWith("tool-output-available");

      const toolChunks = chunks.filter(
        (chunk) =>
          chunk.type === "tool-input-available" ||
          chunk.type === "tool-output-available",
      );
      expect(toolChunks).toHaveLength(2);
    });
  });

  // ============================================================================
  // Reconnection
  // ============================================================================

  describe("Reconnection", () => {
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

    it("replays chunked messages via reconnectToStream", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Hello world" };
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
      const textDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      expect(textDeltaChunks.length).toBeGreaterThan(1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      expect(fullText).toBe("Hello world");
    });

    it("clears specific chat cache via clearCache", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Response" };
        },
      });

      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ chatId: "chat-1", messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ chatId: "chat-2", messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      // Clear only chat-1
      transport.clearCache("chat-1");

      // chat-1 should be gone
      const reconnect1 = await transport.reconnectToStream({ chatId: "chat-1" });
      expect(reconnect1).toBeNull();

      // chat-2 should still exist
      const reconnect2 = await transport.reconnectToStream({ chatId: "chat-2" });
      expect(reconnect2).not.toBeNull();
    });

    it("clears all caches via clearCache without argument", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Response" };
        },
      });

      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ chatId: "chat-1", messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ chatId: "chat-2", messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      // Clear all
      transport.clearCache();

      // Both should be gone
      const reconnect1 = await transport.reconnectToStream({ chatId: "chat-1" });
      expect(reconnect1).toBeNull();

      const reconnect2 = await transport.reconnectToStream({ chatId: "chat-2" });
      expect(reconnect2).toBeNull();
    });
  });

  // ============================================================================
  // Integration Tests (useChat-like scenarios)
  // ============================================================================

  describe("Integration Scenarios (useChat-like)", () => {
    it("handles text streaming as useChat would receive it", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Hello! This is a streaming response." };
        },
        chunkDelayMs: 5,
      });

      const userMessage = createUserMessage("Hi there");
      const stream = await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      });

      const chunks = await readAllChunks(stream);
      const fullText = extractTextFromChunks(chunks);
      expect(fullText).toBe("Hello! This is a streaming response.");
    });

    it("handles tool calls as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_123",
            state: "output-available",
            input: { query: "test query" },
            output: { results: [{ title: "Result 1" }] },
          } as UIMessage["parts"][number];
        },
      });

      const userMessage = createUserMessage("Search for something");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const toolInputChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      const toolOutputChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<
          UIMessageChunk,
          { type: "tool-output-available" }
        > => chunk.type === "tool-output-available",
      );

      expect(toolInputChunk).toBeDefined();
      expect(toolInputChunk?.toolCallId).toBe("call_123");
      expect(toolOutputChunk).toBeDefined();
      expect(toolOutputChunk?.toolCallId).toBe("call_123");
    });

    it("handles data-* parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "data-widget",
            id: "widget-1",
            data: { count: 42, status: "active" },
          };
        },
      });

      const userMessage = createUserMessage("Show widget");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const dataChunk = chunks.find(
        (
          chunk,
        ): chunk is UIMessageChunk & { type: "data-widget"; data: unknown } =>
          chunk.type === "data-widget",
      );

      expect(dataChunk).toBeDefined();
      expect(dataChunk?.data).toEqual({ count: 42, status: "active" });
    });

    it("handles source-url parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "source-url",
            sourceId: "src-1",
            url: "https://example.com/article",
            title: "Example Article",
          };
        },
      });

      const userMessage = createUserMessage("Find sources");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const sourceChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "source-url" }> =>
          chunk.type === "source-url",
      );

      expect(sourceChunk).toBeDefined();
      expect(sourceChunk).toMatchObject({
        type: "source-url",
        sourceId: "src-1",
        url: "https://example.com/article",
        title: "Example Article",
      });
    });

    it("handles source-document parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "source-document",
            sourceId: "doc-1",
            mediaType: "application/pdf",
            title: "Important Document",
            filename: "document.pdf",
          };
        },
      });

      const userMessage = createUserMessage("Show document");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const docChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "source-document" }> =>
          chunk.type === "source-document",
      );

      expect(docChunk).toBeDefined();
      expect(docChunk).toMatchObject({
        type: "source-document",
        sourceId: "doc-1",
        mediaType: "application/pdf",
        title: "Important Document",
        filename: "document.pdf",
      });
    });

    it("handles reasoning parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "reasoning",
            text: "Let me think about this step by step...",
          };
          yield {
            type: "text",
            text: "Based on my reasoning, here's the answer.",
          };
        },
        autoChunkText: false,
        autoChunkReasoning: false,
      });

      const userMessage = createUserMessage("Think and respond");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltas = chunks.filter(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );
      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      expect(reasoningDeltas.length).toBeGreaterThan(0);
      expect(textDeltas.length).toBeGreaterThan(0);

      const reasoningText = reasoningDeltas
        .map((chunk) => chunk.delta)
        .join("");
      const textContent = textDeltas.map((chunk) => chunk.delta).join("");

      expect(reasoningText).toBe("Let me think about this step by step...");
      expect(textContent).toBe("Based on my reasoning, here's the answer.");
    });

    it("handles multiple tool calls in sequence as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_search",
            state: "output-available",
            input: { query: "coffee" },
            output: { results: [{ title: "Coffee Shop" }] },
          } as UIMessage["parts"][number];
          yield {
            type: "tool-map",
            toolCallId: "call_map",
            state: "output-available",
            input: { origin: "A", destination: "B" },
            output: { etaMinutes: 15 },
          } as UIMessage["parts"][number];
          yield {
            type: "text",
            text: "I found a coffee shop and calculated the route.",
          };
        },
        autoChunkText: false,
      });

      const userMessage = createUserMessage("Search and route");
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

      expect(toolChunks.length).toBeGreaterThanOrEqual(4); // 2 inputs + 2 outputs

      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      expect(textDeltas.length).toBeGreaterThan(0);
      expect(extractTextFromChunks(chunks)).toContain(
        "I found a coffee shop and calculated the route.",
      );
    });

    it("handles tool calls with errors as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-process",
            toolCallId: "call_error",
            state: "output-error",
            input: { data: "test" },
            errorText: "Processing failed: Invalid input",
          } as UIMessage["parts"][number];
        },
      });

      const userMessage = createUserMessage("Process data");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const errorChunk = chunks.find(
        (
          chunk,
        ): chunk is Extract<UIMessageChunk, { type: "tool-output-error" }> =>
          chunk.type === "tool-output-error",
      );

      expect(errorChunk).toBeDefined();
      expect(errorChunk?.toolCallId).toBe("call_error");
      expect(errorChunk?.errorText).toBe("Processing failed: Invalid input");
    });

    it("handles progressive tool loading as useChat would process it", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-weather",
            toolCallId: "call_weather",
            state: "input-available",
            input: { location: "NYC" },
          } as UIMessage["parts"][number];
          await new Promise((resolve) => setTimeout(resolve, 10));
          yield {
            type: "tool-weather",
            toolCallId: "call_weather",
            state: "output-available",
            input: { location: "NYC" },
            output: { temperature: 68, condition: "sunny" },
          } as UIMessage["parts"][number];
        },
      });

      const userMessage = createUserMessage("Get weather");
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

      expect(toolChunks.length).toBe(2);
      expect(toolChunks[0].type).toBe("tool-input-available");
      expect(toolChunks[1].type).toBe("tool-output-available");

      const outputChunk = toolChunks[1] as Extract<
        UIMessageChunk,
        { type: "tool-output-available" }
      >;
      expect(outputChunk.output).toEqual({
        temperature: 68,
        condition: "sunny",
      });
    });

    it("handles mixed content (text, tools, data) as useChat would process it", async () => {
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
          yield {
            type: "data-status",
            id: "status-1",
            data: { status: "completed" },
          };
          yield { type: "text", text: "Here are the results!" };
        },
        autoChunkText: false,
      });

      const userMessage = createUserMessage("Search and show status");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      const toolChunks = chunks.filter(
        (chunk) =>
          chunk.type === "tool-input-available" ||
          chunk.type === "tool-output-available",
      );
      const dataChunk = chunks.find((chunk) => chunk.type === "data-status");

      expect(textDeltas.length).toBeGreaterThanOrEqual(2);
      expect(toolChunks.length).toBeGreaterThanOrEqual(2);
      expect(dataChunk).toBeDefined();
    });

    it("handles file parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "file",
            mediaType: "image/png",
            url: "https://example.com/image.png",
          };
        },
      });

      const userMessage = createUserMessage("Show file");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const fileChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "file" }> =>
          chunk.type === "file",
      );

      expect(fileChunk).toBeDefined();
      expect(fileChunk).toMatchObject({
        type: "file",
        mediaType: "image/png",
        url: "https://example.com/image.png",
      });
    });

    it("handles streaming text with auto-chunking as useChat would receive it", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "text",
            text: "This is a streaming message that will be chunked word by word",
          };
        },
        chunkDelayMs: 5,
      });

      const userMessage = createUserMessage("Stream this");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      expect(textDeltas.length).toBeGreaterThan(1);
      const fullText = extractTextFromChunks(chunks);
      expect(fullText).toBe(
        "This is a streaming message that will be chunked word by word",
      );
    });

    it("handles aborting mid-stream as useChat.stop() would", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "text",
            text: "This is a very long message that will be chunked and potentially aborted",
          };
        },
        chunkDelayMs: 20,
      });

      const userMessage = createUserMessage("Stream this");
      const abortController = new AbortController();
      const stream = await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: abortController.signal,
      });

      const reader = stream.getReader();
      const chunks: UIMessageChunk[] = [];
      let chunkCount = 0;
      const maxChunks = 5;

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
      expect(chunks.length).toBeLessThanOrEqual(maxChunks + 2);

      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      expect(textDeltas.length).toBeGreaterThan(0);
    });
  });
});
