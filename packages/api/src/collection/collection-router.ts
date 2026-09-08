import { randomUUID } from "node:crypto";
import { and, eq } from "@repo/db";
import { mockCollection } from "@repo/db/drizzle-schema";
import { ORPCError } from "@orpc/server";

import { organizationProcedure } from "../orpc";
import {
  collectionByIdInput,
  createCollectionInput,
  deleteCollectionInput,
  updateCollectionInput,
} from "./collection-schema";

export const collectionRouter = {
  byId: organizationProcedure.input(collectionByIdInput).handler(async ({ context, input }) => {
    const collection = await context.db.query.mockCollection.findFirst({
      where: and(
        eq(mockCollection.id, input.collectionId),
        eq(mockCollection.organizationId, context.organizationId),
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
      throw new ORPCError("NOT_FOUND", {
        message: "Collection not found",
      });
    }

    return {
      createdAt: collection.createdAt,
      description: collection.description,
      id: collection.id,
      interactions: collection.interactions.map((interaction) => ({
        createdAt: interaction.createdAt,
        description: interaction.description,
        id: interaction.id,
        input: interaction.input,
        output: interaction.output,
        responseSchema: interaction.responseSchema,
        title: interaction.title,
        updatedAt: interaction.updatedAt,
      })),
      isPublic: collection.isPublic,
      metadata: collection.metadata,
      minSimilarity: collection.minSimilarity,
      name: collection.name,
      publicId: collection.publicId,
      updatedAt: collection.updatedAt,
    };
  }),

  create: organizationProcedure.input(createCollectionInput).handler(async ({ context, input }) => {
    const [collection] = await context.db
      .insert(mockCollection)
      .values({
        description: input.description ?? null,
        isPublic: input.isPublic ?? false,
        metadata: input.metadata ?? {},
        minSimilarity: input.minSimilarity ?? 0,
        name: input.name,
        organizationId: context.organizationId,
        publicId: input.publicId ?? randomUUID(),
      })
      .returning();

    if (!collection) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create collection",
      });
    }

    return {
      createdAt: collection.createdAt,
      description: collection.description,
      id: collection.id,
      interactionCount: 0,
      isPublic: collection.isPublic,
      metadata: collection.metadata,
      minSimilarity: collection.minSimilarity,
      name: collection.name,
      publicId: collection.publicId,
      updatedAt: collection.updatedAt,
    };
  }),

  delete: organizationProcedure.input(deleteCollectionInput).handler(async ({ context, input }) => {
    const collection = await context.db.query.mockCollection.findFirst({
      where: and(
        eq(mockCollection.id, input.collectionId),
        eq(mockCollection.organizationId, context.organizationId),
      ),
    });

    if (!collection) {
      throw new ORPCError("NOT_FOUND", {
        message: "Collection not found",
      });
    }

    await context.db.delete(mockCollection).where(eq(mockCollection.id, collection.id));

    return { success: true } as const;
  }),

  list: organizationProcedure.handler(async ({ context }) => {
    const collections = await context.db.query.mockCollection.findMany({
      orderBy: (collection, { desc }) => [desc(collection.updatedAt)],
      where: eq(mockCollection.organizationId, context.organizationId),
      with: {
        interactions: {
          columns: { id: true },
        },
      },
    });

    return collections.map((collection) => ({
      createdAt: collection.createdAt,
      description: collection.description,
      id: collection.id,
      interactionCount: collection.interactions.length,
      isPublic: collection.isPublic,
      metadata: collection.metadata,
      minSimilarity: collection.minSimilarity,
      name: collection.name,
      publicId: collection.publicId,
      updatedAt: collection.updatedAt,
    }));
  }),

  update: organizationProcedure.input(updateCollectionInput).handler(async ({ context, input }) => {
    const collection = await context.db.query.mockCollection.findFirst({
      where: and(
        eq(mockCollection.id, input.collectionId),
        eq(mockCollection.organizationId, context.organizationId),
      ),
    });

    if (!collection) {
      throw new ORPCError("NOT_FOUND", {
        message: "Collection not found",
      });
    }

    const [updatedCollection] = await context.db
      .update(mockCollection)
      .set({
        // An explicit empty string clears the description; undefined leaves it unchanged
        description:
          input.description === undefined
            ? collection.description
            : input.description.trim() || null,
        isPublic: input.isPublic ?? collection.isPublic,
        metadata: input.metadata ?? collection.metadata,
        minSimilarity: input.minSimilarity ?? collection.minSimilarity,
        name: input.name ?? collection.name,
        updatedAt: new Date(),
      })
      .where(eq(mockCollection.id, collection.id))
      .returning();

    if (!updatedCollection) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to update collection",
      });
    }

    return {
      createdAt: updatedCollection.createdAt,
      description: updatedCollection.description,
      id: updatedCollection.id,
      isPublic: updatedCollection.isPublic,
      metadata: updatedCollection.metadata,
      minSimilarity: updatedCollection.minSimilarity,
      name: updatedCollection.name,
      publicId: updatedCollection.publicId,
      updatedAt: updatedCollection.updatedAt,
    };
  }),
};
