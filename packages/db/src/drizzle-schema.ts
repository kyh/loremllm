/**
 * Application schema
 */
import { relations, sql } from "drizzle-orm";
import { customType, sqliteTable } from "drizzle-orm/sqlite-core";

import { organization, user } from "./drizzle-schema-auth";

const float32Array = customType<{
  data: number[];
  config: { dimensions: number };
  configRequired: true;
  driverData: Buffer;
}>({
  dataType(config) {
    return `F32_BLOB(${config.dimensions})`;
  },
  fromDriver(value: Buffer) {
    return Array.from(new Float32Array(value.buffer));
  },
  toDriver(value: number[]) {
    return sql`vector32(${JSON.stringify(value)})`;
  },
});

/**
 * Mock Collection
 * A collection of mock interactions. Typically used to mock a specific feature.
 *
 * @example
 * name: "Website Chatbot"
 *
 * @example
 * name: "API Documentation Chatbot"
 */
export const mockCollection = sqliteTable("mock_collection", (t) => ({
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  publicId: t.text().notNull().unique(),
  organizationId: t
    .text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: t.text(),
  description: t.text(),
  isPublic: t.integer({ mode: "boolean" }).notNull().default(false),
  metadata: t
    .text({ mode: "json" })
    .$type<Record<string, unknown>>()
    .default({}),
  createdAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
}));

/**
 * Mock Interaction
 * An interaction in a mock collection.
 *
 * @example
 * title: "Generic Response"
 * input: "What is the weather in San Francisco?"
 * output: "The weather in San Francisco is sunny and 60 degrees."
 * responseSchema: "LanguageModelV2StreamPart"
 */
export const mockInteraction = sqliteTable("mock_interaction", (t) => ({
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  collectionId: t
    .text()
    .references(() => mockCollection.id, { onDelete: "cascade" }), // Nullable for demo interactions
  title: t.text().notNull(),
  description: t.text(),
  input: t.text().notNull(), // will be matched against the user input
  vector: float32Array("vector", { dimensions: 1536 }),
  output: t.text().notNull(), // Markdown response string
  responseSchema: t.text().notNull().default("LanguageModelV2StreamPart"), // Schema type
  metadata: t
    .text({ mode: "json" })
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  createdAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
}));

export const mockCollectionRelations = relations(
  mockCollection,
  ({ many }) => ({
    interactions: many(mockInteraction),
  }),
);

export const mockInteractionRelations = relations(
  mockInteraction,
  ({ one }) => ({
    collection: one(mockCollection, {
      fields: [mockInteraction.collectionId],
      references: [mockCollection.id],
    }),
  }),
);

export const waitlist = sqliteTable("waitlist", (t) => ({
  id: t
    .text()
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: t.text().references(() => user.id),
  source: t.text(),
  email: t.text(),
}));

export const waitlistRelations = relations(waitlist, ({ one }) => ({
  user: one(user, {
    fields: [waitlist.userId],
    references: [user.id],
  }),
}));
