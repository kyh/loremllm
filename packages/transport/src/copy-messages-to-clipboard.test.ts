import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { copyMessagesToClipboard } from "./copy-messages-to-clipboard";

type MessagePart = UIMessage["parts"][number];
type NavigatorWithClipboard = {
  clipboard?: {
    writeText?: (value: string) => Promise<void> | void;
  };
};

const globalScope = globalThis as typeof globalThis & {
  navigator?: NavigatorWithClipboard;
  alert?: (message?: string) => unknown;
};

const navigatorDescriptor = Object.getOwnPropertyDescriptor(
  globalScope,
  "navigator",
);
const originalAlert = globalScope.alert;
const hadAlert = Object.prototype.hasOwnProperty.call(globalScope, "alert");

let alertSpy: ReturnType<typeof vi.fn<(message?: string) => unknown>>;
let messageId = 0;

const createMessage = (
  role: UIMessage["role"],
  parts: MessagePart[],
): UIMessage =>
  ({
    id: `${role}-${++messageId}`,
    role,
    parts,
  }) as UIMessage;

const setNavigator = (value: NavigatorWithClipboard | undefined): void => {
  Object.defineProperty(globalScope, "navigator", {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
};

beforeEach(() => {
  messageId = 0;
  alertSpy = vi.fn();
  globalScope.alert = alertSpy;
  setNavigator(undefined);
});

afterEach(() => {
  if (navigatorDescriptor) {
    Object.defineProperty(globalScope, "navigator", navigatorDescriptor);
  } else {
    (globalScope as { navigator?: NavigatorWithClipboard }).navigator =
      undefined;
  }

  if (hadAlert) {
    globalScope.alert = originalAlert;
  } else {
    (globalScope as { alert?: (message?: string) => unknown }).alert =
      undefined;
  }

  vi.restoreAllMocks();
});

describe("copyMessagesToClipboard", () => {
  it("copies assistant messages to the clipboard and alerts success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({
      clipboard: { writeText },
    });

    const messages: UIMessage[] = [
      createMessage("user", [{ type: "text", text: "Hello!" }]),
      createMessage("assistant", [{ type: "text", text: "Hi there" }]),
      createMessage("assistant", [
        { type: "text", text: "What else can I help with?" },
      ]),
    ];

    copyMessagesToClipboard({ messages });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writeText).toHaveBeenCalledTimes(1);
    const [template] = writeText.mock.calls[0] ?? [];
    expect(typeof template).toBe("string");
    expect(template).toContain(
      'import { StaticChatTransport } from "@loremllm/transport";',
    );
    expect(template).toContain("chunkDelayMs: [50, 100],");
    expect(template).toContain("async *mockResponse() {");
    expect(template).toContain('"text": "Hi there"');
    expect(template).toContain('"text": "What else can I help with?"');
    expect(template.trim().endsWith("});")).toBe(true);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      "Static transport template copied to your clipboard.",
    );
  });

  it("alerts and exits when no assistant messages are present", () => {
    const writeText = vi.fn();
    setNavigator({
      clipboard: { writeText },
    });

    copyMessagesToClipboard({
      messages: [
        createMessage("user", [{ type: "text", text: "Only user input" }]),
      ],
    });

    expect(writeText).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      "No assistant messages were found to copy.",
    );
  });

  it("throws when clipboard access is unavailable", () => {
    setNavigator({});

    expect(() => {
      copyMessagesToClipboard({
        messages: [
          createMessage("assistant", [{ type: "text", text: "Response" }]),
        ],
      });
    }).toThrow("Clipboard access is not available in this environment.");

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      "Clipboard access is not available in this environment.",
    );
  });

  it("propagates clipboard errors and alerts the failure", async () => {
    const writeTextError = new Error("Permission denied");
    const writeText = vi.fn().mockRejectedValue(writeTextError);
    setNavigator({
      clipboard: { writeText },
    });

    copyMessagesToClipboard({
      messages: [
        createMessage("assistant", [{ type: "text", text: "Response" }]),
      ],
    });

    // Wait for the promise to reject and error handling to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      "Failed to copy the static transport template.\n\nPermission denied",
    );
  });

  it("includes tool parts in the copied template", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({
      clipboard: { writeText },
    });

    const toolCallId = "call_123";
    const messages: UIMessage[] = [
      createMessage("assistant", [
        {
          type: "tool-weather",
          toolCallId,
          toolName: "weather",
          state: "input-available",
          input: { location: "San Francisco" },
        } as MessagePart,
        {
          type: "text",
          text: "The weather is sunny.",
        },
      ]),
    ];

    copyMessagesToClipboard({ messages });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writeText).toHaveBeenCalledTimes(1);
    const [template] = writeText.mock.calls[0] ?? [];
    expect(typeof template).toBe("string");
    expect(template).toContain(
      'import { StaticChatTransport } from "@loremllm/transport";',
    );
    expect(template).toContain("chunkDelayMs: [50, 100],");
    expect(template).toContain('"type": "tool-weather"');
    expect(template).toContain(`"toolCallId": "${toolCallId}"`);
    expect(template).toContain('"toolName": "weather"');
    expect(template).toContain('"state": "input-available"');
    expect(template).toContain('"input"');
    expect(template).toContain('"text": "The weather is sunny."');
  });

  it("reconstructs input-available parts from output-available parts", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({
      clipboard: { writeText },
    });

    const toolCallId = "call_456";
    const messages: UIMessage[] = [
      createMessage("assistant", [
        {
          type: "tool-weather",
          toolCallId,
          toolName: "weather",
          state: "output-available",
          input: { location: "New York" },
          output: { temperature: 75, condition: "sunny" },
        } as MessagePart,
      ]),
    ];

    copyMessagesToClipboard({ messages });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writeText).toHaveBeenCalledTimes(1);
    const [template] = writeText.mock.calls[0] ?? [];
    expect(typeof template).toBe("string");

    // Should contain both input-available and output-available parts
    const inputAvailableIndex = template.indexOf('"state": "input-available"');
    const outputAvailableIndex = template.indexOf(
      '"state": "output-available"',
    );

    expect(inputAvailableIndex).toBeGreaterThan(-1);
    expect(outputAvailableIndex).toBeGreaterThan(-1);
    // input-available should come before output-available
    expect(inputAvailableIndex).toBeLessThan(outputAvailableIndex);
    expect(template).toContain(`"toolCallId": "${toolCallId}"`);
    expect(template).toContain('"input"');
    expect(template).toContain('"output"');
  });
});
