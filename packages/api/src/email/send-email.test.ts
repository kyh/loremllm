import assert from "node:assert/strict";
import { describe, test } from "node:test";

describe("sendEmail without RESEND_API_KEY", () => {
  test("logs the email instead of calling Resend", async (t) => {
    delete process.env.RESEND_API_KEY;
    // Imported after the delete: env.ts parses process.env at module load.
    const { sendEmail } = await import("./send-email");
    const fetchMock = t.mock.method(globalThis, "fetch");
    const infoMock = t.mock.method(console, "info", () => {});

    await sendEmail({
      subject: "Reset your password",
      text: "https://www.loremllm.com/auth/password-update?token=abc",
      to: "dev@loremllm.local",
    });

    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal(infoMock.mock.callCount(), 1);
    const logged = String(infoMock.mock.calls[0]?.arguments[0]);
    assert.ok(logged.includes("dev@loremllm.local"));
    assert.ok(logged.includes("token=abc"));
  });
});
