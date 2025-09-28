import { createHash, randomUUID } from "node:crypto";

import {
  mockInteractions,
  mockMessages,
  mockEndpoints,
  mockToolCalls,
} from "@repo/db/drizzle-schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  createInteractionInput,
  createEndpointInput,
  deleteInteractionInput,
  deleteEndpointInput,
  endpointByIdInput,
  updateEndpointInput,
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
  endpoint: createTRPCRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const endpoints = await ctx.db.query.mockEndpoints.findMany({
        where: (endpoint, { eq }) => eq(endpoint.organizationId, organizationId),
        orderBy: (endpoint, { desc }) => [desc(endpoint.updatedAt)],
        with: {
          interactions: {
            columns: { id: true },
          },
        },
      });

      return endpoints.map((endpoint) => ({
        id: endpoint.id,
        publicId: endpoint.publicId,
        name: endpoint.name,
        description: endpoint.description,
        metadata: endpoint.metadata,
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt,
        interactionCount: endpoint.interactions.length,
      }));
    }),

    byId: protectedProcedure.input(endpointByIdInput).query(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const endpoint = await ctx.db.query.mockEndpoints.findFirst({
        where: (endpoint, { and, eq }) =>
          and(eq(endpoint.id, input.endpointId), eq(endpoint.organizationId, organizationId)),
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

      if (!endpoint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found" });
      }

      return {
        id: endpoint.id,
        publicId: endpoint.publicId,
        name: endpoint.name,
        description: endpoint.description,
        metadata: endpoint.metadata,
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt,
        interactions: endpoint.interactions.map((interaction) => ({
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

    create: protectedProcedure.input(createEndpointInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const [endpoint] = await ctx.db
        .insert(mockEndpoints)
        .values({
          organizationId,
          publicId: randomUUID(),
          name: input.name,
          description: input.description ?? null,
          metadata: input.metadata ?? {},
        })
        .returning();

      if (!endpoint) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create endpoint",
        });
      }

      return {
        id: endpoint.id,
        publicId: endpoint.publicId,
        name: endpoint.name,
        description: endpoint.description,
        metadata: endpoint.metadata,
        createdAt: endpoint.createdAt,
        updatedAt: endpoint.updatedAt,
        interactionCount: 0,
      };
    }),

    update: protectedProcedure.input(updateEndpointInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const endpoint = await ctx.db.query.mockEndpoints.findFirst({
        where: (endpoint, { and, eq }) =>
          and(eq(endpoint.id, input.endpointId), eq(endpoint.organizationId, organizationId)),
      });

      if (!endpoint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found" });
      }

      const [updatedEndpoint] = await ctx.db
        .update(mockEndpoints)
        .set({
          name: input.name ?? endpoint.name,
          description: input.description ?? endpoint.description,
          metadata: input.metadata ?? endpoint.metadata,
          updatedAt: new Date(),
        })
        .where(eq(mockEndpoints.id, endpoint.id))
        .returning();

      if (!updatedEndpoint) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update endpoint",
        });
      }

      return {
        id: updatedEndpoint.id,
        publicId: updatedEndpoint.publicId,
        name: updatedEndpoint.name,
        description: updatedEndpoint.description,
        metadata: updatedEndpoint.metadata,
        createdAt: updatedEndpoint.createdAt,
        updatedAt: updatedEndpoint.updatedAt,
      };
    }),

    delete: protectedProcedure.input(deleteEndpointInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const endpoint = await ctx.db.query.mockEndpoints.findFirst({
        where: (endpoint, { and, eq }) =>
          and(eq(endpoint.id, input.endpointId), eq(endpoint.organizationId, organizationId)),
      });

      if (!endpoint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found" });
      }

      await ctx.db.delete(mockEndpoints).where(eq(mockEndpoints.id, endpoint.id));

      return { success: true } as const;
    }),
  }),

  interaction: createTRPCRouter({
    create: protectedProcedure.input(createInteractionInput).mutation(async ({ ctx, input }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const endpoint = await ctx.db.query.mockEndpoints.findFirst({
        where: (endpoint, { and, eq }) =>
          and(eq(endpoint.id, input.endpointId), eq(endpoint.organizationId, organizationId)),
      });

      if (!endpoint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found" });
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
            endpointId: endpoint.id,
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
          .update(mockEndpoints)
          .set({ updatedAt: now })
          .where(eq(mockEndpoints.id, endpoint.id));

        return interaction;
      });

      return {
        id: result.id,
        endpointId: result.endpointId,
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
          endpoint: true,
        },
      });

      if (!interaction || interaction.endpoint.organizationId !== organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interaction not found" });
      }

      await ctx.db.delete(mockInteractions).where(eq(mockInteractions.id, interaction.id));

      return { success: true } as const;
    }),
  }),
});

export type MockRouter = typeof mockRouter;
