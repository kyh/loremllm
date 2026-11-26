import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { describe, test } from "node:test";
import { z } from "zod";

import { EMAIL_OFF_WARNING, emailModeOf, sendEmail } from "./send-email";

const FROM = "LoremLLM <hello@loremllm.example>";

const CODE = {
  subject: "Your sign-in code",
  text: "Your sign-in code is 482913. It expires in 5 minutes.",
  to: "dev@loremllm.local",
};

describe("emailModeOf", () => {
  test("sends through Resend once a key is set, in production or not", () => {
    for (const production of [false, true]) {
      assert.deepEqual(emailModeOf({ EMAIL_FROM: FROM, RESEND_API_KEY: "re_test" }, production), {
        apiKey: "re_test",
        endpoint: "https://api.resend.com/emails",
        from: FROM,
        kind: "resend",
      });
    }
  });

  test("logs outside production and sends nothing in it without a key", () => {
    for (const RESEND_API_KEY of [undefined, ""]) {
      assert.deepEqual(emailModeOf({ EMAIL_FROM: FROM, RESEND_API_KEY }, false), { kind: "log" });
      assert.deepEqual(emailModeOf({ EMAIL_FROM: FROM, RESEND_API_KEY }, true), { kind: "off" });
    }
  });
});

describe("sendEmail", () => {
  test("posts the mail to Resend with the key", async (t) => {
    const received: { authorization?: string; body: string }[] = [];

    const server = createServer((request, response) => {
      let body = "";

      request.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      request.on("end", () => {
        received.push({ authorization: request.headers.authorization, body });
        response.writeHead(200, { "content-type": "application/json" }).end('{"id":"1"}');
      });
    });

    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => server.close());
    const { port } = z.object({ port: z.number() }).parse(server.address());

    const outcome = await sendEmail(CODE, {
      apiKey: "re_test",
      endpoint: `http://127.0.0.1:${port}/emails`,
      from: FROM,
      kind: "resend",
    });

    assert.equal(outcome, "sent");
    assert.equal(received.length, 1);
    assert.equal(received[0]?.authorization, "Bearer re_test");
    assert.deepEqual(JSON.parse(received[0]?.body ?? ""), { ...CODE, from: FROM });
  });

  test("writes the mail, code included, to the log outside production", async (t) => {
    const info = t.mock.method(console, "info");

    assert.equal(await sendEmail(CODE, { kind: "log" }), "logged");
    const logged = JSON.stringify(info.mock.calls);
    assert.ok(logged.includes("dev@loremllm.local"));
    assert.ok(logged.includes("482913"));
  });

  test("logs neither the code nor the address in production without a key", async (t) => {
    const info = t.mock.method(console, "info");
    const warn = t.mock.method(console, "warn");

    assert.equal(await sendEmail(CODE, { kind: "off" }), "off");
    assert.equal(info.mock.callCount(), 0);
    const warned = JSON.stringify(warn.mock.calls);
    assert.ok(!warned.includes("482913"));
    assert.ok(!warned.includes("dev@loremllm.local"));
    assert.match(EMAIL_OFF_WARNING, /RESEND_API_KEY/u);
  });
});
