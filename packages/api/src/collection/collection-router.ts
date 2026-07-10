import { randomUUID } from "node:crypto";
import { eq } from "@repo/db";
import { mockCollection } from "@repo/db/drizzle-schema";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, organizationProcedure } from "../trpc";
import {
  collectionByIdInput,
  createCollectionInput,
  deleteCollectionInput,
  updateCollectionInput,
} from "./collection-schema";

export const collectionRouter = createTRPCRouter({
  list: organizationProcedure.query(async ({ ctx }) => {
    const collections = await ctx.db.query.mockCollection.findMany({
      where: (collection, { eq }) => eq(collection.organizationId, ctx.organizationId),
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
      minSimilarity: collection.minSimilarity,
      metadata: collection.metadata,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      interactionCount: collection.interactions.length,
    }));
  }),

  byId: organizationProcedure.input(collectionByIdInput).query(async ({ ctx, input }) => {
    const collection = await ctx.db.query.mockCollection.findFirst({
      where: (collection, { and, eq }) =>
        and(
          eq(collection.id, input.collectionId),
          eq(collection.organizationId, ctx.organizationId),
        ),
      with: {
        interactions: {
          // Exclude the embedding blob — libsql's JSON protocol can't carry it
          columns: { vector: false },
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
      minSimilarity: collection.minSimilarity,
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

  create: organizationProcedure.input(createCollectionInput).mutation(async ({ ctx, input }) => {
    const [collection] = await ctx.db
      .insert(mockCollection)
      .values({
        organizationId: ctx.organizationId,
        publicId: input.publicId ?? randomUUID(),
        name: input.name,
        description: input.description ?? null,
        isPublic: input.isPublic ?? false,
        minSimilarity: input.minSimilarity ?? 0,
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
      minSimilarity: collection.minSimilarity,
      metadata: collection.metadata,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      interactionCount: 0,
    };
  }),

  update: organizationProcedure.input(updateCollectionInput).mutation(async ({ ctx, input }) => {
    const collection = await ctx.db.query.mockCollection.findFirst({
      where: (collection, { and, eq }) =>
        and(
          eq(collection.id, input.collectionId),
          eq(collection.organizationId, ctx.organizationId),
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
        // An explicit empty string clears the description; undefined leaves it unchanged
        description:
          input.description === undefined
            ? collection.description
            : input.description.trim() || null,
        isPublic: input.isPublic ?? collection.isPublic,
        minSimilarity: input.minSimilarity ?? collection.minSimilarity,
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
      minSimilarity: updatedCollection.minSimilarity,
      metadata: updatedCollection.metadata,
      createdAt: updatedCollection.createdAt,
      updatedAt: updatedCollection.updatedAt,
    };
  }),

  delete: organizationProcedure.input(deleteCollectionInput).mutation(async ({ ctx, input }) => {
    const collection = await ctx.db.query.mockCollection.findFirst({
      where: (collection, { and, eq }) =>
        and(
          eq(collection.id, input.collectionId),
          eq(collection.organizationId, ctx.organizationId),
        ),
    });

    if (!collection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Collection not found",
      });
    }

    await ctx.db.delete(mockCollection).where(eq(mockCollection.id, collection.id));

    return { success: true } as const;
  }),
});
