#!/usr/bin/env tsx

import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@repo/db/drizzle-client";

import { createRouterClient } from "@orpc/server";

import { signInWithCode } from "../src/auth/sign-in-code";
import { env } from "../src/env";
import { appRouter } from "../src/root-router";

const scriptDir = import.meta.dirname;

const USER_EMAIL = "dev@loremllm.local";
const USER_NAME = "Dev";

const COLLECTION_PUBLIC_ID = "demo";

const loadInteractionOutput = async (filename: string) =>
  await fs.readFile(path.join(scriptDir, "interactions", filename), "utf-8");

const DEMO_INTERACTION_CONFIGS = [
  {
    description: "A friendly greeting to welcome users",
    input: "Hello",
    outputFile: "greeting.md",
    title: "Generic Greeting",
  },
  {
    description: "Explains what LoremLLM is and its purpose",
    input: "What is LoremLLM?",
    outputFile: "what-is-loremllm.md",
    title: "What is LoremLLM",
  },
  {
    description: "Overview of LoremLLM's key features",
    input: "What are the main features?",
    outputFile: "main-features.md",
    title: "Main Features",
  },
  {
    description: "Details about LoremLLM pricing tiers",
    input: "How much does it cost?",
    outputFile: "pricing.md",
    title: "Pricing Information",
  },
  {
    description: "Guide for new users to start using LoremLLM",
    input: "How do I get started?",
    outputFile: "getting-started.md",
    title: "How to Get Started",
  },
  {
    description: "Examples of how to use LoremLLM",
    input: "What can I use this for?",
    outputFile: "use-cases.md",
    title: "Common Use Cases",
  },
  {
    description: "How to integrate LoremLLM with your application",
    input: "How do I integrate this with my app?",
    outputFile: "api-integration.md",
    title: "API Integration",
  },
  {
    description: "How semantic search works in LoremLLM",
    input: "How does the smart matching work?",
    outputFile: "semantic-search.md",
    title: "Semantic Search Explanation",
  },
  {
    description: "Troubleshooting common problems",
    input: "My endpoint isn't working",
    outputFile: "troubleshooting.md",
    title: "Common Issues",
  },
  {
    description: "When to use LoremLLM vs real LLM APIs",
    input: "Should I use this instead of OpenAI?",
    outputFile: "vs-real-llms.md",
    title: "vs Real LLMs",
  },
  {
    description: "How to get help and support",
    input: "How can I get help?",
    outputFile: "support.md",
    title: "Support Options",
  },
];

const ensureUser = async () => {
  const existingUser = await db.query.user.findFirst({
    where: { email: USER_EMAIL },
  });

  if (existingUser) {
    console.log(`   ✅ User already exists: ${existingUser.email}`);

    return existingUser.id;
  }

  const { user } = await signInWithCode(USER_EMAIL, USER_NAME);

  console.log(`   ✅ User created: ${USER_EMAIL}`);
  console.log("   🔑 Sign in with a code: pnpm sign-in-code");
  console.log(`   ℹ️  Personal organization provisioned by the signup hook`);

  return user.id;
};

const resolveOrganizationId = async (userId: string) => {
  const membership = await db.query.member.findFirst({
    where: { userId },
  });

  if (!membership) {
    throw new Error(
      `No organization found for ${USER_EMAIL}. The signup hook that creates the personal organization did not run — check packages/service/src/auth/auth.ts.`,
    );
  }

  return membership.organizationId;
};

const main = async () => {
  console.log("🚀 Starting Demo Collection Seed\n");
  console.log(`👤 User Email: ${USER_EMAIL}`);
  console.log(`📝 Interactions to create: ${DEMO_INTERACTION_CONFIGS.length}\n`);

  try {
    console.log("👤 Creating/finding user...");
    const userId = await ensureUser();

    const organizationId = await resolveOrganizationId(userId);

    const org = await db.query.organization.findFirst({
      where: { id: organizationId },
    });

    console.log(`\n🏢 Organization: ${org?.name ?? organizationId}`);

    const createCallerContext = () => ({
      db,
      session: {
        session: {
          activeOrganizationId: organizationId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          id: randomUUID(),
          ipAddress: null,
          token: randomUUID(),
          updatedAt: new Date(),
          userAgent: null,
          userId,
        },
        user: {
          banned: null,
          createdAt: new Date(),
          email: USER_EMAIL,
          emailVerified: true,
          id: userId,
          image: null,
          name: USER_NAME,
          updatedAt: new Date(),
        },
      },
    });

    const caller = createRouterClient(appRouter, { context: createCallerContext });

    console.log(`\n📦 Creating/finding '${COLLECTION_PUBLIC_ID}' collection...`);

    const existingCollection = await db.query.mockCollection.findFirst({
      where: { publicId: COLLECTION_PUBLIC_ID },
    });

    if (existingCollection && existingCollection.organizationId !== organizationId) {
      throw new Error(
        `A '${COLLECTION_PUBLIC_ID}' collection already exists in a different organization. Reset the local database (see AGENTS.md) and re-run.`,
      );
    }

    let collection;
    let existingInteractions: { input: string; id: string }[] = [];

    if (existingCollection) {
      const fullCollection = await caller.collection.byId({
        collectionId: existingCollection.id,
      });

      collection = fullCollection;
      existingInteractions = fullCollection.interactions;

      console.log(`   ✅ Collection already exists: ${collection.name}`);
      console.log(`   ID: ${collection.id}`);
      console.log(`   Public ID: ${collection.publicId}`);
      console.log(`   Existing interactions: ${existingInteractions.length}\n`);
    } else {
      collection = await caller.collection.create({
        description:
          "Demo collection showcasing LoremLLM capabilities with common questions and answers about the platform",
        isPublic: true,
        metadata: {
          category: "demo",
          createdBy: "seed script",
          tags: ["faq", "getting-started", "pricing", "features"],
        },
        name: "Demo",
        publicId: COLLECTION_PUBLIC_ID,
      });

      console.log(`   ✅ Collection created successfully!`);
      console.log(`   ID: ${collection.id}`);
      console.log(`   Public ID: ${collection.publicId}`);
      console.log(`   Name: ${collection.name}\n`);
    }

    if (env.AI_GATEWAY_API_KEY !== undefined && env.AI_GATEWAY_API_KEY !== "") {
      console.log("💬 Creating/updating interactions...\n");

      const existingInteractionMap = new Map(
        existingInteractions.map((interaction) => [interaction.input, interaction]),
      );

      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      const seedInteraction = async (
        config: (typeof DEMO_INTERACTION_CONFIGS)[number],
        index: number,
      ) => {
        const label = `[${index + 1}/${DEMO_INTERACTION_CONFIGS.length}]`;

        try {
          if (existingInteractionMap.has(config.input)) {
            skippedCount += 1;
            console.log(`   ⏭️  ${label} ${config.title} (already exists)`);

            return;
          }

          const output = await loadInteractionOutput(config.outputFile);

          const interaction = await caller.interaction.create({
            collectionId: collection.id,
            description: config.description,
            input: config.input,
            output,
            title: config.title,
          });

          successCount += 1;
          console.log(`   ✅ ${label} ${interaction.title}`);
        } catch (error) {
          errorCount += 1;
          console.error(`   ❌ ${label} Failed to create: ${config.title}`);
          console.error(`      Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      };

      const seedFrom: (index: number) => Promise<void> = async (index) => {
        const config = DEMO_INTERACTION_CONFIGS[index];

        if (config === undefined) {
          return;
        }

        await seedInteraction(config, index);
        await seedFrom(index + 1);
      };

      await seedFrom(0);

      console.log(`\n${"=".repeat(50)}`);
      console.log("📊 Summary");
      console.log("=".repeat(50));
      console.log(`✅ Successfully created: ${successCount} interactions`);

      if (skippedCount > 0) {
        console.log(`⏭️  Skipped (already exist): ${skippedCount} interactions`);
      }

      if (errorCount > 0) {
        console.log(`❌ Failed: ${errorCount} interactions`);
      }
    } else {
      console.log("⚠️  AI_GATEWAY_API_KEY is not set — skipping interactions.");
      console.log("   Creating an interaction embeds its input via the AI Gateway.");
      console.log("   Set the key in .env and re-run `pnpm db:seed` to populate them.\n");
    }

    console.log(`\n👤 Login: ${USER_EMAIL} (code from pnpm sign-in-code)`);
    console.log(`📦 Collection ID: ${collection.id}`);
    console.log(`🔗 Public ID: ${collection.publicId}`);
    console.log("\n🎉 Demo collection seed complete!");
  } catch (error) {
    console.error("\n❌ Fatal Error:", error);

    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }

    process.exit(1);
  }
};

try {
  await main();
  console.log("\n✨ Script completed successfully");
  process.exit(0);
} catch (error) {
  console.error("\n💥 Unhandled error:", error);
  process.exit(1);
}
