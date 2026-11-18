import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { UIMessage } from "ai";

import type { ToolPart } from "./index";
import { buildStaticTransportTemplate } from "./static-transport-template";

const assistantWith = (parts: (UIMessage["parts"][number] | ToolPart)[]) =>
  ({
    id: "assistant-1",
    parts,
    role: "assistant",
  }) satisfies UIMessage;

describe("buildStaticTransportTemplate", () => {
  test("yields every assistant part from a StaticChatTransport", () => {
    const messages: UIMessage[] = [
      { id: "assistant-1", parts: [{ text: "Hi there", type: "text" }], role: "assistant" },
      {
        id: "assistant-2",
        parts: [{ text: "What else can I help with?", type: "text" }],
        role: "assistant",
      },
    ];

    const template = buildStaticTransportTemplate(messages);

    assert.ok(template.includes('import { StaticChatTransport } from "@loremllm/transport";'));
    assert.ok(template.includes("chunkDelayMs: [50, 100],"));
    assert.ok(template.includes("async *mockResponse() {"));
    assert.ok(template.includes('"text": "Hi there"'));
    assert.ok(template.includes('"text": "What else can I help with?"'));
    assert.strictEqual(template.trim().endsWith("});"), true);
  });

  test("includes tool parts", () => {
    const toolCallId = "call_123";

    const messages: UIMessage[] = [
      assistantWith([
        {
          input: { location: "San Francisco" },
          state: "input-available",
          toolCallId,
          toolName: "weather",
          type: "tool-weather",
        },
        { text: "The weather is sunny.", type: "text" },
      ]),
    ];

    const template = buildStaticTransportTemplate(messages);

    assert.ok(template.includes('"type": "tool-weather"'));
    assert.ok(template.includes(`"toolCallId": "${toolCallId}"`));
    assert.ok(template.includes('"toolName": "weather"'));
    assert.ok(template.includes('"state": "input-available"'));
    assert.ok(template.includes('"input"'));
    assert.ok(template.includes('"text": "The weather is sunny."'));
  });

  test("reconstructs an input-available part before an output-available one", () => {
    const toolCallId = "call_456";

    const messages: UIMessage[] = [
      assistantWith([
        {
          input: { location: "New York" },
          output: { condition: "sunny", temperature: 75 },
          state: "output-available",
          toolCallId,
          toolName: "weather",
          type: "tool-weather",
        },
      ]),
    ];

    const template = buildStaticTransportTemplate(messages);
    const inputAvailableIndex = template.indexOf('"state": "input-available"');
    const outputAvailableIndex = template.indexOf('"state": "output-available"');

    assert.ok(inputAvailableIndex !== -1);
    assert.ok(outputAvailableIndex !== -1);
    assert.ok(inputAvailableIndex < outputAvailableIndex);
    assert.ok(template.includes(`"toolCallId": "${toolCallId}"`));
    assert.ok(template.includes('"input"'));
    assert.ok(template.includes('"output"'));
  });
});
