import { defineRelations } from "drizzle-orm";

import * as schema from "./drizzle-schema";
import * as schemaAuth from "./drizzle-schema-auth";

export const relations = defineRelations({ ...schema, ...schemaAuth }, (r) => ({
  member: {
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
