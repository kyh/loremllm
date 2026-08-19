import type { EveSessionStore } from "@loremllm/transport/eve";
import { parseEveSessionRecord } from "@loremllm/transport/eve";
import { and, eq } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { mockEveSession } from "@repo/db/drizzle-schema";
import { z } from "zod";

const jsonValue = z.json();

/**
 * Database-backed session store for the hosted eve endpoints. Scoped to one
 * collection so a session minted under one collection's endpoint can never be
 * read through another's.
 */
export function createDbEveSessionStore(collectionPublicId: string): EveSessionStore {
  return {
    async get(sessionId) {
      const row = await db.query.mockEveSession.findFirst({
        where: and(
          eq(mockEveSession.id, sessionId),
          eq(mockEveSession.collectionPublicId, collectionPublicId),
        ),
      });
      if (!row) {
        return undefined;
      }
      // The column holds JSON by construction; a non-JSON value is a stale or
      // foreign row and surfaces as session-not-found, like any bad record.
      const record = jsonValue.safeParse(row.record);
      if (!record.success) {
        return undefined;
      }
      return parseEveSessionRecord(record.data);
    },
    async set(sessionId, record) {
      const now = new Date();
      await db
        .insert(mockEveSession)
        .values({
          id: sessionId,
          collectionPublicId,
          record,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: mockEveSession.id,
          set: { record, updatedAt: now },
        });
    },
  };
}
