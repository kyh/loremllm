/**
 * Application schema
 */
import { relations } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";

import { organization, user } from "./drizzle-schema-auth";

export const mockScenarios = pgTable("mock_scenarios", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  publicId: t
    .text()
    .notNull()
    .unique(),
  organizationId: t
    .text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: t.text().notNull(),
  description: t.text(),
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

export const mockInteractions = pgTable("mock_interactions", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  scenarioId: t
    .uuid()
    .notNull()
    .references(() => mockScenarios.id, { onDelete: "cascade" }),
  title: t.text().notNull(),
  description: t.text(),
  matchingInput: t.text().notNull(),
  matchingSignature: t.text().notNull(),
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

export const mockMessages = pgTable("mock_messages", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  interactionId: t
    .uuid()
    .notNull()
    .references(() => mockInteractions.id, { onDelete: "cascade" }),
  role: t.text().notNull(),
  name: t.text(),
  content: t
    .jsonb()
    .$type<unknown>()
    .notNull(),
  position: t.integer().notNull(),
  metadata: t.jsonb().$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}));

export const mockToolCalls = pgTable("mock_tool_calls", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  messageId: t
    .uuid()
    .notNull()
    .references(() => mockMessages.id, { onDelete: "cascade" }),
  callId: t.text().notNull(),
  toolName: t.text().notNull(),
  callIndex: t.integer().notNull(),
  arguments: t.jsonb().$type<unknown>().default(null),
  result: t.jsonb().$type<unknown>().default(null),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}));

export const mockScenariosRelations = relations(mockScenarios, ({ many }) => ({
  interactions: many(mockInteractions),
}));

export const mockInteractionsRelations = relations(
  mockInteractions,
  ({ many, one }) => ({
    scenario: one(mockScenarios, {
      fields: [mockInteractions.scenarioId],
      references: [mockScenarios.id],
    }),
    messages: many(mockMessages),
  }),
);

export const mockMessagesRelations = relations(mockMessages, ({ many, one }) => ({
  interaction: one(mockInteractions, {
    fields: [mockMessages.interactionId],
    references: [mockInteractions.id],
  }),
  toolCalls: many(mockToolCalls),
}));

export const mockToolCallsRelations = relations(mockToolCalls, ({ one }) => ({
  message: one(mockMessages, {
    fields: [mockToolCalls.messageId],
    references: [mockMessages.id],
  }),
}));

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
