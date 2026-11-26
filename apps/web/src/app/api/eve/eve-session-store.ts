import type { EveSessionStore } from "@loremllm/transport/eve";
import { parseEveSessionRecord } from "@loremllm/transport/eve";
import { db } from "@repo/db/drizzle-client";
import { mockEveSession } from "@repo/db/drizzle-schema";
import { z } from "zod";

const jsonValue = z.json();

/**
 * Database-backed session store for the hosted eve endpoints. Scoped to one
 * collection so a session minted under one collection's endpoint can never be
 * read through another's.
 */
export const createDbEveSessionStore = (collectionPublicId: string) =>
  ({
    async get(sessionId) {
      const row = await db.query.mockEveSession.findFirst({
        where: { collectionPublicId, id: sessionId },
      });

      const record = jsonValue.safeParse(row?.record);

      return record.success ? parseEveSessionRecord(record.data) : undefined;
    },
    async set(sessionId, record) {
      const now = new Date();
      await db
        .insert(mockEveSession)
        .values({
          collectionPublicId,
          createdAt: now,
          id: sessionId,
          record,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: { record, updatedAt: now },
          target: mockEveSession.id,
        });
    },
  }) satisfies EveSessionStore;
