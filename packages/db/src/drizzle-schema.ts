/**
 * Application schema
 */
import { relations } from "drizzle-orm";
import { pgTable, vector } from "drizzle-orm/pg-core";

import { organization, user } from "./drizzle-schema-auth";

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
export const mockCollection = pgTable("mock_collection", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  publicId: t.text().notNull().unique(),
  organizationId: t
    .text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: t.text(),
  description: t.text(),
  isPublic: t.boolean().notNull().default(false),
  metadata: t.jsonb().$type<Record<string, unknown>>().default({}),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
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
export const mockInteraction = pgTable("mock_interaction", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  collectionId: t
    .uuid()
    .references(() => mockCollection.id, { onDelete: "cascade" }), // Nullable for demo interactions
  title: t.text().notNull(),
  description: t.text(),
  input: t.text().notNull(), // will be matched against the user input
  embedding: vector("embedding", { dimensions: 384 }), // embedding of input for semantic search, 384 dimensions for all-MiniLM-L6-v2
  output: t.text().notNull(), // Markdown response string
  responseSchema: t.text().notNull().default("LanguageModelV2StreamPart"), // Schema type
  metadata: t.jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
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

export const waitlist = pgTable("waitlist", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
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
