/**
 * Integration tests simulating @ai-sdk/react's useChat behavior
 * These tests demonstrate real-world usage patterns by testing the transport
 * the same way that Chat/useChat would use it internally
 */

import type { UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it } from "vitest";
import { createStaticChatTransport } from "./index";

// Helper to simulate how useChat processes the stream
async function processStream(
  stream: ReadableStream<UIMessageChunk>,
): Promise<UIMessageChunk[]> {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return chunks;
}

describe("StaticChatTransport integration (useChat-like usage)", () => {
  it("streams chunked text word-by-word as useChat would receive it", async () => {
    const transport = createStaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Hello world from integration test" };
      },
      chunkDelayMs: 5,
    });

    // Simulate how Chat.sendMessage calls transport.sendMessages
    const userMessage: UIMessage = {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "Test" }],
    } as UIMessage;

    const abortController = new AbortController();
    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "chat-1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: abortController.signal,
      headers: undefined,
      body: undefined,
      metadata: undefined,
    });

    const chunks = await processStream(stream);

    // Verify we got chunked text deltas (as useChat would receive)
    const textDeltas = chunks.filter(
      (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
        chunk.type === "text-delta",
    );

    expect(textDeltas.length).toBeGreaterThan(1);
    const fullText = textDeltas.map((chunk) => chunk.delta).join("");
    expect(fullText).toBe("Hello world from integration test");
  });

  it("handles aborting mid-stream as useChat.stop() would", async () => {
    const transport = createStaticChatTransport({
      async *mockResponse() {
        yield {
          type: "text",
          text: "This is a very long message that will be chunked word by word during streaming",
        };
      },
      chunkDelayMs: 20,
    });

    const userMessage: UIMessage = {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "Test" }],
    } as UIMessage;

    const abortController = new AbortController();
    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "chat-1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: abortController.signal,
      headers: undefined,
      body: undefined,
      metadata: undefined,
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

        // Simulate calling useChat.stop() after a few chunks
        if (chunkCount >= maxChunks) {
          abortController.abort();
          // Give abort a moment to propagate
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } catch (error) {
      // Expected error on abort (as useChat would handle)
      expect(error).toBeDefined();
    } finally {
      reader.releaseLock();
    }

    // Should have received some chunks before abort (partial message state)
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThanOrEqual(maxChunks + 2);

    const textDeltas = chunks.filter(
      (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
        chunk.type === "text-delta",
    );
    expect(textDeltas.length).toBeGreaterThan(0);
  });

  it("works with autoChunkText disabled as useChat would receive", async () => {
    const transport = createStaticChatTransport({
      async *mockResponse() {
        yield { type: "text", text: "Complete message without chunking" };
      },
      autoChunkText: false,
      chunkDelayMs: 5,
    });

    const userMessage: UIMessage = {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "Test" }],
    } as UIMessage;

    const abortController = new AbortController();
    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "chat-1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: abortController.signal,
      headers: undefined,
      body: undefined,
      metadata: undefined,
    });

    const chunks = await processStream(stream);

    const textDeltas = chunks.filter(
      (chunk): chunk is Extract<UIMessageChunk, { type: "text-delta" }> =>
        chunk.type === "text-delta",
    );

    // Should be a single chunk (as useChat would receive)
    expect(textDeltas).toHaveLength(1);
    expect(textDeltas[0]?.delta).toBe("Complete message without chunking");
  });

  it("handles reasoning and text chunks together as useChat processes them", async () => {
    const transport = createStaticChatTransport({
      async *mockResponse() {
        yield {
          type: "reasoning",
          text: "First I think about this problem carefully step by step",
        };
        yield { type: "text", text: "Here is my final answer to you" };
      },
      chunkDelayMs: 5,
    });

    const userMessage: UIMessage = {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "Question" }],
    } as UIMessage;

    const abortController = new AbortController();
    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "chat-1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: abortController.signal,
      headers: undefined,
      body: undefined,
      metadata: undefined,
    });

    const chunks = await processStream(stream);

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

