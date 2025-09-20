import { createHash, randomUUID } from "node:crypto";

import {
  mockInteractions,
  mockMessages,
  mockScenarios,
  mockToolCalls,
} from "@repo/db/drizzle-schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  createInteractionInput,
  createScenarioInput,
  deleteInteractionInput,
  deleteScenarioInput,
  scenarioByIdInput,
  updateScenarioInput,
} from "./mock-schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { AuthenticatedSession, TRPCContext } from "../trpc";
import type { MessageInput, ToolCallInput, JsonValue } from "./mock-schema";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeWhitespace = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const hashSignature = (value: string) =>
  createHash("sha256").update(normalizeWhitespace(value)).digest("hex");

const flattenContentToText = (content: MessageInput["content"] | null | undefined) => {
  if (content == null) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (isRecord(part)) {
          if (typeof part.text === "string") {
            return part.text;
          }
          if (typeof part.data === "string") {
            return part.data;
          }
          return JSON.stringify(part.data ?? "");
        }
        return "";
      })
      .join(" ");
  }

  if (isRecord(content)) {
    if (typeof content.text === "string") {
      return content.text;
    }

    return JSON.stringify(content);
  }

  return String(content);
};

const buildMatchingInput = (messages: MessageInput[]) => {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => flattenContentToText(message.content))
    .join("\n")
    .trim();

  if (userText.length > 0) {
    return userText;
  }

  return messages
    .map((message) => flattenContentToText(message.content))
    .join("\n")
    .trim();
};

type SessionWithActiveOrganization = {
  session: { activeOrganizationId?: string | null };
  user: { activeOrganizationId?: string | null };
};

const requireActiveOrganizationId = (ctx: TRPCContext) => {
  const session = ctx.session as AuthenticatedSession & SessionWithActiveOrganization;
  const organizationId =
    session.session.activeOrganizationId ??
    session.user.activeOrganizationId ??
    null;

  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You do not have an active organization selected.",
    });
  }

  return organizationId;
};

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
};

const normalizeJsonish = (value: unknown): JsonValue | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isJsonValue(parsed)) {
        return parsed;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonish(item) ?? null);
  }

  if (isRecord(value)) {
    const record: Record<string, JsonValue> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      record[key] = normalizeJsonish(entryValue) ?? null;
    }
    return record;
  }

  return null;
};

const mapToolCalls = (toolCalls: ToolCallInput[], messageId: string) =>
  toolCalls.map((toolCall, index) => ({
    callId: toolCall.callId ?? randomUUID(),
    toolName: toolCall.toolName,
    callIndex: index,
    messageId,
    arguments: normalizeJsonish(toolCall.arguments),
    result: normalizeJsonish(toolCall.result),
  }));

const normalizeMessageContent = (content: MessageInput["content"]) => {
  if (content === undefined) {
    return "";
  }

  return content;
};

export const mockRouter = createTRPCRouter({
  scenario: createTRPCRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const scenarios = await ctx.db.query.mockScenarios.findMany({
        where: (scenario, { eq }) => eq(scenario.organizationId, organizationId),
        orderBy: (scenario, { desc }) => [desc(scenario.updatedAt)],
        with: {
          interactions: {
            columns: { id: true },
          },
        },
      });

      return scenarios.map((scenario) => ({
        id: scenario.id,
        publicId: scenario.publicId,
        name: scenario.name,
        description: scenario.description,
        metadata: scenario.metadata,
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
        interactionCount: scenario.interactions.length,
      }));
    }),

    byId: protectedProcedure.input(scenarioByIdInput).query(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const scenario = await ctx.db.query.mockScenarios.findFirst({
        where: (scenario, { and, eq }) =>
          and(eq(scenario.id, input.scenarioId), eq(scenario.organizationId, organizationId)),
        with: {
          interactions: {
            orderBy: (interaction, { desc }) => [desc(interaction.updatedAt)],
            with: {
              messages: {
                orderBy: (message, { asc }) => [asc(message.position)],
                with: {
                  toolCalls: {
                    orderBy: (toolCall, { asc }) => [asc(toolCall.callIndex)],
                  },
                },
              },
            },
          },
        },
      });

      if (!scenario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }

      return {
        id: scenario.id,
        publicId: scenario.publicId,
        name: scenario.name,
        description: scenario.description,
        metadata: scenario.metadata,
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
        interactions: scenario.interactions.map((interaction) => ({
          id: interaction.id,
          title: interaction.title,
          description: interaction.description,
          matchingInput: interaction.matchingInput,
          matchingSignature: interaction.matchingSignature,
          createdAt: interaction.createdAt,
          updatedAt: interaction.updatedAt,
          messages: interaction.messages.map((message) => ({
            id: message.id,
            role: message.role,
            name: message.name,
            content: message.content,
            position: message.position,
            toolCalls: message.toolCalls.map((toolCall) => ({
              id: toolCall.id,
              callId: toolCall.callId,
              toolName: toolCall.toolName,
              callIndex: toolCall.callIndex,
              arguments: toolCall.arguments,
              result: toolCall.result,
            })),
          })),
        })),
      };
    }),

    create: protectedProcedure.input(createScenarioInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const [scenario] = await ctx.db
        .insert(mockScenarios)
        .values({
          organizationId,
          publicId: randomUUID(),
          name: input.name,
          description: input.description ?? null,
          metadata: input.metadata ?? {},
        })
        .returning();

      if (!scenario) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create scenario",
        });
      }

      return {
        id: scenario.id,
        publicId: scenario.publicId,
        name: scenario.name,
        description: scenario.description,
        metadata: scenario.metadata,
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
        interactionCount: 0,
      };
    }),

    update: protectedProcedure.input(updateScenarioInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const scenario = await ctx.db.query.mockScenarios.findFirst({
        where: (scenario, { and, eq }) =>
          and(eq(scenario.id, input.scenarioId), eq(scenario.organizationId, organizationId)),
      });

      if (!scenario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }

      const [updatedScenario] = await ctx.db
        .update(mockScenarios)
          .set({
            name: input.name ?? scenario.name,
            description: input.description ?? scenario.description,
            metadata: input.metadata ?? scenario.metadata,
            updatedAt: new Date(),
          })
        .where(eq(mockScenarios.id, scenario.id))
        .returning();

      if (!updatedScenario) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update scenario",
        });
      }

      return {
        id: updatedScenario.id,
        publicId: updatedScenario.publicId,
        name: updatedScenario.name,
        description: updatedScenario.description,
        metadata: updatedScenario.metadata,
        createdAt: updatedScenario.createdAt,
        updatedAt: updatedScenario.updatedAt,
      };
    }),

    delete: protectedProcedure.input(deleteScenarioInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const scenario = await ctx.db.query.mockScenarios.findFirst({
        where: (scenario, { and, eq }) =>
          and(eq(scenario.id, input.scenarioId), eq(scenario.organizationId, organizationId)),
      });

      if (!scenario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }

      await ctx.db.delete(mockScenarios).where(eq(mockScenarios.id, scenario.id));

      return { success: true } as const;
    }),
  }),

  interaction: createTRPCRouter({
    create: protectedProcedure.input(createInteractionInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const scenario = await ctx.db.query.mockScenarios.findFirst({
        where: (scenario, { and, eq }) =>
          and(eq(scenario.id, input.scenarioId), eq(scenario.organizationId, organizationId)),
      });

      if (!scenario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }

      const matchingInput = buildMatchingInput(input.messages);

      if (!matchingInput.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "At least one message must contain content for matching.",
        });
      }

      const matchingSignature = hashSignature(matchingInput);

      const now = new Date();

      const result = await ctx.db.transaction(async (tx) => {
        const [interaction] = await tx
          .insert(mockInteractions)
          .values({
            scenarioId: scenario.id,
            title: input.title,
            description: input.description ?? null,
            matchingInput,
            matchingSignature,
          })
          .returning();

        if (!interaction) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create interaction",
          });
        }

        for (const [index, message] of input.messages.entries()) {
          const [insertedMessage] = await tx
            .insert(mockMessages)
            .values({
              interactionId: interaction.id,
              role: message.role,
              name: message.name ?? null,
              content: normalizeMessageContent(message.content),
              position: index,
            })
            .returning();

          if (!insertedMessage) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to persist interaction message",
            });
          }

          if (message.toolCalls?.length) {
            const toolCallRows = mapToolCalls(message.toolCalls, insertedMessage.id);
            if (toolCallRows.length) {
              await tx.insert(mockToolCalls).values(toolCallRows);
            }
          }
        }

        await tx
          .update(mockScenarios)
          .set({ updatedAt: now })
          .where(eq(mockScenarios.id, scenario.id));

        return interaction;
      });

      return {
        id: result.id,
        scenarioId: result.scenarioId,
        title: result.title,
        description: result.description,
        matchingInput: result.matchingInput,
        matchingSignature: result.matchingSignature,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    }),

    delete: protectedProcedure.input(deleteInteractionInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const interaction = await ctx.db.query.mockInteractions.findFirst({
        where: (interaction, { eq }) => eq(interaction.id, input.interactionId),
        with: {
          scenario: true,
        },
      });

      if (!interaction || interaction.scenario.organizationId !== organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interaction not found" });
      }

      await ctx.db.delete(mockInteractions).where(eq(mockInteractions.id, interaction.id));

      return { success: true } as const;
    }),
  }),
});

export type MockRouter = typeof mockRouter;
