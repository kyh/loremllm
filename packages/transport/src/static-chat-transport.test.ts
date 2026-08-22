import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import type { UIMessage, UIMessageChunk } from "ai";

import { StaticChatTransport } from "./index";

// ============================================================================
// Test Helpers
// ============================================================================

const createUserMessage = (text: string, id = "user-1"): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});

/** Narrows a chunk to one union member, failing the test when the discriminant differs. */
function chunkOfType<TYPE extends UIMessageChunk["type"]>(
  chunk: UIMessageChunk | undefined,
  type: TYPE,
): Extract<UIMessageChunk, { type: TYPE }> {
  if (chunk?.type !== type) {
    throw new Error(`Expected chunk of type "${type}", got "${chunk?.type}".`);
  }
  // SAFETY: the discriminant was checked just above; TypeScript cannot relate
  // the generic TYPE parameter back to the matching union member on its own.
  return chunk as Extract<UIMessageChunk, { type: TYPE }>;
}

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
    test("streams the assistant message as UI message chunks", async () => {
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
      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "start-step", "text-start", "text-delta", "text-end", "finish-step", "finish"],
      );
      assert.partialDeepStrictEqual(chunks.filter((chunk) => chunk.type === "text-delta")[0], {
        delta: "Hi there!",
      });
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
        /at least one part/i,
      );
    });

    test("yields multiple parts in sequence", async () => {
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
      assert.strictEqual(textChunks.length, 2);
      assert.strictEqual(textChunks[0]?.delta, "Response one");
      assert.strictEqual(textChunks[1]?.delta, "Response two");
    });

    test("regenerates an existing assistant message by id", async () => {
      const userMessage = createUserMessage("Hello");
      const previousAssistant: UIMessage = {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "Old response" }],
      };

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
          yield { type: "data-widget", data: { foo: "bar" } };
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
        type: "data-widget",
        data: { foo: "bar" },
      });
    });

    test("handles reasoning and text parts together", async () => {
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
            type: "tool-search",
            toolCallId: "call_123",
            state: "output-available",
            input: { query: "cats" },
            output: { results: [{ title: "All About Cats" }] },
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
        type: "tool-input-available",
        toolCallId: "call_123",
        toolName: "tool",
        input: { query: "cats" },
      });

      const outputChunk = chunks.find(
        (chunk): chunk is Extract<UIMessageChunk, { type: "tool-output-available" }> =>
          chunk.type === "tool-output-available",
      );
      assert.partialDeepStrictEqual(outputChunk, {
        type: "tool-output-available",
        toolCallId: "call_123",
        output: { results: [{ title: "All About Cats" }] },
      });
    });

    test("streams tool-input-available and tool-output-error for tool parts with error", async () => {
      const userMessage = createUserMessage("Book a reservation");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-booking",
            toolCallId: "call_failure",
            state: "output-error",
            input: { reservationId: 123 },
            errorText: "Reservation not found",
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
        type: "tool-output-error",
        toolCallId: "call_failure",
        errorText: "Reservation not found",
      });
    });

    test("handles dynamic-tool type", async () => {
      const userMessage = createUserMessage("Use a tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "dynamic-tool",
            toolCallId: "call_dynamic",
            state: "output-available",
            input: { action: "perform" },
            output: { result: "success" },
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
            type: "tool-custom",
            toolCallId: "call_no_name",
            state: "input-streaming",
            input: { data: "test" },
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
        toolCallId: "call_no_name",
        toolName: "tool",
        input: { data: "test" },
      });
    });

    test("handles tool parts with explicit toolName", async () => {
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
        toolCallId: "call_named",
        toolName: "search-tool",
        input: { query: "test" },
      });
    });

    test("handles tool parts with only input (no output state)", async () => {
      const userMessage = createUserMessage("Start a tool");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-task",
            toolCallId: "call_input_only",
            state: "input-streaming",
            input: { task: "do something" },
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
            type: "tool-search",
            toolCallId: "call_a",
            state: "output-available",
            input: { query: "coffee" },
            output: { results: [] },
          };
          yield {
            type: "tool-map",
            toolCallId: "call_b",
            state: "output-available",
            input: { origin: "A", destination: "B" },
            output: { etaMinutes: 5 },
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
      assert.strictEqual(toolChunks.length, 4); // 2 input + 2 output

      const firstInput = chunkOfType(toolChunks[0], "tool-input-available");
      assert.strictEqual(firstInput.toolCallId, "call_a");

      const secondInput = chunkOfType(toolChunks[2], "tool-input-available");
      assert.strictEqual(secondInput.toolCallId, "call_b");
    });

    test("handles tool parts mixed with text parts", async () => {
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
          };
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
            type: "tool-weather",
            toolCallId: "call_weather_1",
            toolName: "weather",
            state: "input-available",
            input: { location: "San Francisco" },
          };

          await new Promise((resolve) => setTimeout(resolve, 50));

          yield {
            type: "tool-weather",
            toolCallId: "call_weather_1",
            toolName: "weather",
            state: "output-available",
            input: { location: "San Francisco" },
            output: { temperature: 72, condition: "sunny" },
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
        temperature: 72,
        condition: "sunny",
      });
    });

    test("does not emit duplicate chunks for unchanged tool state", async () => {
      const userMessage = createUserMessage("Process data");

      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-process",
            toolCallId: "call_process_1",
            state: "input-available",
            input: { data: "test" },
          };

          yield {
            type: "tool-process",
            toolCallId: "call_process_1",
            state: "input-available",
            input: { data: "test" },
          };

          yield {
            type: "tool-process",
            toolCallId: "call_process_1",
            state: "output-available",
            input: { data: "test" },
            output: { result: "processed" },
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
            type: "tool-process",
            toolCallId: "call_error_1",
            state: "input-available",
            input: { data: "test" },
          };

          await new Promise((resolve) => setTimeout(resolve, 10));

          yield {
            type: "tool-process",
            toolCallId: "call_error_1",
            state: "output-error",
            input: { data: "test" },
            errorText: "Processing failed",
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

      assert.ok(textDeltaChunks.length > 1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      assert.strictEqual(fullText, "Hello world test");
    });

    test("chunks reasoning word-by-word by default", async () => {
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

      assert.strictEqual(textDeltaChunks.length, 1);
      assert.strictEqual(textDeltaChunks[0]?.delta, "Hello world test");
    });

    test("sends reasoning as single chunk when autoChunkReasoning is false", async () => {
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
        (chunk): chunk is Extract<UIMessageChunk, { type: "reasoning-delta" }> =>
          chunk.type === "reasoning-delta",
      );

      assert.strictEqual(reasoningDeltaChunks.length, 1);
      assert.strictEqual(reasoningDeltaChunks[0]?.delta, "Let me think about this");
    });

    test("uses custom regex pattern for text chunking", async () => {
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

      assert.ok(textDeltaChunks.length > 1);
      const fullText = textDeltaChunks.map((chunk) => chunk.delta).join("");
      assert.strictEqual(fullText, "Hello,world.test");
    });

    test("uses custom regex pattern for reasoning chunking", async () => {
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

      assert.ok(chunkDelay.mock.callCount() > 0);
      assert.ok(chunkDelay.mock.calls.length > 0);
    });

    test("supports tuple delay range for random delays", async () => {
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

      assert.ok(duration >= 5);
    });

    test("supports function returning tuple for per-chunk random delays", async () => {
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

      assert.ok(duration >= 5);
    });

    test("aborts the stream when the abort signal fires", async () => {
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

      await assert.rejects(reader, /aborted/i);
    });

    test("aborts text streaming halfway through when auto-chunking", async () => {
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
            type: "tool-test",
            toolCallId: "call_delayed",
            state: "input-available",
            input: { test: true },
          };

          yield {
            type: "tool-test",
            toolCallId: "call_delayed",
            state: "output-available",
            input: { test: true },
            output: { result: "done" },
          };
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
      assert.notStrictEqual(reconnect, null);
      const chunks = await readAllChunks(reconnect!);
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
            type: "tool-search",
            toolCallId: "call_reconnect",
            state: "output-available",
            input: { query: "test" },
            output: { results: [] },
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
      assert.notStrictEqual(reconnect, null);
      const chunks = await readAllChunks(reconnect!);

      assert.deepEqual(
        chunks.map((chunk) => chunk.type),
        ["start", "tool-input-available", "tool-output-available", "finish"],
      );
    });

    test("replays chunked messages via reconnectToStream", async () => {
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
      assert.notStrictEqual(reconnect, null);

      const chunks = await readAllChunks(reconnect!);
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
      assert.strictEqual(reconnect1, null);

      // chat-2 should still exist
      const reconnect2 = await transport.reconnectToStream({ chatId: "chat-2" });
      assert.notStrictEqual(reconnect2, null);
    });

    test("clears all caches via clearCache without argument", async () => {
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
      assert.strictEqual(fullText, "Hello! This is a streaming response.");
    });

    test("handles tool calls as useChat would process them", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_123",
            state: "output-available",
            input: { query: "test query" },
            output: { results: [{ title: "Result 1" }] },
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

      assert.notStrictEqual(sourceChunk, undefined);
      assert.partialDeepStrictEqual(sourceChunk, {
        type: "source-url",
        sourceId: "src-1",
        url: "https://example.com/article",
        title: "Example Article",
      });
    });

    test("handles source-document parts as useChat would process them", async () => {
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
        (chunk): chunk is Extract<UIMessageChunk, { type: "source-document" }> =>
          chunk.type === "source-document",
      );

      assert.notStrictEqual(docChunk, undefined);
      assert.partialDeepStrictEqual(docChunk, {
        type: "source-document",
        sourceId: "doc-1",
        mediaType: "application/pdf",
        title: "Important Document",
        filename: "document.pdf",
      });
    });

    test("handles reasoning parts as useChat would process them", async () => {
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
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_search",
            state: "output-available",
            input: { query: "coffee" },
            output: { results: [{ title: "Coffee Shop" }] },
          };
          yield {
            type: "tool-map",
            toolCallId: "call_map",
            state: "output-available",
            input: { origin: "A", destination: "B" },
            output: { etaMinutes: 15 },
          };
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
        (chunk) => chunk.type === "tool-input-available" || chunk.type === "tool-output-available",
      );

      assert.ok(toolChunks.length >= 4); // 2 inputs + 2 outputs

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
            type: "tool-process",
            toolCallId: "call_error",
            state: "output-error",
            input: { data: "test" },
            errorText: "Processing failed: Invalid input",
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
            type: "tool-weather",
            toolCallId: "call_weather",
            state: "input-available",
            input: { location: "NYC" },
          };
          await new Promise((resolve) => setTimeout(resolve, 10));
          yield {
            type: "tool-weather",
            toolCallId: "call_weather",
            state: "output-available",
            input: { location: "NYC" },
            output: { temperature: 68, condition: "sunny" },
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
        temperature: 68,
        condition: "sunny",
      });
    });

    test("handles mixed content (text, tools, data) as useChat would process it", async () => {
      const transport = new StaticChatTransport({
        async *mockResponse() {
          yield { type: "text", text: "Let me search for that." };
          yield {
            type: "tool-search",
            toolCallId: "call_mixed",
            state: "output-available",
            input: { query: "something" },
            output: { results: [] },
          };
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
        (chunk): chunk is Extract<UIMessageChunk, { type: "file" }> => chunk.type === "file",
      );

      assert.notStrictEqual(fileChunk, undefined);
      assert.partialDeepStrictEqual(fileChunk, {
        type: "file",
        mediaType: "image/png",
        url: "https://example.com/image.png",
      });
    });

    test("handles streaming text with auto-chunking as useChat would receive it", async () => {
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

      assert.ok(textDeltas.length > 1);
      const fullText = extractTextFromChunks(chunks);
      assert.strictEqual(fullText, "This is a streaming message that will be chunked word by word");
    });

    test("handles aborting mid-stream as useChat.stop() would", async () => {
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
