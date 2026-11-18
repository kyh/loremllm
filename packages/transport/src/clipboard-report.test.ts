import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";

import { COPY_SUCCESS_MESSAGE, reportClipboardWrite } from "./clipboard-report";

describe("reportClipboardWrite", () => {
  test("reports success once the write settles", async () => {
    const notify = mock.fn<(message: string) => void>();

    await reportClipboardWrite(Promise.resolve(), notify);

    assert.deepEqual(
      notify.mock.calls.map((call) => call.arguments),
      [[COPY_SUCCESS_MESSAGE]],
    );
  });

  test("reports a rejected write with its reason", async () => {
    const notify = mock.fn<(message: string) => void>();

    await reportClipboardWrite(Promise.reject(new Error("Permission denied")), notify);

    assert.deepEqual(
      notify.mock.calls.map((call) => call.arguments),
      [["Failed to copy the static transport template.\n\nPermission denied"]],
    );
  });

  test("explains a denied clipboard permission", async () => {
    const notify = mock.fn<(message: string) => void>();
    const denied = new Error("denied");
    denied.name = "NotAllowedError";

    await reportClipboardWrite(Promise.reject(denied), notify);

    assert.deepEqual(
      notify.mock.calls.map((call) => call.arguments),
      [
        [
          "Failed to copy the static transport template.\n\nClipboard access denied. Please grant clipboard permissions.",
        ],
      ],
    );
  });
});
