import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { auth } from "./auth";

/**
 * SameSite is the cross-*site* half of `/api/orpc`'s forgery defense: oRPC ships
 * no CSRF token, and the route sets no CORS headers, so a forged cross-site POST
 * is harmless only while the browser refuses to attach this cookie to it. (The
 * other half — a same-site cross-origin POST, which the browser *does* attach
 * this cookie to — is the route's own Origin check, pinned in its own test.)
 * Nothing else in the gate can catch a regression here: typecheck and build are
 * happy with any valid value, and `"none"` would hand the cookie to every site
 * on the internet silently.
 *
 * Read the *resolved* attributes rather than the config literal: a plugin, a
 * `crossSubDomainCookies` option, or a better-auth default can decide this too,
 * and asserting the literal against itself would prove nothing.
 */
describe("session cookie", () => {
  test("is SameSite Lax or Strict, never None", async () => {
    const { authCookies } = await auth.$context;
    const sameSite = String(authCookies.sessionToken.attributes.sameSite).toLowerCase();

    assert.ok(
      sameSite === "lax" || sameSite === "strict",
      `session cookie sameSite must be lax or strict, got ${sameSite}`,
    );
  });
});
