import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";
import type { UIMessage } from "ai";

import { copyMessagesToClipboard } from "./copy-messages-to-clipboard";

const assistantMessage: UIMessage = {
  id: "assistant-1",
  parts: [{ text: "Response", type: "text" }],
  role: "assistant",
};

afterEach(() => {
  mock.restoreAll();
});

describe("copyMessagesToClipboard outside a browser", () => {
  test("reports and exits when no assistant messages are present", () => {
    const info = mock.method(console, "info");

    copyMessagesToClipboard({
      messages: [
        { id: "user-1", parts: [{ text: "Only user input", type: "text" }], role: "user" },
      ],
    });

    assert.deepEqual(
      info.mock.calls.map((call) => call.arguments),
      [["No assistant messages were found to copy."]],
    );
  });

  test("throws when clipboard access is unavailable", () => {
    const info = mock.method(console, "info");

    assert.equal(globalThis.navigator?.clipboard, undefined);
    assert.throws(
      () => {
        copyMessagesToClipboard({ messages: [assistantMessage] });
      },
      { message: "Clipboard access is not available in this environment." },
    );
    assert.deepEqual(
      info.mock.calls.map((call) => call.arguments),
      [["Clipboard access is not available in this environment."]],
    );
  });
});
