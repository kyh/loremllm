import { describe, expect, it } from "vitest";

import {
  createStreamChunks,
  parseMarkdownIntoChunks,
  type MarkdownChunk,
  type ToolCallChunk,
} from "./utils";

describe("parseMarkdownIntoChunks", () => {
  it("preserves whitespace tokens for plain text", () => {
    const result = parseMarkdownIntoChunks("Hello world");

    expect(result).toEqual([
      { type: "text", value: "Hello" },
      { type: "text", value: " " },
      { type: "text", value: "world" },
    ]);
  });

  it("extracts tool call definitions from markdown callouts", () => {
    const markdown = `Before\n> [!tool search call_1]\n> state: output-available\n> input:\n>   query: cats\n> output:\n>   results: []\nAfter`;

    const result = parseMarkdownIntoChunks(markdown);
    const toolChunk = result.find(
      (chunk): chunk is ToolCallChunk => chunk.type === "tool",
    );

    expect(toolChunk).toBeDefined();
    expect(toolChunk).toMatchObject({
      toolCallId: "call_1",
      toolName: "search",
      input: { query: "cats" },
      output: { results: [] },
    });

    const textValues = result
      .filter((chunk) => chunk.type === "text")
      .map((chunk) => chunk.value)
      .join("");

    expect(textValues).toContain("Before");
    expect(textValues).toContain("After");
  });

  it("supports header assignments", () => {
    const markdown = `> [!tool name=weather id=call_99]\n> input:\n>   location: Paris`;

    const [toolChunk] = parseMarkdownIntoChunks(markdown);

    expect(toolChunk).toMatchObject({
      type: "tool",
      toolCallId: "call_99",
      toolName: "weather",
      input: { location: "Paris" },
    });
  });
});

describe("createStreamChunks", () => {
  it("includes tool invocation events for tool chunks", () => {
    const chunks: MarkdownChunk[] = [
      { type: "text", value: "Hello" },
      {
        type: "tool",
        toolCallId: "call_1",
        toolName: "search",
        input: { query: "cats" },
        output: { results: [] },
      },
      { type: "text", value: "!" },
    ];

    const streamChunks = createStreamChunks(chunks, "who", "output");
    const toolEvents = streamChunks.filter((event) =>
      String(event.type).startsWith("tool-"),
    );

    expect(toolEvents).toHaveLength(2);
    expect(toolEvents[0]).toMatchObject({
      type: "tool-input-available",
      toolCallId: "call_1",
      toolName: "search",
      input: { query: "cats" },
    });
    expect(toolEvents[1]).toMatchObject({
      type: "tool-output-available",
      toolCallId: "call_1",
      output: { results: [] },
    });
  });
});
