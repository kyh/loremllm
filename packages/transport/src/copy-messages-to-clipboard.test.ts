import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import type { UIMessage } from "ai";
import { z } from "zod";

import { copyMessagesToClipboard } from "./copy-messages-to-clipboard";
import type { ToolPart } from "./index";

type MessagePart = UIMessage["parts"][number];
interface NavigatorWithClipboard {
  clipboard?: {
    writeText?: (value: string) => Promise<void> | void;
  };
}

// SAFETY: only loosens globalThis — navigator and alert become optional and
// writable so the tests can install and remove fakes.
const globalScope = globalThis as typeof globalThis & {
  navigator?: NavigatorWithClipboard;
  alert?: (message?: string) => void;
};

const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalScope, "navigator");
const originalAlert = globalScope.alert;
const hadAlert = Object.hasOwn(globalScope, "alert");

const alertSpy = mock.fn((_message?: string): void => {});
let messageId = 0;

const createMessage = (role: UIMessage["role"], parts: (MessagePart | ToolPart)[]): UIMessage => ({
  id: `${role}-${(messageId += 1)}`,
  parts,
  role,
});

const setNavigator = (value: NavigatorWithClipboard | undefined): void => {
  Object.defineProperty(globalScope, "navigator", {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
};

beforeEach(() => {
  messageId = 0;
  alertSpy.mock.resetCalls();
  globalScope.alert = alertSpy;
  setNavigator(undefined);
});

afterEach(() => {
  if (navigatorDescriptor) {
    Object.defineProperty(globalScope, "navigator", navigatorDescriptor);
  } else {
    globalScope.navigator = undefined;
  }

  globalScope.alert = hadAlert ? originalAlert : undefined;

  mock.restoreAll();
});

describe("copyMessagesToClipboard", () => {
  test("copies assistant messages to the clipboard and alerts success", async () => {
    const writeText = mock.fn((_value: string): Promise<void> => Promise.resolve());
    setNavigator({
      clipboard: { writeText },
    });

    const messages: UIMessage[] = [
      createMessage("user", [{ text: "Hello!", type: "text" }]),
      createMessage("assistant", [{ text: "Hi there", type: "text" }]),
      createMessage("assistant", [{ text: "What else can I help with?", type: "text" }]),
    ];

    copyMessagesToClipboard({ messages });
    await sleep(0);

    assert.strictEqual(writeText.mock.callCount(), 1);
    const template = z.string().parse(writeText.mock.calls[0]?.arguments[0]);
    assert.ok(template.includes('import { StaticChatTransport } from "@loremllm/transport";'));
    assert.ok(template.includes("chunkDelayMs: [50, 100],"));
    assert.ok(template.includes("async *mockResponse() {"));
    assert.ok(template.includes('"text": "Hi there"'));
    assert.ok(template.includes('"text": "What else can I help with?"'));
    assert.strictEqual(template.trim().endsWith("});"), true);

    assert.strictEqual(alertSpy.mock.callCount(), 1);
    assert.deepEqual(alertSpy.mock.calls[0]?.arguments, [
      "Static transport template copied to your clipboard.",
    ]);
  });

  test("alerts and exits when no assistant messages are present", () => {
    const writeText = mock.fn((_value: string): void => {});
    setNavigator({
      clipboard: { writeText },
    });

    copyMessagesToClipboard({
      messages: [createMessage("user", [{ text: "Only user input", type: "text" }])],
    });

    assert.strictEqual(writeText.mock.callCount(), 0);
    assert.strictEqual(alertSpy.mock.callCount(), 1);
    assert.deepEqual(alertSpy.mock.calls[0]?.arguments, [
      "No assistant messages were found to copy.",
    ]);
  });

  test("throws when clipboard access is unavailable", () => {
    setNavigator({});

    assert.throws(
      () => {
        copyMessagesToClipboard({
          messages: [createMessage("assistant", [{ text: "Response", type: "text" }])],
        });
      },
      { message: "Clipboard access is not available in this environment." },
    );

    assert.strictEqual(alertSpy.mock.callCount(), 1);
    assert.deepEqual(alertSpy.mock.calls[0]?.arguments, [
      "Clipboard access is not available in this environment.",
    ]);
  });

  test("propagates clipboard errors and alerts the failure", async () => {
    const writeTextError = new Error("Permission denied");
    const writeText = mock.fn((_value: string): Promise<void> => Promise.reject(writeTextError));
    setNavigator({
      clipboard: { writeText },
    });

    copyMessagesToClipboard({
      messages: [createMessage("assistant", [{ text: "Response", type: "text" }])],
    });

    // Wait for the promise to reject and error handling to complete
    await sleep(50);

    assert.strictEqual(writeText.mock.callCount(), 1);
    assert.strictEqual(alertSpy.mock.callCount(), 1);
    assert.deepEqual(alertSpy.mock.calls[0]?.arguments, [
      "Failed to copy the static transport template.\n\nPermission denied",
    ]);
  });

  test("includes tool parts in the copied template", async () => {
    const writeText = mock.fn((_value: string): Promise<void> => Promise.resolve());
    setNavigator({
      clipboard: { writeText },
    });

    const toolCallId = "call_123";
    const messages: UIMessage[] = [
      createMessage("assistant", [
        {
          input: { location: "San Francisco" },
          state: "input-available",
          toolCallId,
          toolName: "weather",
          type: "tool-weather",
        },
        {
          text: "The weather is sunny.",
          type: "text",
        },
      ]),
    ];

    copyMessagesToClipboard({ messages });
    await sleep(0);

    assert.strictEqual(writeText.mock.callCount(), 1);
    const template = z.string().parse(writeText.mock.calls[0]?.arguments[0]);
    assert.ok(template.includes('import { StaticChatTransport } from "@loremllm/transport";'));
    assert.ok(template.includes("chunkDelayMs: [50, 100],"));
    assert.ok(template.includes('"type": "tool-weather"'));
    assert.ok(template.includes(`"toolCallId": "${toolCallId}"`));
    assert.ok(template.includes('"toolName": "weather"'));
    assert.ok(template.includes('"state": "input-available"'));
    assert.ok(template.includes('"input"'));
    assert.ok(template.includes('"text": "The weather is sunny."'));
  });

  test("reconstructs input-available parts from output-available parts", async () => {
    const writeText = mock.fn((_value: string): Promise<void> => Promise.resolve());
    setNavigator({
      clipboard: { writeText },
    });

    const toolCallId = "call_456";
    const messages: UIMessage[] = [
      createMessage("assistant", [
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

    copyMessagesToClipboard({ messages });
    await sleep(0);

    assert.strictEqual(writeText.mock.callCount(), 1);
    const template = z.string().parse(writeText.mock.calls[0]?.arguments[0]);

    // Should contain both input-available and output-available parts
    const inputAvailableIndex = template.indexOf('"state": "input-available"');
    const outputAvailableIndex = template.indexOf('"state": "output-available"');

    assert.ok(inputAvailableIndex !== -1);
    assert.ok(outputAvailableIndex !== -1);
    // input-available should come before output-available
    assert.ok(inputAvailableIndex < outputAvailableIndex);
    assert.ok(template.includes(`"toolCallId": "${toolCallId}"`));
    assert.ok(template.includes('"input"'));
    assert.ok(template.includes('"output"'));
  });
});
