import { randomUUID } from "node:crypto";
import { mockCollection, mockInteraction } from "@repo/db/drizzle-schema";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";

import type { AuthenticatedSession, TRPCContext } from "../trpc";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { generateEmbedding } from "./embedding-service";
import {
  collectionByIdInput,
  createCollectionInput,
  createInteractionInput,
  deleteCollectionInput,
  deleteInteractionInput,
  updateCollectionInput,
} from "./mock-schema";

type SessionWithActiveOrganization = {
  session: { activeOrganizationId?: string | null };
  user: { activeOrganizationId?: string | null };
};

const requireActiveOrganizationId = (ctx: TRPCContext) => {
  const session = ctx.session as AuthenticatedSession &
    SessionWithActiveOrganization;
  const organizationId =
    session.session.activeOrganizationId ??
    session.user.activeOrganizationId ??
    null;

  if (!organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No active organization found for session",
    });
  }

  return organizationId;
};

export const mockRouter = createTRPCRouter({
  collection: createTRPCRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
      const organizationId = requireActiveOrganizationId(ctx);

      const collections = await ctx.db.query.mockCollection.findMany({
        where: (collection, { eq }) =>
          eq(collection.organizationId, organizationId),
        orderBy: (collection, { desc }) => [desc(collection.updatedAt)],
        with: {
          interactions: {
            columns: { id: true },
          },
        },
      });

      return collections.map((collection) => ({
        id: collection.id,
        publicId: collection.publicId,
        name: collection.name,
        description: collection.description,
        isPublic: collection.isPublic,
        metadata: collection.metadata,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        interactionCount: collection.interactions.length,
      }));
    }),

    byId: protectedProcedure
      .input(collectionByIdInput)
      .query(async ({ ctx, input }) => {
        const organizationId = requireActiveOrganizationId(ctx);

        const collection = await ctx.db.query.mockCollection.findFirst({
          where: (collection, { and, eq }) =>
            and(
              eq(collection.id, input.collectionId),
              eq(collection.organizationId, organizationId),
            ),
          with: {
            interactions: {
              orderBy: (interaction, { desc }) => [desc(interaction.updatedAt)],
            },
          },
        });

        if (!collection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Collection not found",
          });
        }

        return {
          id: collection.id,
          publicId: collection.publicId,
          name: collection.name,
          description: collection.description,
          isPublic: collection.isPublic,
          metadata: collection.metadata,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
          interactions: collection.interactions.map((interaction) => ({
            id: interaction.id,
            title: interaction.title,
            description: interaction.description,
            input: interaction.input,
            output: interaction.output,
            responseSchema: interaction.responseSchema,
            createdAt: interaction.createdAt,
            updatedAt: interaction.updatedAt,
          })),
        };
      }),

    create: protectedProcedure
      .input(createCollectionInput)
      .mutation(async ({ ctx, input }) => {
        const organizationId = requireActiveOrganizationId(ctx);

        const [collection] = await ctx.db
          .insert(mockCollection)
          .values({
            organizationId,
            publicId: randomUUID(),
            name: input.name,
            description: input.description ?? null,
            isPublic: input.isPublic ?? false,
            metadata: input.metadata ?? {},
          })
          .returning();

        if (!collection) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create collection",
          });
        }

        return {
          id: collection.id,
          publicId: collection.publicId,
          name: collection.name,
          description: collection.description,
          isPublic: collection.isPublic,
          metadata: collection.metadata,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
          interactionCount: 0,
        };
      }),

    update: protectedProcedure
      .input(updateCollectionInput)
      .mutation(async ({ ctx, input }) => {
        const organizationId = requireActiveOrganizationId(ctx);

        const collection = await ctx.db.query.mockCollection.findFirst({
          where: (collection, { and, eq }) =>
            and(
              eq(collection.id, input.collectionId),
              eq(collection.organizationId, organizationId),
            ),
        });

        if (!collection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Collection not found",
          });
        }

        const [updatedCollection] = await ctx.db
          .update(mockCollection)
          .set({
            name: input.name ?? collection.name,
            description: input.description ?? collection.description,
            isPublic: input.isPublic ?? collection.isPublic,
            metadata: input.metadata ?? collection.metadata,
            updatedAt: new Date(),
          })
          .where(eq(mockCollection.id, collection.id))
          .returning();

        if (!updatedCollection) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update collection",
          });
        }

        return {
          id: updatedCollection.id,
          publicId: updatedCollection.publicId,
          name: updatedCollection.name,
          description: updatedCollection.description,
          isPublic: updatedCollection.isPublic,
          metadata: updatedCollection.metadata,
          createdAt: updatedCollection.createdAt,
          updatedAt: updatedCollection.updatedAt,
        };
      }),

    delete: protectedProcedure
      .input(deleteCollectionInput)
      .mutation(async ({ ctx, input }) => {
        const organizationId = requireActiveOrganizationId(ctx);

        const collection = await ctx.db.query.mockCollection.findFirst({
          where: (collection, { and, eq }) =>
            and(
              eq(collection.id, input.collectionId),
              eq(collection.organizationId, organizationId),
            ),
        });

        if (!collection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Collection not found",
          });
        }

        await ctx.db
          .delete(mockCollection)
          .where(eq(mockCollection.id, collection.id));

        return { success: true } as const;
      }),
  }),

  interaction: createTRPCRouter({
    create: protectedProcedure
      .input(createInteractionInput)
      .mutation(async ({ ctx, input }) => {
        const organizationId = requireActiveOrganizationId(ctx);

        const collection = await ctx.db.query.mockCollection.findFirst({
          where: (collection, { and, eq }) =>
            and(
              eq(collection.id, input.collectionId),
              eq(collection.organizationId, organizationId),
            ),
        });

        if (!collection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Collection not found",
          });
        }

        if (!input.input.length || !input.output.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Both input and output are required.",
          });
        }

        // Generate embedding for the input
        let embedding: number[];
        try {
          embedding = await generateEmbedding(input.input);
        } catch (error) {
          console.error("Failed to generate embedding:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate embedding for interaction input",
          });
        }

        const now = new Date();

        const result = await ctx.db.transaction(async (tx) => {
          const [interaction] = await tx
            .insert(mockInteraction)
            .values({
              collectionId: collection.id,
              title: input.title ?? "Unamed Interaction",
              description: input.description ?? null,
              input: input.input,
              embedding: sql`${JSON.stringify(embedding)}::vector`,
              output: input.output,
              responseSchema: "LanguageModelV2StreamPart",
            })
            .returning();

          if (!interaction) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create interaction",
            });
          }

          await tx
            .update(mockCollection)
            .set({ updatedAt: now })
            .where(eq(mockCollection.id, collection.id));

          return interaction;
        });

        return {
          id: result.id,
          collectionId: result.collectionId,
          title: result.title,
          description: result.description,
          input: result.input,
          output: result.output,
          responseSchema: result.responseSchema,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        };
      }),

    delete: protectedProcedure
      .input(deleteInteractionInput)
      .mutation(async ({ ctx, input }) => {
        const organizationId = requireActiveOrganizationId(ctx);

        const interaction = await ctx.db.query.mockInteraction.findFirst({
          where: (interaction, { eq }) =>
            eq(interaction.id, input.interactionId),
          with: {
            collection: true,
          },
        });

        if (
          !interaction ||
          interaction.collection?.organizationId !== organizationId
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Interaction not found",
          });
        }

        await ctx.db
          .delete(mockInteraction)
          .where(eq(mockInteraction.id, interaction.id));

        return { success: true } as const;
      }),
  }),
});
