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

  it("extracts tool call definitions from tool fences", () => {
    const markdown = `Before\n\n\`\`\`tool search call_1\nstate: output-available\ninput:\n  query: cats\noutput:\n  results: []\n\`\`\`\n\nAfter`;

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
    const markdown = `\`\`\`tool name=weather id=call_99\ninput:\n  location: Paris\n\`\`\``;

    const [toolChunk] = parseMarkdownIntoChunks(markdown);

    expect(toolChunk).toMatchObject({
      type: "tool",
      toolCallId: "call_99",
      toolName: "weather",
      input: { location: "Paris" },
    });
  });

  it("parses multiple fences in order", () => {
    const markdown = [
      "```tool search call_a",
      "input:",
      "  query: cats",
      "```",
      "",
      "```tool map-directions call_b",
      "input:",
      "  destination: museum",
      "```",
    ].join("\n");

    const toolChunks = parseMarkdownIntoChunks(markdown).filter(
      (chunk): chunk is ToolCallChunk => chunk.type === "tool",
    );

    expect(toolChunks).toHaveLength(2);
    expect(toolChunks[0]).toMatchObject({ toolCallId: "call_a", toolName: "search" });
    expect(toolChunks[1]).toMatchObject({
      toolCallId: "call_b",
      toolName: "map-directions",
      input: { destination: "museum" },
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
