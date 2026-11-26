#!/usr/bin/env tsx

import { setTimeout as sleep } from "node:timers/promises";
import { eq } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { mockInteraction } from "@repo/db/drizzle-schema";

import { generateEmbedding } from "../src/interaction/embedding-service";

const BATCH_SIZE = 10;
const DELAY_MS = 500;

const main = async () => {
  console.log("Starting vector backfill...\n");

  const interactions = await db.select().from(mockInteraction);
  console.log(`Found ${interactions.length} interactions to process\n`);

  let successCount = 0;
  let errorCount = 0;

  const backfill = async (interaction: (typeof interactions)[number], index: number) => {
    try {
      console.log(`[${index + 1}/${interactions.length}] ${interaction.title}...`);

      const vector = await generateEmbedding(interaction.input);

      await db
        .update(mockInteraction)
        .set({
          updatedAt: new Date(),
          vector,
        })
        .where(eq(mockInteraction.id, interaction.id));

      successCount += 1;
      console.log(`   Done (${vector.length}d)`);
    } catch (error) {
      errorCount += 1;
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const backfillFrom: (index: number) => Promise<void> = async (index) => {
    const interaction = interactions[index];

    if (interaction === undefined) {
      return;
    }

    await backfill(interaction, index);

    const next = index + 1;
    const batchEnds = next % BATCH_SIZE === 0;

    if (batchEnds && next < interactions.length) {
      await sleep(DELAY_MS);
    }

    await backfillFrom(next);
  };

  await backfillFrom(0);

  console.log(`\n${"=".repeat(40)}`);
  console.log("Backfill complete");
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
};

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
}
