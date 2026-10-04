import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { db } from "@repo/db/drizzle-client";
import type { member } from "@repo/db/drizzle-schema-auth";
import { createRouterClient } from "@orpc/server";

import type { ORPCContext } from "./orpc";
import { appRouter } from "./root-router";

/**
 * Where middleware runs relative to input validation is invisible to
 * typecheck. `requireSession` and `requireActiveOrganization` are applied on
 * the implementers, so both run before validation: an anonymous caller gets
 * UNAUTHORIZED and a caller without an organization gets FORBIDDEN, whatever
 * input they send. Drive the real router; the membership lookup is the only
 * query that can run before a rejection, so the tests stub it.
 */

const session = {
  session: {
    activeOrganizationId: "org-1",
    createdAt: new Date("2024-01-01"),
    expiresAt: new Date("2099-01-01"),
    id: "session-1",
    ipAddress: null,
    token: "token",
    updatedAt: new Date("2024-01-01"),
    userAgent: null,
    userId: "user-1",
  },
  user: {
    banned: null,
    createdAt: new Date("2024-01-01"),
    email: "test@example.com",
    emailVerified: true,
    id: "user-1",
    image: null,
    name: "Test User",
    updatedAt: new Date("2024-01-01"),
  },
} satisfies NonNullable<ORPCContext["session"]>;

const membership = {
  createdAt: new Date("2024-01-01"),
  id: "member-1",
  organizationId: "org-1",
  role: "owner",
  userId: "user-1",
} satisfies typeof member.$inferSelect;

const anonymous = createRouterClient(appRouter, { context: { db, session: null } });
const signedIn = createRouterClient(appRouter, { context: { db, session } });

describe("procedure middleware", () => {
  test("rejects unauthenticated callers before validating input", async (t) => {
    const findMember = t.mock.method(db.query.member, "findFirst", () =>
      Promise.resolve(membership),
    );

    await assert.rejects(anonymous.collection.create({ name: "" }), { code: "UNAUTHORIZED" });
    await assert.rejects(
      anonymous.interaction.create({ collectionId: "c", input: "", output: "o" }),
      { code: "UNAUTHORIZED" },
    );
    assert.equal(findMember.mock.callCount(), 0);
  });

  test("validates a public procedure's input without a session", async () => {
    await assert.rejects(anonymous.interaction.query({ publicId: "demo", query: "" }), {
      code: "BAD_REQUEST",
    });
  });

  test("resolves the active organization before validating input", async (t) => {
    const findMember = t.mock.method(db.query.member, "findFirst", () => Promise.resolve());

    await assert.rejects(signedIn.collection.create({ name: "" }), { code: "FORBIDDEN" });
    assert.equal(findMember.mock.callCount(), 1);
  });

  test("rejects invalid input once the session and organization resolve", async (t) => {
    t.mock.method(db.query.member, "findFirst", () => Promise.resolve(membership));

    await assert.rejects(signedIn.collection.create({ name: "" }), { code: "BAD_REQUEST" });
    await assert.rejects(
      signedIn.interaction.create({ collectionId: "c", input: "", output: "o" }),
      { code: "BAD_REQUEST" },
    );
  });
});
