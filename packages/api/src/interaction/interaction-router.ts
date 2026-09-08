import { and, eq, sql } from "@repo/db";
import { mockCollection, mockInteraction } from "@repo/db/drizzle-schema";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { organizationProcedure, publicProcedure } from "../orpc";
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
  collectionId: mockInteraction.collectionId,
  createdAt: mockInteraction.createdAt,
  description: mockInteraction.description,
  id: mockInteraction.id,
  input: mockInteraction.input,
  output: mockInteraction.output,
  responseSchema: mockInteraction.responseSchema,
  title: mockInteraction.title,
  updatedAt: mockInteraction.updatedAt,
};

/** Shape of rows returned by the raw vector-similarity SQL query */
const interactionQueryRow = z.object({
  description: z.string().nullable(),
  id: z.string(),
  input: z.string(),
  output: z.string(),
  response_schema: z.string(),
  similarity: z.number(),
  title: z.string().nullable(),
});

const embedOrThrow = async (text: string, subject: string) => {
  try {
    return await generateEmbedding(text);
  } catch (error) {
    console.error(`Failed to generate ${subject} embedding:`, error);
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `Failed to generate embedding for ${subject}`,
    });
  }
};

const asPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const interactionRouter = {
  create: organizationProcedure
    .input(createInteractionInput)
    .handler(async ({ context, input }) => {
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

      const embedding = await embedOrThrow(
        buildEmbeddingText({
          description: input.description,
          input: input.input,
          title: input.title,
        }),
        "interaction input",
      );

      const now = new Date();

      return context.db.transaction(async (tx) => {
        const [interaction] = await tx
          .insert(mockInteraction)
          .values({
            collectionId: collection.id,
            description: input.description ?? null,
            input: input.input,
            output: input.output,
            responseSchema: "LanguageModelV2StreamPart",
            title: input.title ?? "Untitled Interaction",
            vector: sql`vector32(${JSON.stringify(embedding)})`,
          })
          .returning(interactionReturning);

        if (!interaction) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to create interaction",
          });
        }

        await tx
          .update(mockCollection)
          .set({ updatedAt: now })
          .where(eq(mockCollection.id, collection.id));

        return interaction;
      });
    }),

  delete: organizationProcedure
    .input(deleteInteractionInput)
    .handler(async ({ context, input }) => {
      const interaction = await context.db.query.mockInteraction.findFirst({
        where: eq(mockInteraction.id, input.interactionId),
        with: {
          collection: true,
        },
      });

      if (!interaction || interaction.collection?.organizationId !== context.organizationId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Interaction not found",
        });
      }

      await context.db.delete(mockInteraction).where(eq(mockInteraction.id, interaction.id));

      return { success: true } as const;
    }),

  /**
   * Query endpoint for searching interactions in a collection.
   * Uses vector similarity search to find the best matching interaction.
   *
   * Public collections are queryable by anyone. Private collections are only
   * queryable by members of the owning organization (for dashboard previews).
   */
  query: publicProcedure.input(queryInteractionInput).handler(async ({ context, input }) => {
    // Find the collection by publicId
    const collection = await context.db.query.mockCollection.findFirst({
      where: eq(mockCollection.publicId, input.publicId),
    });

    if (!collection) {
      throw new ORPCError("NOT_FOUND", {
        message: "Collection not found",
      });
    }

    if (!collection.isPublic) {
      const activeOrganizationId = context.session?.session.activeOrganizationId;

      if (activeOrganizationId !== collection.organizationId) {
        throw new ORPCError("FORBIDDEN", {
          message: "This collection is not public",
        });
      }
    }

    const queryEmbedding = await embedOrThrow(input.query, "query");

    // Use Turso's vector_distance_cos function to find similar interactions.
    // Cosine distance is lower-is-better, so order ascending and report
    // similarity as 1 - distance.
    const resultSet = await context.db.run(sql`
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
      throw new ORPCError("NOT_FOUND", {
        message: "No interactions found in this collection",
      });
    }

    const results = rows.filter((row) => row.similarity >= collection.minSimilarity);

    if (results.length === 0) {
      const [best] = rows;

      throw new ORPCError("NOT_FOUND", {
        message: best
          ? `No interaction matched above the similarity threshold (${asPercent(collection.minSimilarity)}). Best match: "${best.title ?? "Untitled"}" at ${asPercent(best.similarity)}.`
          : `No interaction matched above the similarity threshold (${asPercent(collection.minSimilarity)}).`,
      });
    }

    return {
      collectionId: collection.id,
      collectionName: collection.name,
      matches: results.map((result) => ({
        description: result.description,
        id: result.id,
        input: result.input,
        output: result.output,
        responseSchema: result.response_schema,
        similarity: result.similarity,
        title: result.title,
      })),
    };
  }),

  update: organizationProcedure
    .input(updateInteractionInput)
    .handler(async ({ context, input }) => {
      const interaction = await context.db.query.mockInteraction.findFirst({
        where: eq(mockInteraction.id, input.interactionId),
        with: {
          collection: true,
        },
      });

      const collection = interaction?.collection;

      if (!interaction || !collection || collection.organizationId !== context.organizationId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Interaction not found",
        });
      }

      const title = input.title ?? interaction.title;
      // An explicit empty string clears the description; undefined leaves it unchanged
      const description =
        input.description === undefined
          ? interaction.description
          : input.description.trim() || null;
      const matchInput = input.input ?? interaction.input;
      const output = input.output ?? interaction.output;

      const matchingTextChanged =
        title !== interaction.title ||
        description !== interaction.description ||
        matchInput !== interaction.input;

      const embedding = matchingTextChanged
        ? await embedOrThrow(
            buildEmbeddingText({ description, input: matchInput, title }),
            "interaction input",
          )
        : null;

      const now = new Date();

      const fieldUpdates = {
        description,
        input: matchInput,
        output,
        title,
        updatedAt: now,
      };

      return context.db.transaction(async (tx) => {
        const [updatedInteraction] = await tx
          .update(mockInteraction)
          .set(
            embedding
              ? { ...fieldUpdates, vector: sql`vector32(${JSON.stringify(embedding)})` }
              : fieldUpdates,
          )
          .where(eq(mockInteraction.id, interaction.id))
          .returning(interactionReturning);

        if (!updatedInteraction) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to update interaction",
          });
        }

        await tx
          .update(mockCollection)
          .set({ updatedAt: now })
          .where(eq(mockCollection.id, collection.id));

        return updatedInteraction;
      });
    }),
};
