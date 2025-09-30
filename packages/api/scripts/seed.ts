#!/usr/bin/env tsx

/**
 * Seed Demo Collection Script
 *
 * This script creates a user, organization, and a Demo collection with various interactions about LoremLLM.
 *
 * Usage:
 *   tsx packages/api/scripts/seed.ts
 */
import { randomUUID } from "crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@repo/db/drizzle-client";

import { auth } from "../src/auth/auth";
import { appRouter } from "../src/root-router";
import { createCallerFactory } from "../src/trpc";

// ESM compatibility: derive __dirname from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// User configuration
const USER_EMAIL = "im.kaiyu@gmail.com";
const USER_NAME = "Kaiyu Hsu";
const ORGANIZATION_NAME = "LoremLLM";
const ORGANIZATION_SLUG = "loremllm";

// Load interaction output from markdown files
async function loadInteractionOutput(filename: string): Promise<string> {
  const filePath = path.join(__dirname, "interactions", filename);
  return await fs.readFile(filePath, "utf-8");
}

// Demo interactions for LoremLLM
const DEMO_INTERACTION_CONFIGS = [
  {
    title: "Generic Greeting",
    description: "A friendly greeting to welcome users",
    input: "Hello",
    outputFile: "greeting.md",
  },
  {
    title: "What is LoremLLM",
    description: "Explains what LoremLLM is and its purpose",
    input: "What is LoremLLM?",
    outputFile: "what-is-loremllm.md",
  },
  {
    title: "Main Features",
    description: "Overview of LoremLLM's key features",
    input: "What are the main features?",
    outputFile: "main-features.md",
  },
  {
    title: "Pricing Information",
    description: "Details about LoremLLM pricing tiers",
    input: "How much does it cost?",
    outputFile: "pricing.md",
  },
  {
    title: "How to Get Started",
    description: "Guide for new users to start using LoremLLM",
    input: "How do I get started?",
    outputFile: "getting-started.md",
  },
  {
    title: "Common Use Cases",
    description: "Examples of how to use LoremLLM",
    input: "What can I use this for?",
    outputFile: "use-cases.md",
  },
  {
    title: "API Integration",
    description: "How to integrate LoremLLM with your application",
    input: "How do I integrate this with my app?",
    outputFile: "api-integration.md",
  },
  {
    title: "Semantic Search Explanation",
    description: "How semantic search works in LoremLLM",
    input: "How does the smart matching work?",
    outputFile: "semantic-search.md",
  },
  {
    title: "Common Issues",
    description: "Troubleshooting common problems",
    input: "My endpoint isn't working",
    outputFile: "troubleshooting.md",
  },
  {
    title: "vs Real LLMs",
    description: "When to use LoremLLM vs real LLM APIs",
    input: "Should I use this instead of OpenAI?",
    outputFile: "vs-real-llms.md",
  },
  {
    title: "Support Options",
    description: "How to get help and support",
    input: "How can I get help?",
    outputFile: "support.md",
  },
];

async function main() {
  console.log("🚀 Starting Demo Collection Seed\n");
  console.log(`👤 User Email: ${USER_EMAIL}`);
  console.log(`🏢 Organization: ${ORGANIZATION_NAME}`);
  console.log(
    `📝 Interactions to create: ${DEMO_INTERACTION_CONFIGS.length}\n`,
  );

  try {
    // Step 1: Create or get user using better-auth API
    console.log("👤 Creating/finding user...");
    let userId: string;

    const existingUser = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.email, USER_EMAIL),
    });

    if (existingUser) {
      console.log(`   ✅ User already exists: ${existingUser.email}`);
      userId = existingUser.id;
    } else {
      // Use better-auth admin API to create user
      const { data: newUser, error: userError } = await (
        auth.api as any
      ).createUser({
        body: {
          email: USER_EMAIL,
          name: USER_NAME,
          password: randomUUID(), // Random password for seed user
          emailVerified: true,
        },
      });

      if (userError || !newUser) {
        throw new Error(
          `Failed to create user: ${userError?.message ?? "Unknown error"}`,
        );
      }

      userId = newUser.id;
      console.log(`   ✅ User created: ${USER_EMAIL}`);
      console.log(
        `   ℹ️  Personal organization created automatically by better-auth`,
      );
    }

    // Step 2: Create or get demo organization using better-auth API
    console.log("\n🏢 Creating/finding organization...");
    let organizationId: string;

    const existingOrg = await db.query.organization.findFirst({
      where: (orgs, { eq }) => eq(orgs.slug, ORGANIZATION_SLUG),
    });

    if (existingOrg) {
      console.log(`   ✅ Organization already exists: ${existingOrg.name}`);
      organizationId = existingOrg.id;
    } else {
      // Use better-auth organization API to create organization
      const { data: newOrg, error: orgError } = await (
        auth.api as any
      ).createOrganization({
        body: {
          userId,
          name: ORGANIZATION_NAME,
          slug: ORGANIZATION_SLUG,
          metadata: {
            demo: true,
          },
        },
      });

      if (orgError || !newOrg) {
        throw new Error(
          `Failed to create organization: ${orgError?.message ?? "Unknown error"}`,
        );
      }

      organizationId = newOrg.id;
      console.log(`   ✅ Organization created: ${ORGANIZATION_NAME}`);
      console.log(`   ✅ User added as owner automatically`);
    }

    // Step 3: Create a session context for tRPC calls
    const createCallerContext = async () => ({
      session: {
        user: {
          id: userId,
          name: USER_NAME,
          email: USER_EMAIL,
          emailVerified: true,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          activeOrganizationId: organizationId,
        },
        session: {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          userId,
          activeOrganizationId: organizationId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
          token: randomUUID(),
          ipAddress: null,
          userAgent: null,
        },
      },
      db,
    });

    // Create the tRPC caller
    const callerFactory = createCallerFactory(appRouter);
    // @ts-expect-error - Script context doesn't need full better-auth session structure
    const caller = callerFactory(createCallerContext);

    // Step 4: Create or get the Demo collection
    console.log("\n📦 Creating/finding 'Demo' collection...");
    let collection;
    let existingInteractions: Array<{ input: string; id: string }> = [];

    // Try to find existing collection by publicId
    const allCollections = await caller.mock.collection.list();
    const existingCollection = allCollections.find(
      (col) => col.publicId === "demo",
    );

    if (existingCollection) {
      // Get full collection with interactions
      const fullCollection = await caller.mock.collection.byId({
        collectionId: existingCollection.id,
      });
      collection = fullCollection;
      existingInteractions = fullCollection.interactions;

      console.log(`   ✅ Collection already exists: ${collection.name}`);
      console.log(`   ID: ${collection.id}`);
      console.log(`   Public ID: ${collection.publicId}`);
      console.log(`   Existing interactions: ${existingInteractions.length}\n`);
    } else {
      // Collection doesn't exist, create it
      collection = await caller.mock.collection.create({
        publicId: "demo",
        name: "Demo",
        description:
          "Demo collection showcasing LoremLLM capabilities with common questions and answers about the platform",
        isPublic: true,
        metadata: {
          category: "demo",
          tags: ["faq", "getting-started", "pricing", "features"],
          createdBy: "seed script",
        },
      });

      console.log(`   ✅ Collection created successfully!`);
      console.log(`   ID: ${collection.id}`);
      console.log(`   Public ID: ${collection.publicId}`);
      console.log(`   Name: ${collection.name}\n`);
    }

    // Step 5: Load and create interactions (idempotent)
    console.log("💬 Creating/updating interactions...\n");

    // Create a map of existing interactions by input
    const existingInteractionMap = new Map(
      existingInteractions.map((interaction) => [
        interaction.input,
        interaction,
      ]),
    );

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [index, config] of DEMO_INTERACTION_CONFIGS.entries()) {
      try {
        // Check if interaction with this input already exists
        const existingInteraction = existingInteractionMap.get(config.input);

        if (existingInteraction) {
          skippedCount++;
          console.log(
            `   ⏭️  [${index + 1}/${DEMO_INTERACTION_CONFIGS.length}] ${config.title} (already exists)`,
          );
          continue;
        }

        // Load output from markdown file
        const output = await loadInteractionOutput(config.outputFile);

        const interaction = await caller.mock.interaction.create({
          collectionId: collection.id,
          title: config.title,
          description: config.description,
          input: config.input,
          output,
        });

        successCount++;
        console.log(
          `   ✅ [${index + 1}/${DEMO_INTERACTION_CONFIGS.length}] ${interaction.title}`,
        );
      } catch (error) {
        errorCount++;
        console.error(
          `   ❌ [${index + 1}/${DEMO_INTERACTION_CONFIGS.length}] Failed to create: ${config.title}`,
        );
        console.error(
          `      Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Summary");
    console.log("=".repeat(50));
    console.log(`👤 User: ${USER_EMAIL}`);
    console.log(`🏢 Organization: ${ORGANIZATION_NAME} (${organizationId})`);
    console.log(`✅ Successfully created: ${successCount} interactions`);
    if (skippedCount > 0) {
      console.log(`⏭️  Skipped (already exist): ${skippedCount} interactions`);
    }
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount} interactions`);
    }
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
}

// Run the script
main()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
