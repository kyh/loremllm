import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { db } from "@repo/db/drizzle-client";
import type { mockCollection } from "@repo/db/drizzle-schema";
import type { member } from "@repo/db/drizzle-schema-auth";
import { createRouterClient } from "@orpc/server";

import type { ORPCContext } from "../orpc";
import { appRouter } from "../root-router";

/**
 * `interaction.query` is public, so no middleware proves membership for it: a
 * private collection is checked in the handler, against the membership row, as
 * `requireActiveOrganization` does. A member removed from the organization can
 * still hold a session naming it.
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

const privateCollection = {
  createdAt: new Date("2024-01-01"),
  description: null,
  id: "collection-1",
  isPublic: false,
  metadata: {},
  minSimilarity: 0,
  name: "Private",
  organizationId: "org-1",
  publicId: "private-1",
  updatedAt: new Date("2024-01-01"),
} satisfies typeof mockCollection.$inferSelect;

const clientFor = (caller: ORPCContext["session"]) =>
  createRouterClient(appRouter, { context: { db, session: caller } });

describe("interaction.query on a private collection", () => {
  test("refuses a session whose membership is gone", async (t) => {
    t.mock.method(db.query.mockCollection, "findFirst", () => Promise.resolve(privateCollection));
    const findMember = t.mock.method(db.query.member, "findFirst", () => Promise.resolve());

    await assert.rejects(
      clientFor(session).interaction.query({ publicId: "private-1", query: "hi" }),
      {
        code: "FORBIDDEN",
      },
    );
    assert.deepEqual(findMember.mock.calls[0]?.arguments, [
      { where: { organizationId: "org-1", userId: "user-1" } },
    ]);
  });

  test("refuses anonymous callers and other organizations without a lookup", async (t) => {
    t.mock.method(db.query.mockCollection, "findFirst", () => Promise.resolve(privateCollection));
    const findMember = t.mock.method(db.query.member, "findFirst", () =>
      Promise.resolve(membership),
    );
    const otherOrganization = {
      ...session,
      session: { ...session.session, activeOrganizationId: "org-2" },
    };

    for (const caller of [null, otherOrganization]) {
      await assert.rejects(
        clientFor(caller).interaction.query({ publicId: "private-1", query: "hi" }),
        {
          code: "FORBIDDEN",
        },
      );
    }
    assert.equal(findMember.mock.callCount(), 0);
  });

  test("lets a member through to the search", async (t) => {
    t.mock.method(db.query.mockCollection, "findFirst", () => Promise.resolve(privateCollection));
    t.mock.method(db.query.member, "findFirst", () => Promise.resolve(membership));
    t.mock.method(console, "error", () => {});

    // A blank query passes validation and fails at the embedding, locally,
    // which shows the access check let it through without a network call.
    await assert.rejects(
      clientFor(session).interaction.query({ publicId: "private-1", query: " " }),
      {
        code: "INTERNAL_SERVER_ERROR",
      },
    );
  });
});
