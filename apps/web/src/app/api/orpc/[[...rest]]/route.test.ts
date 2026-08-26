import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { NextRequest } from "next/server";

import { POST } from "./route";

/**
 * The transport's cross-origin defense is a thing typecheck cannot see, and the
 * case it exists for — a same-site *cross-origin* POST, from a sibling
 * `*.kyh.io` subdomain or another port on localhost — is exactly the one the
 * session cookie's `SameSite=Lax` does not cover. Drive the real exported route
 * handler: a test that restates the predicate would pass with the guard gone.
 *
 * `organization.get` is a `protectedProcedure`, so an anonymous request stops
 * at its session check without reaching the database.
 */

const url = "https://app.kyh.io/api/orpc/organization/get";

const post = (headers: Record<string, string>) =>
  POST(
    new NextRequest(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ json: { slug: "acme" } }),
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
    assert.match(await response.text(), /UNAUTHORIZED/);
  });

  test("allows a POST with no Origin at all, so non-browser callers still reach it", async () => {
    const response = await post({});

    assert.strictEqual(response.status, 401);
    assert.match(await response.text(), /UNAUTHORIZED/);
  });
});
