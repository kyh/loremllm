import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import type { UIMessage, UIMessageChunk } from "ai";

import { StaticChatTransport } from "./index";

// ============================================================================
// Test Helpers
// ============================================================================

const createUserMessage = (text: string, id = "user-1"): UIMessage => ({
  id,
  parts: [{ text, type: "text" }],
  role: "user",
});

/** Narrows a chunk to one union member, failing the test when the discriminant differs. */
const chunkOfType = <TYPE extends UIMessageChunk["type"]>(
  chunk: UIMessageChunk | undefined,
  type: TYPE,
): Extract<UIMessageChunk, { type: TYPE }> => {
  if (chunk?.type !== type) {
    throw new Error(`Expected chunk of type "${type}", got "${chunk?.type}".`);
  }
  // SAFETY: the discriminant was checked just above; TypeScript cannot relate
  // the generic TYPE parameter back to the matching union member on its own.
  return chunk as Extract<UIMessageChunk, { type: TYPE }>;
};

const readAllChunks = async (stream: ReadableStream<UIMessageChunk>): Promise<UIMessageChunk[]> => {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
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
  body: undefined,
  chatId,
  headers: undefined,
  messageId,
  messages,
  metadata: undefined,
  trigger,
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
    test("streams the assistant message as UI message chunks", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        autoChunkText: false,
        async *mockResponse() {
          yield { text: "Hi there!", type: "text" };
        },
      });

      const stream = await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      });

      const chunks = await readAllChunks(stream);
      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "start-step", "text-start", "text-delta", "text-end", "finish-step", "finish"],
      );
      assert.partialDeepStrictEqual(
        chunks.find((chunk) => chunk.type === "text-delta"),
        {
          delta: "Hi there!",
        },
      );
    });

    test("requires mockResponse to yield at least one part", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          // Yield nothing
        },
      });

      await assert.rejects(
        transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
        /at least one part/iu,
      );
    });

    test("yields multiple parts in sequence", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        autoChunkText: false,
        async *mockResponse() {
          yield { text: "Response one", type: "text" };
          yield { text: "Response two", type: "text" };
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
      assert.strictEqual(textChunks.length, 2);
      assert.strictEqual(textChunks[0]?.delta, "Response one");
      assert.strictEqual(textChunks[1]?.delta, "Response two");
    });

    test("regenerates an existing assistant message by id", async () => {
      const userMessage = createUserMessage("Hello");
      const previousAssistant: UIMessage = {
        id: "assistant-1",
        parts: [{ text: "Old response", type: "text" }],
        role: "assistant",
      };

      const transport = new StaticChatTransport({
        autoChunkText: false,
        async *mockResponse() {
          yield { text: "Fresh response", type: "text" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({
            messageId: "assistant-1",
            messages: [userMessage, previousAssistant],
            trigger: "regenerate-message",
          }),
          abortSignal: undefined,
        }),
      );

      const textChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      const fullText = textChunks.map((chunk) => chunk.delta).join("");
      assert.strictEqual(fullText, "Fresh response");
    });
  });

  // ============================================================================
  // Message Parts
  // ============================================================================

  describe("Message Parts", () => {
    test("supports data-* parts", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { data: { foo: "bar" }, type: "data-widget" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "data-widget", "finish"],
      );
      assert.partialDeepStrictEqual(chunks[1], {
        data: { foo: "bar" },
        type: "data-widget",
      });
    });

    test("handles reasoning and text parts together", async () => {
      const userMessage = createUserMessage("Question");

      const transport = new StaticChatTransport({
        autoChunkReasoning: false,
        autoChunkText: false,
        async *mockResponse() {
          yield {
            text: "First I think about this problem carefully step by step",
            type: "reasoning",
          };
          yield { text: "Here is my final answer to you", type: "text" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );
      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      assert.ok(reasoningDeltas.length > 0);
      assert.ok(textDeltas.length > 0);

      const reasoningText = reasoningDeltas.map((chunk) => chunk.delta).join("");
      const textContent = textDeltas.map((chunk) => chunk.delta).join("");

      assert.strictEqual(reasoningText, "First I think about this problem carefully step by step");
      assert.strictEqual(textContent, "Here is my final answer to you");
    });
  });

  // ============================================================================
  // Tool Calls
  // ============================================================================

  describe("Tool Calls", () => {
    test("streams tool-input-available and tool-output-available for tool parts with output", async () => {
      const userMessage = createUserMessage("Search for cats");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { query: "cats" },
            output: { results: [{ title: "All About Cats" }] },
            state: "output-available",
            toolCallId: "call_123",
            type: "tool-search",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "tool-input-available", "tool-output-available", "finish"],
      );

      const inputChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      assert.partialDeepStrictEqual(inputChunk, {
        input: { query: "cats" },
        toolCallId: "call_123",
        toolName: "tool",
        type: "tool-input-available",
      });

      const outputChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-output-available" }> =>
          chunk.type === "tool-output-available",
      );
      assert.partialDeepStrictEqual(outputChunk, {
        output: { results: [{ title: "All About Cats" }] },
        toolCallId: "call_123",
        type: "tool-output-available",
      });
    });

    test("streams tool-input-available and tool-output-error for tool parts with error", async () => {
      const userMessage = createUserMessage("Book a reservation");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            errorText: "Reservation not found",
            input: { reservationId: 123 },
            state: "output-error",
            toolCallId: "call_failure",
            type: "tool-booking",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "tool-input-available", "tool-output-error", "finish"],
      );

      const errorChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-output-error" }> =>
          chunk.type === "tool-output-error",
      );
      assert.partialDeepStrictEqual(errorChunk, {
        errorText: "Reservation not found",
        toolCallId: "call_failure",
        type: "tool-output-error",
      });
    });

    test("handles dynamic-tool type", async () => {
      const userMessage = createUserMessage("Use a tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { action: "perform" },
            output: { result: "success" },
            state: "output-available",
            toolCallId: "call_dynamic",
            type: "dynamic-tool",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "tool-input-available", "tool-output-available", "finish"],
      );

      const inputChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      assert.partialDeepStrictEqual(inputChunk, {
        toolCallId: "call_dynamic",
        toolName: "tool",
      });
    });

    test("handles tool parts without toolName (defaults to 'tool')", async () => {
      const userMessage = createUserMessage("Call a tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { data: "test" },
            state: "input-streaming",
            toolCallId: "call_no_name",
            type: "tool-custom",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const inputChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      assert.partialDeepStrictEqual(inputChunk, {
        input: { data: "test" },
        toolCallId: "call_no_name",
        toolName: "tool",
      });
    });

    test("handles tool parts with explicit toolName", async () => {
      const userMessage = createUserMessage("Use named tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { query: "test" },
            output: { results: [] },
            state: "output-available",
            toolCallId: "call_named",
            toolName: "search-tool",
            type: "tool-search",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const inputChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      assert.partialDeepStrictEqual(inputChunk, {
        input: { query: "test" },
        toolCallId: "call_named",
        toolName: "search-tool",
      });
    });

    test("handles tool parts with only input (no output state)", async () => {
      const userMessage = createUserMessage("Start a tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { task: "do something" },
            state: "input-streaming",
            toolCallId: "call_input_only",
            type: "tool-task",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "tool-input-available", "finish"],
      );
    });

    test("handles multiple tool parts in sequence", async () => {
      const userMessage = createUserMessage("Check multiple sources");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { query: "coffee" },
            output: { results: [] },
            state: "output-available",
            toolCallId: "call_a",
            type: "tool-search",
          };
          yield {
            input: { destination: "B", origin: "A" },
            output: { etaMinutes: 5 },
            state: "output-available",
            toolCallId: "call_b",
            type: "tool-map",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const toolChunks = chunks.filter(
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-available",
      );
      // 2 input + 2 output
      assert.strictEqual(toolChunks.length, 4);

      const firstInput = chunkOfType(toolChunks[0], "tool-input-available");
      assert.strictEqual(firstInput.toolCallId, "call_a");

      const secondInput = chunkOfType(toolChunks[2], "tool-input-available");
      assert.strictEqual(secondInput.toolCallId, "call_b");
    });

    test("handles tool parts mixed with text parts", async () => {
      const userMessage = createUserMessage("Search and explain");

      const transport = new StaticChatTransport({
        autoChunkText: false,
        async *mockResponse() {
          yield { text: "Let me search for that.", type: "text" };
          yield {
            input: { query: "something" },
            output: { results: [] },
            state: "output-available",
            toolCallId: "call_mixed",
            type: "tool-search",
          };
          yield { text: "Here are the results!", type: "text" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        [
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
        ],
      );
    });

    test("handles progressive tool loading with state transitions", async () => {
      const userMessage = createUserMessage("Get weather");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { location: "San Francisco" },
            state: "input-available",
            toolCallId: "call_weather_1",
            toolName: "weather",
            type: "tool-weather",
          };

          await sleep(50);

          yield {
            input: { location: "San Francisco" },
            output: { condition: "sunny", temperature: 72 },
            state: "output-available",
            toolCallId: "call_weather_1",
            toolName: "weather",
            type: "tool-weather",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const toolChunks = chunks.filter(
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-available",
      );

      assert.strictEqual(toolChunks.length, 2);

      const inputChunk = chunkOfType(toolChunks[0], "tool-input-available");
      assert.strictEqual(inputChunk.type, "tool-input-available");
      assert.strictEqual(inputChunk.toolCallId, "call_weather_1");
      assert.strictEqual(inputChunk.toolName, "weather");

      const outputChunk = chunkOfType(toolChunks[1], "tool-output-available");
      assert.strictEqual(outputChunk.type, "tool-output-available");
      assert.strictEqual(outputChunk.toolCallId, "call_weather_1");
      assert.deepEqual(outputChunk.output, {
        condition: "sunny",
        temperature: 72,
      });
    });

    test("does not emit duplicate chunks for unchanged tool state", async () => {
      const userMessage = createUserMessage("Process data");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { data: "test" },
            state: "input-available",
            toolCallId: "call_process_1",
            type: "tool-process",
          };

          yield {
            input: { data: "test" },
            state: "input-available",
            toolCallId: "call_process_1",
            type: "tool-process",
          };

          yield {
            input: { data: "test" },
            output: { result: "processed" },
            state: "output-available",
            toolCallId: "call_process_1",
            type: "tool-process",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const toolChunks = chunks.filter(
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-available",
      );

      assert.strictEqual(toolChunks.length, 2);
      assert.strictEqual(toolChunks[0].type, "tool-input-available");
      assert.strictEqual(toolChunks[1].type, "tool-output-available");
    });

    test("handles tool error state in progressive loading", async () => {
      const userMessage = createUserMessage("Process with error");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { data: "test" },
            state: "input-available",
            toolCallId: "call_error_1",
            type: "tool-process",
          };

          await sleep(10);

          yield {
            errorText: "Processing failed",
            input: { data: "test" },
            state: "output-error",
            toolCallId: "call_error_1",
            type: "tool-process",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const toolChunks = chunks.filter(
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-error",
      );

      assert.strictEqual(toolChunks.length, 2);
      assert.strictEqual(toolChunks[0].type, "tool-input-available");
      assert.strictEqual(toolChunks[1].type, "tool-output-error");

      const errorChunk = chunkOfType(toolChunks[1], "tool-output-error");
      assert.strictEqual(errorChunk.toolCallId, "call_error_1");
      assert.strictEqual(errorChunk.errorText, "Processing failed");
    });
  });

  // ============================================================================
  // Auto-Chunking
  // ============================================================================

  describe("Auto-Chunking", () => {
    test("chunks text word-by-word by default", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { text: "Hello world test", type: "text" };
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

      assert.ok(textDeltaChunks.length > 1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      assert.strictEqual(fullText, "Hello world test");
    });

    test("chunks reasoning word-by-word by default", async () => {
      const userMessage = createUserMessage("Think");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            text: "Let me think about this carefully",
            type: "reasoning",
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
        (chunk): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );

      assert.ok(reasoningDeltaChunks.length > 1);
      const fullText = reasoningDeltaChunks.map((chunk) => chunk.delta).join("");
      assert.strictEqual(fullText, "Let me think about this carefully");
    });

    test("sends text as single chunk when autoChunkText is false", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        autoChunkText: false,
        async *mockResponse() {
          yield { text: "Hello world test", type: "text" };
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

      assert.strictEqual(textDeltaChunks.length, 1);
      assert.strictEqual(textDeltaChunks[0]?.delta, "Hello world test");
    });

    test("sends reasoning as single chunk when autoChunkReasoning is false", async () => {
      const userMessage = createUserMessage("Think");

      const transport = new StaticChatTransport({
        autoChunkReasoning: false,
        async *mockResponse() {
          yield { text: "Let me think about this", type: "reasoning" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );

      assert.strictEqual(reasoningDeltaChunks.length, 1);
      assert.strictEqual(reasoningDeltaChunks[0]?.delta, "Let me think about this");
    });

    test("uses custom regex pattern for text chunking", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        autoChunkText: /[,.]/gu,
        async *mockResponse() {
          yield { text: "Hello,world.test", type: "text" };
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

      assert.ok(textDeltaChunks.length > 1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      assert.strictEqual(fullText, "Hello,world.test");
    });

    test("uses custom regex pattern for reasoning chunking", async () => {
      const userMessage = createUserMessage("Think");

      const transport = new StaticChatTransport({
        autoChunkReasoning: /\./gu,
        async *mockResponse() {
          yield { text: "Step1.Step2.Step3", type: "reasoning" };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );

      assert.ok(reasoningDeltaChunks.length > 1);
      const fullText = reasoningDeltaChunks.map((chunk) => chunk.delta).join("");
      assert.strictEqual(fullText, "Step1.Step2.Step3");
    });

    test("handles empty text with auto-chunking enabled", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { text: "", type: "text" };
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

      assert.strictEqual(textDeltaChunks.length, 0);
    });
  });

  // ============================================================================
  // Stream Control
  // ============================================================================

  describe("Stream Control", () => {
    test("invokes the chunk delay resolver for every chunk", async () => {
      const userMessage = createUserMessage("Hello");
      const chunkDelay = mock.fn((_chunk: UIMessageChunk): number => 0);

      const transport = new StaticChatTransport({
        chunkDelayMs: chunkDelay,
        async *mockResponse() {
          yield { text: "Hello again!", type: "text" };
        },
      });

      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      assert.ok(chunkDelay.mock.callCount() > 0);
      assert.ok(chunkDelay.mock.calls.length > 0);
    });

    test("supports tuple delay range for random delays", async () => {
      const userMessage = createUserMessage("Hello");
      const transport = new StaticChatTransport({
        chunkDelayMs: [10, 20],
        async *mockResponse() {
          yield { text: "Test", type: "text" };
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

      assert.ok(duration >= 5);
    });

    test("supports function returning tuple for per-chunk random delays", async () => {
      const userMessage = createUserMessage("Hello");
      const transport = new StaticChatTransport({
        chunkDelayMs: (chunk) => {
          if (chunk.type === "text-delta") {
            return [15, 25];
          }
          return 0;
        },
        async *mockResponse() {
          yield { text: "Test", type: "text" };
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

      assert.ok(duration >= 5);
    });

    test("aborts the stream when the abort signal fires", async () => {
      const userMessage = createUserMessage("Hello");
      const transport = new StaticChatTransport({
        chunkDelayMs: () => 50,
        async *mockResponse() {
          yield { text: "Streaming...", type: "text" };
        },
      });

      const abortController = new AbortController();
      const streamPromise = transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: abortController.signal,
      });
      const stream = await streamPromise;
      const reader = readAllChunks(stream);

      abortController.abort();

      await assert.rejects(reader, /aborted/iu);
    });

    test("aborts text streaming halfway through when auto-chunking", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        chunkDelayMs: 50,
        async *mockResponse() {
          yield {
            text: "This is a long message that will be chunked word by word",
            type: "text",
          };
        },
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          chunks.push(value);
          chunkCount += 1;

          if (chunkCount >= maxChunks) {
            abortController.abort();
          }
        }
      } catch (error) {
        assert.notStrictEqual(error, undefined);
      }

      assert.ok(chunks.length > 0);
      assert.ok(chunks.length <= maxChunks + 1);

      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      assert.ok(textDeltas.length > 0);
    });

    test("applies chunk delays to tool chunks", async () => {
      const userMessage = createUserMessage("Delayed tool");

      const delaySpy = mock.fn((_type: UIMessageChunk["type"]): void => {});

      const transport = new StaticChatTransport({
        chunkDelayMs: (chunk) => {
          delaySpy(chunk.type);
          if (chunk.type === "tool-input-available" || chunk.type === "tool-output-available") {
            return 10;
          }
          return 0;
        },
        async *mockResponse() {
          yield {
            input: { test: true },
            state: "input-available",
            toolCallId: "call_delayed",
            type: "tool-test",
          };

          yield {
            input: { test: true },
            output: { result: "done" },
            state: "output-available",
            toolCallId: "call_delayed",
            type: "tool-test",
          };
        },
      });

      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      assert.ok(delaySpy.mock.calls.some((call) => call.arguments[0] === "tool-input-available"));
      assert.ok(delaySpy.mock.calls.some((call) => call.arguments[0] === "tool-output-available"));

      const toolChunks = chunks.filter(
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-available",
      );
      assert.strictEqual(toolChunks.length, 2);
    });
  });

  // ============================================================================
  // Reconnection
  // ============================================================================

  describe("Reconnection", () => {
    test("can replay the last assistant response via reconnectToStream", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { text: "Response", type: "text" };
        },
      });

      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reconnect = await transport.reconnectToStream({ chatId: "chat-1" });
      assert.ok(reconnect);
      const chunks = await readAllChunks(reconnect);
      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "start-step", "text-start", "text-delta", "text-end", "finish-step", "finish"],
      );
    });

    test("replays tool calls via reconnectToStream", async () => {
      const userMessage = createUserMessage("Search");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { query: "test" },
            output: { results: [] },
            state: "output-available",
            toolCallId: "call_reconnect",
            type: "tool-search",
          };
        },
      });

      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reconnect = await transport.reconnectToStream({ chatId: "chat-1" });
      assert.ok(reconnect);
      const chunks = await readAllChunks(reconnect);

      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "tool-input-available", "tool-output-available", "finish"],
      );
    });

    test("replays chunked messages via reconnectToStream", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { text: "Hello world", type: "text" };
        },
      });

      await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reconnect = await transport.reconnectToStream({ chatId: "chat-1" });
      assert.ok(reconnect);

      const chunks = await readAllChunks(reconnect);
      const textDeltaChunks = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      assert.ok(textDeltaChunks.length > 1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      assert.strictEqual(fullText, "Hello world");
    });

    test("clears specific chat cache via clearCache", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { text: "Response", type: "text" };
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
      assert.strictEqual(reconnect1, null);

      // chat-2 should still exist
      const reconnect2 = await transport.reconnectToStream({ chatId: "chat-2" });
      assert.notStrictEqual(reconnect2, null);
    });

    test("clears all caches via clearCache without argument", async () => {
      const userMessage = createUserMessage("Hello");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { text: "Response", type: "text" };
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
      assert.strictEqual(reconnect1, null);

      const reconnect2 = await transport.reconnectToStream({ chatId: "chat-2" });
      assert.strictEqual(reconnect2, null);
    });
  });

  // ============================================================================
  // Integration Tests (useChat-like scenarios)
  // ============================================================================

  describe("Integration Scenarios (useChat-like)", () => {
    test("handles text streaming as useChat would receive it", async () => {
      const transport = new StaticChatTransport({
        chunkDelayMs: 5,
        async *mockResponse() {
          yield { text: "Hello! This is a streaming response.", type: "text" };
        },
      });

      const userMessage = createUserMessage("Hi there");
      const stream = await transport.sendMessages({
        ...createSendContext({ messages: [userMessage] }),
        abortSignal: undefined,
      });

      const chunks = await readAllChunks(stream);
      const fullText = extractTextFromChunks(chunks);
      assert.strictEqual(fullText, "Hello! This is a streaming response.");
    });

    test("handles tool calls as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { query: "test query" },
            output: { results: [{ title: "Result 1" }] },
            state: "output-available",
            toolCallId: "call_123",
            type: "tool-search",
          };
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
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-input-available" }> =>
          chunk.type === "tool-input-available",
      );
      const toolOutputChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-output-available" }> =>
          chunk.type === "tool-output-available",
      );

      assert.notStrictEqual(toolInputChunk, undefined);
      assert.strictEqual(toolInputChunk?.toolCallId, "call_123");
      assert.notStrictEqual(toolOutputChunk, undefined);
      assert.strictEqual(toolOutputChunk?.toolCallId, "call_123");
    });

    test("handles data-* parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            data: { count: 42, status: "active" },
            id: "widget-1",
            type: "data-widget",
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
        (chunk): chunk is UIMessageChunk & { type: "data-widget"; data: unknown } =>
          chunk.type === "data-widget",
      );

      assert.notStrictEqual(dataChunk, undefined);
      assert.deepEqual(dataChunk?.data, { count: 42, status: "active" });
    });

    test("handles source-url parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            sourceId: "src-1",
            title: "Example Article",
            type: "source-url",
            url: "https://example.com/article",
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

      assert.notStrictEqual(sourceChunk, undefined);
      assert.partialDeepStrictEqual(sourceChunk, {
        sourceId: "src-1",
        title: "Example Article",
        type: "source-url",
        url: "https://example.com/article",
      });
    });

    test("handles source-document parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            filename: "document.pdf",
            mediaType: "application/pdf",
            sourceId: "doc-1",
            title: "Important Document",
            type: "source-document",
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
        (chunk): chunk is Extract<UIMessageChunk, { type: "source-document" }> =>
          chunk.type === "source-document",
      );

      assert.notStrictEqual(docChunk, undefined);
      assert.partialDeepStrictEqual(docChunk, {
        filename: "document.pdf",
        mediaType: "application/pdf",
        sourceId: "doc-1",
        title: "Important Document",
        type: "source-document",
      });
    });

    test("handles reasoning parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        autoChunkReasoning: false,
        autoChunkText: false,
        async *mockResponse() {
          yield {
            text: "Let me think about this step by step...",
            type: "reasoning",
          };
          yield {
            text: "Based on my reasoning, here's the answer.",
            type: "text",
          };
        },
      });

      const userMessage = createUserMessage("Think and respond");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const reasoningDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );
      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );

      assert.ok(reasoningDeltas.length > 0);
      assert.ok(textDeltas.length > 0);

      const reasoningText = reasoningDeltas.map((chunk) => chunk.delta).join("");
      const textContent = textDeltas.map((chunk) => chunk.delta).join("");

      assert.strictEqual(reasoningText, "Let me think about this step by step...");
      assert.strictEqual(textContent, "Based on my reasoning, here's the answer.");
    });

    test("handles multiple tool calls in sequence as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        autoChunkText: false,
        async *mockResponse() {
          yield {
            input: { query: "coffee" },
            output: { results: [{ title: "Coffee Shop" }] },
            state: "output-available",
            toolCallId: "call_search",
            type: "tool-search",
          };
          yield {
            input: { destination: "B", origin: "A" },
            output: { etaMinutes: 15 },
            state: "output-available",
            toolCallId: "call_map",
            type: "tool-map",
          };
          yield {
            text: "I found a coffee shop and calculated the route.",
            type: "text",
          };
        },
      });

      const userMessage = createUserMessage("Search and route");
      const chunks = await readAllChunks(
        await transport.sendMessages({
          ...createSendContext({ messages: [userMessage] }),
          abortSignal: undefined,
        }),
      );

      const toolChunks = chunks.filter(
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-available",
      );

      // 2 inputs + 2 outputs
      assert.ok(toolChunks.length >= 4);

      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      assert.ok(textDeltas.length > 0);
      assert.ok(
        extractTextFromChunks(chunks).includes("I found a coffee shop and calculated the route."),
      );
    });

    test("handles tool calls with errors as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            errorText: "Processing failed: Invalid input",
            input: { data: "test" },
            state: "output-error",
            toolCallId: "call_error",
            type: "tool-process",
          };
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
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-output-error" }> =>
          chunk.type === "tool-output-error",
      );

      assert.notStrictEqual(errorChunk, undefined);
      assert.strictEqual(errorChunk?.toolCallId, "call_error");
      assert.strictEqual(errorChunk?.errorText, "Processing failed: Invalid input");
    });

    test("handles progressive tool loading as useChat would process it", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            input: { location: "NYC" },
            state: "input-available",
            toolCallId: "call_weather",
            type: "tool-weather",
          };
          await sleep(10);
          yield {
            input: { location: "NYC" },
            output: { condition: "sunny", temperature: 68 },
            state: "output-available",
            toolCallId: "call_weather",
            type: "tool-weather",
          };
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
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-available",
      );

      assert.strictEqual(toolChunks.length, 2);
      assert.strictEqual(toolChunks[0].type, "tool-input-available");
      assert.strictEqual(toolChunks[1].type, "tool-output-available");

      const outputChunk = chunkOfType(toolChunks[1], "tool-output-available");
      assert.deepEqual(outputChunk.output, {
        condition: "sunny",
        temperature: 68,
      });
    });

    test("handles mixed content (text, tools, data) as useChat would process it", async () => {
      const transport = new StaticChatTransport({
        autoChunkText: false,
        async *mockResponse() {
          yield { text: "Let me search for that.", type: "text" };
          yield {
            input: { query: "something" },
            output: { results: [] },
            state: "output-available",
            toolCallId: "call_mixed",
            type: "tool-search",
          };
          yield {
            data: { status: "completed" },
            id: "status-1",
            type: "data-status",
          };
          yield { text: "Here are the results!", type: "text" };
        },
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
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-available",
      );
      const dataChunk = chunks.find((chunk) => chunk.type === "data-status");

      assert.ok(textDeltas.length >= 2);
      assert.ok(toolChunks.length >= 2);
      assert.notStrictEqual(dataChunk, undefined);
    });

    test("handles file parts as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            mediaType: "image/png",
            type: "file",
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
        (chunk): chunk is Extract<UIMessageChunk, { type: "file" }> => chunk.type === "file",
      );

      assert.notStrictEqual(fileChunk, undefined);
      assert.partialDeepStrictEqual(fileChunk, {
        mediaType: "image/png",
        type: "file",
        url: "https://example.com/image.png",
      });
    });

    test("handles streaming text with auto-chunking as useChat would receive it", async () => {
      const transport = new StaticChatTransport({
        chunkDelayMs: 5,
        async *mockResponse() {
          yield {
            text: "This is a streaming message that will be chunked word by word",
            type: "text",
          };
        },
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

      assert.ok(textDeltas.length > 1);
      const fullText = extractTextFromChunks(chunks);
      assert.strictEqual(fullText, "This is a streaming message that will be chunked word by word");
    });

    test("handles aborting mid-stream as useChat.stop() would", async () => {
      const transport = new StaticChatTransport({
        chunkDelayMs: 20,
        async *mockResponse() {
          yield {
            text: "This is a very long message that will be chunked and potentially aborted",
            type: "text",
          };
        },
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          chunks.push(value);
          chunkCount += 1;

          if (chunkCount >= maxChunks) {
            abortController.abort();
          }
        }
      } catch (error) {
        assert.notStrictEqual(error, undefined);
      }

      assert.ok(chunks.length > 0);
      assert.ok(chunks.length <= maxChunks + 2);

      const textDeltas = chunks.filter(
        (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta",
      );
      assert.ok(textDeltas.length > 0);
    });
  });
});
