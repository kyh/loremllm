/**
 * Relational graph for `db.query`, over the auth and application schemas
 * together. Keys are the schema export names, and the auth adapter resolves
 * its tables through this graph too, so every table must be part of it.
 */
import { defineRelations } from "drizzle-orm";

import * as schema from "./drizzle-schema";
import * as schemaAuth from "./drizzle-schema-auth";

export const relations = defineRelations({ ...schema, ...schemaAuth }, (r) => ({
  member: {
    // Allow-list only — full user rows include admin-only fields (role, banned)
    user: r.one.user({ from: r.member.userId, to: r.user.id }),
  },
  mockCollection: {
    interactions: r.many.mockInteraction({
      from: r.mockCollection.id,
      to: r.mockInteraction.collectionId,
    }),
  },
  mockInteraction: {
    collection: r.one.mockCollection({
      from: r.mockInteraction.collectionId,
      to: r.mockCollection.id,
    }),
  },
  waitlist: {
    user: r.one.user({ from: r.waitlist.userId, to: r.user.id }),
  },
}));
