import { eq, sql } from "@repo/db";
import { mockCollection, mockInteraction } from "@repo/db/drizzle-schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, organizationProcedure, publicProcedure } from "../trpc";
import { generateEmbedding } from "./embedding-service";
import {
  createInteractionInput,
  deleteInteractionInput,
  queryInteractionInput,
  updateInteractionInput,
} from "./interaction-schema";

/**
 * The text embedded for semantic matching. Title and description provide
 * additional context beyond the raw input.
 */
const buildEmbeddingText = (interaction: {
  title?: string | null;
  description?: string | null;
  input: string;
}) => `${interaction.title ?? ""} ${interaction.description ?? ""} ${interaction.input}`;

/**
 * Columns returned from interaction writes. The `vector` blob is excluded —
 * libsql cannot serialize BLOB values in RETURNING clauses.
 */
const interactionReturning = {
  id: mockInteraction.id,
  collectionId: mockInteraction.collectionId,
  title: mockInteraction.title,
  description: mockInteraction.description,
  input: mockInteraction.input,
  output: mockInteraction.output,
  responseSchema: mockInteraction.responseSchema,
  createdAt: mockInteraction.createdAt,
  updatedAt: mockInteraction.updatedAt,
};

/** Shape of rows returned by the raw vector-similarity SQL query */
const interactionQueryRow = z.object({
  id: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  input: z.string(),
  output: z.string(),
  response_schema: z.string(),
  similarity: z.number(),
});

const embedOrThrow = async (text: string) => {
  try {
    return await generateEmbedding(text);
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate embedding for interaction input",
    });
  }
};

export const interactionRouter = createTRPCRouter({
  create: organizationProcedure.input(createInteractionInput).mutation(async ({ ctx, input }) => {
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

    const embedding = await embedOrThrow(
      buildEmbeddingText({
        title: input.title,
        description: input.description,
        input: input.input,
      }),
    );

    const now = new Date();

    const result = await ctx.db.transaction(async (tx) => {
      const [interaction] = await tx
        .insert(mockInteraction)
        .values({
          collectionId: collection.id,
          title: input.title ?? "Untitled Interaction",
          description: input.description ?? null,
          input: input.input,
          vector: sql`vector32(${JSON.stringify(embedding)})`,
          output: input.output,
          responseSchema: "LanguageModelV2StreamPart",
        })
        .returning(interactionReturning);

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

  update: organizationProcedure.input(updateInteractionInput).mutation(async ({ ctx, input }) => {
    const interaction = await ctx.db.query.mockInteraction.findFirst({
      where: (interaction, { eq }) => eq(interaction.id, input.interactionId),
      with: {
        collection: true,
      },
    });

    const collection = interaction?.collection;

    if (!interaction || !collection || collection.organizationId !== ctx.organizationId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Interaction not found",
      });
    }

    const title = input.title ?? interaction.title;
    // An explicit empty string clears the description; undefined leaves it unchanged
    const description =
      input.description === undefined ? interaction.description : input.description.trim() || null;
    const matchInput = input.input ?? interaction.input;
    const output = input.output ?? interaction.output;

    const matchingTextChanged =
      title !== interaction.title ||
      description !== interaction.description ||
      matchInput !== interaction.input;

    const embedding = matchingTextChanged
      ? await embedOrThrow(buildEmbeddingText({ title, description, input: matchInput }))
      : null;

    const now = new Date();

    const result = await ctx.db.transaction(async (tx) => {
      const [updatedInteraction] = await tx
        .update(mockInteraction)
        .set({
          title,
          description,
          input: matchInput,
          output,
          ...(embedding ? { vector: sql`vector32(${JSON.stringify(embedding)})` } : {}),
          updatedAt: now,
        })
        .where(eq(mockInteraction.id, interaction.id))
        .returning(interactionReturning);

      if (!updatedInteraction) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update interaction",
        });
      }

      await tx
        .update(mockCollection)
        .set({ updatedAt: now })
        .where(eq(mockCollection.id, collection.id));

      return updatedInteraction;
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

  delete: organizationProcedure.input(deleteInteractionInput).mutation(async ({ ctx, input }) => {
    const interaction = await ctx.db.query.mockInteraction.findFirst({
      where: (interaction, { eq }) => eq(interaction.id, input.interactionId),
      with: {
        collection: true,
      },
    });

    if (!interaction || interaction.collection?.organizationId !== ctx.organizationId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Interaction not found",
      });
    }

    await ctx.db.delete(mockInteraction).where(eq(mockInteraction.id, interaction.id));

    return { success: true } as const;
  }),

  /**
   * Query endpoint for searching interactions in a collection.
   * Uses vector similarity search to find the best matching interaction.
   *
   * Public collections are queryable by anyone. Private collections are only
   * queryable by members of the owning organization (for dashboard previews).
   */
  query: publicProcedure.input(queryInteractionInput).query(async ({ ctx, input }) => {
    // Find the collection by publicId
    const collection = await ctx.db.query.mockCollection.findFirst({
      where: (collection, { eq }) => eq(collection.publicId, input.publicId),
    });

    if (!collection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Collection not found",
      });
    }

    if (!collection.isPublic) {
      const activeOrganizationId = ctx.session?.session.activeOrganizationId;

      if (activeOrganizationId !== collection.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This collection is not public",
        });
      }
    }

    // Generate embedding for the query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateEmbedding(input.query);
    } catch (error) {
      console.error("Failed to generate query embedding:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate embedding for query",
      });
    }

    // Use Turso's vector_distance_cos function to find similar interactions.
    // Cosine distance is lower-is-better, so order ascending and report
    // similarity as 1 - distance.
    const resultSet = await ctx.db.run(sql`
        SELECT
          id,
          title,
          description,
          input,
          output,
          response_schema,
          1 - vector_distance_cos(vector, vector32(${JSON.stringify(queryEmbedding)})) as similarity
        FROM mock_interaction
        WHERE collection_id = ${collection.id}
          AND vector IS NOT NULL
        ORDER BY vector_distance_cos(vector, vector32(${JSON.stringify(queryEmbedding)}))
        LIMIT ${input.limit ?? 1}
      `);

    const rows = z.array(interactionQueryRow).parse(resultSet.rows);

    if (rows.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No interactions found in this collection",
      });
    }

    const results = rows.filter((row) => row.similarity >= collection.minSimilarity);

    if (results.length === 0) {
      const best = rows[0];
      const asPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

      throw new TRPCError({
        code: "NOT_FOUND",
        message: best
          ? `No interaction matched above the similarity threshold (${asPercent(collection.minSimilarity)}). Best match: "${best.title ?? "Untitled"}" at ${asPercent(best.similarity)}.`
          : `No interaction matched above the similarity threshold (${asPercent(collection.minSimilarity)}).`,
      });
    }

    return {
      collectionId: collection.id,
      collectionName: collection.name,
      matches: results.map((result) => ({
        id: result.id,
        title: result.title,
        description: result.description,
        input: result.input,
        output: result.output,
        responseSchema: result.response_schema,
        similarity: result.similarity,
      })),
    };
  }),
});
