import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { NextRequest } from "next/server";

import { POST } from "./route";

const url = "https://app.kyh.io/api/orpc/organization/get";

const post = (headers: Record<string, string>) =>
  POST(
    new NextRequest(url, {
      body: JSON.stringify({ json: { slug: "acme" } }),
      headers: { "content-type": "application/json", ...headers },
      method: "POST",
    }),
  );

describe("rpc endpoint", () => {
  test("refuses a POST whose Origin is another origin, even a same-site one", async () => {
    const response = await post({ origin: "https://evil.kyh.io" });

    assert.strictEqual(response.status, 403);
  });

  test("allows a POST whose Origin is the app itself", async () => {
    const response = await post({ origin: "https://app.kyh.io" });

    assert.strictEqual(response.status, 401);
    assert.match(await response.text(), /UNAUTHORIZED/u);
  });

  test("allows a POST with no Origin at all, so non-browser callers still reach it", async () => {
    const response = await post({});

    assert.strictEqual(response.status, 401);
    assert.match(await response.text(), /UNAUTHORIZED/u);
  });
});
