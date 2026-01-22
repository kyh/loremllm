#!/usr/bin/env tsx

/**
 * Backfill Vectors Script
 *
 * Regenerates embeddings for all interactions using OpenAI text-embedding-3-small.
 * Run after migrating from Transformers.js (384d) to OpenAI (1536d).
 *
 * Usage:
 *   pnpm -F api backfill-vectors
 */
import { eq, sql } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { mockInteraction } from "@repo/db/drizzle-schema";

import { generateEmbedding } from "../src/interaction/embedding-service";

const BATCH_SIZE = 10;
const DELAY_MS = 500; // Rate limit delay

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Starting vector backfill...\n");

  // Fetch all interactions
  const interactions = await db.select().from(mockInteraction);
  console.log(`Found ${interactions.length} interactions to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < interactions.length; i += BATCH_SIZE) {
    const batch = interactions.slice(i, i + BATCH_SIZE);

    for (const interaction of batch) {
      try {
        console.log(
          `[${i + 1}/${interactions.length}] ${interaction.title}...`,
        );

        const vector = await generateEmbedding(interaction.input);

        await db
          .update(mockInteraction)
          .set({
            vector,
            updatedAt: new Date(),
          })
          .where(eq(mockInteraction.id, interaction.id));

        successCount++;
        console.log(`   Done (${vector.length}d)`);
      } catch (error) {
        errorCount++;
        console.error(
          `   Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Rate limit delay between batches
    if (i + BATCH_SIZE < interactions.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\n" + "=".repeat(40));
  console.log("Backfill complete");
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
