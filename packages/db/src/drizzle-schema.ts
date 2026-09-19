/**
 * Application schema
 */
import { sql } from "drizzle-orm";
import { customType, snakeCase } from "drizzle-orm/sqlite-core";

import { organization, user } from "./drizzle-schema-auth";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
interface JsonObject {
  [key: string]: JsonValue;
}

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
    return [...new Float32Array(value.buffer)];
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
export const mockCollection = snakeCase.table("mock_collection", (t) => ({
  createdAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  description: t.text(),
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  isPublic: t.integer({ mode: "boolean" }).notNull().default(false),
  metadata: t.text({ mode: "json" }).$type<JsonObject>().default({}),
  // Minimum cosine similarity (0-1) a query must reach to match; 0 disables the threshold
  minSimilarity: t.real().notNull().default(0),
  name: t.text(),
  organizationId: t
    .text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  publicId: t.text().notNull().unique(),
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
export const mockInteraction = snakeCase.table("mock_interaction", (t) => ({
  // Nullable for demo interactions
  collectionId: t.text().references(() => mockCollection.id, { onDelete: "cascade" }),
  createdAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  description: t.text(),
  id: t
    .text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Matched against the user input
  input: t.text().notNull(),
  metadata: t.text({ mode: "json" }).$type<JsonObject>().default({}).notNull(),
  // Markdown response string
  output: t.text().notNull(),
  responseSchema: t.text().notNull().default("LanguageModelV2StreamPart"),
  title: t.text().notNull(),
  updatedAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  vector: float32Array("vector", { dimensions: 1536 }),
}));

/**
 * Mock Eve Session
 * Server-side session state for the hosted eve-protocol endpoints
 * (/api/eve/[collectionId]). Holds the serialized session record
 * (event log + conversation history) that the @loremllm/transport/eve
 * handler needs across requests — create/continue POSTs and stream GETs
 * can land on different serverless instances.
 */
export const mockEveSession = snakeCase.table("mock_eve_session", (t) => ({
  collectionPublicId: t
    .text()
    .notNull()
    .references(() => mockCollection.publicId, { onDelete: "cascade" }),
  createdAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  // sessionId minted by the eve handler
  id: t.text().primaryKey(),
  // EveSessionRecord, validated on read
  record: t.text({ mode: "json" }).notNull(),
  updatedAt: t
    .integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
}));

export const waitlist = snakeCase.table("waitlist", (t) => ({
  email: t.text(),
  id: t
    .text()
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  source: t.text(),
  userId: t.text().references(() => user.id),
}));
