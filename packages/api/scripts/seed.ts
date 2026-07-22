#!/usr/bin/env tsx

/**
 * Seed Demo Collection Script
 *
 * Creates the local dev account and a public "Demo" collection populated with
 * interactions about LoremLLM, so an agent or a fresh clone has a known login
 * and real data to verify against instead of an empty schema.
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   pnpm db:seed
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "@repo/db/drizzle-client";

import { auth } from "../src/auth/auth";
import { env } from "../src/env";
import { appRouter } from "../src/root-router";
import { createCallerFactory } from "../src/trpc";

// ESM compatibility: derive the script directory from import.meta.url
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// A local-only account. `.local` is reserved for local use and never resolves,
// so this address cannot collide with a real inbox. The password is documented
// in AGENTS.md; override it for `seed:remote`.
const USER_EMAIL = "dev@loremllm.local";
const USER_NAME = "Dev";
const USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "password";

const COLLECTION_PUBLIC_ID = "demo";

// Load interaction output from markdown files
async function loadInteractionOutput(filename: string): Promise<string> {
  const filePath = path.join(scriptDir, "interactions", filename);
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

/**
 * Returns the dev user's id, creating the account if it does not exist.
 *
 * Signup goes through `auth.api.signUpEmail` rather than a raw insert so the
 * `databaseHooks.user.create.after` hook runs and provisions the personal
 * organization exactly as it would in production.
 */
async function ensureUser(): Promise<string> {
  const existingUser = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.email, USER_EMAIL),
  });

  if (existingUser) {
    console.log(`   ✅ User already exists: ${existingUser.email}`);
    return existingUser.id;
  }

  const { user } = await auth.api.signUpEmail({
    body: {
      email: USER_EMAIL,
      name: USER_NAME,
      password: USER_PASSWORD,
    },
  });

  console.log(`   ✅ User created: ${USER_EMAIL}`);
  console.log(`   🔑 Password: ${USER_PASSWORD}`);
  console.log(`   ℹ️  Personal organization provisioned by the signup hook`);

  return user.id;
}

/**
 * The organization the dashboard opens on: the first membership, which is what
 * `setActiveOrganization` puts on every new session.
 */
async function resolveOrganizationId(userId: string): Promise<string> {
  const membership = await db.query.member.findFirst({
    where: (member, { eq }) => eq(member.userId, userId),
  });

  if (!membership) {
    throw new Error(
      `No organization found for ${USER_EMAIL}. The signup hook that creates the personal organization did not run — check packages/api/src/auth/auth.ts.`,
    );
  }

  return membership.organizationId;
}

async function main() {
  console.log("🚀 Starting Demo Collection Seed\n");
  console.log(`👤 User Email: ${USER_EMAIL}`);
  console.log(`📝 Interactions to create: ${DEMO_INTERACTION_CONFIGS.length}\n`);

  try {
    // Step 1: Create or find the dev user
    console.log("👤 Creating/finding user...");
    const userId = await ensureUser();

    // Step 2: Resolve the personal organization the seeded data belongs to
    const organizationId = await resolveOrganizationId(userId);
    const org = await db.query.organization.findFirst({
      where: (organization, { eq }) => eq(organization.id, organizationId),
    });
    console.log(`\n🏢 Organization: ${org?.name ?? organizationId}`);

    // Step 3: Create a session context for tRPC calls
    const createCallerContext = async () => ({
      session: {
        user: {
          id: userId,
          name: USER_NAME,
          email: USER_EMAIL,
          emailVerified: true,
          image: null,
          banned: null,
          createdAt: new Date(),
          updatedAt: new Date(),
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
      // Not a browser request, so there is no provenance for the tRPC origin
      // guard to check.
      origin: null,
      secFetchSite: null,
    });

    const callerFactory = createCallerFactory(appRouter);
    const caller = callerFactory(createCallerContext);

    // Step 4: Create or find the Demo collection. publicId is globally unique,
    // so look it up directly rather than through the org-scoped list.
    console.log(`\n📦 Creating/finding '${COLLECTION_PUBLIC_ID}' collection...`);
    const existingCollection = await db.query.mockCollection.findFirst({
      where: (collection, { eq }) => eq(collection.publicId, COLLECTION_PUBLIC_ID),
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
        publicId: COLLECTION_PUBLIC_ID,
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

    // Step 5: Load and create interactions (idempotent).
    //
    // Every interaction is embedded through the AI Gateway on write, so this
    // step needs a key and a network. Without one the login and the collection
    // above are still usable, which is enough to verify most flows — so warn
    // and stop rather than failing eleven times over.
    if (!env.AI_GATEWAY_API_KEY) {
      console.log("⚠️  AI_GATEWAY_API_KEY is not set — skipping interactions.");
      console.log("   Creating an interaction embeds its input via the AI Gateway.");
      console.log("   Set the key in .env and re-run `pnpm db:seed` to populate them.\n");
    } else {
      console.log("💬 Creating/updating interactions...\n");

      const existingInteractionMap = new Map(
        existingInteractions.map((interaction) => [interaction.input, interaction]),
      );

      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const [index, config] of DEMO_INTERACTION_CONFIGS.entries()) {
        const label = `[${index + 1}/${DEMO_INTERACTION_CONFIGS.length}]`;

        try {
          if (existingInteractionMap.has(config.input)) {
            skippedCount++;
            console.log(`   ⏭️  ${label} ${config.title} (already exists)`);
            continue;
          }

          const output = await loadInteractionOutput(config.outputFile);

          const interaction = await caller.interaction.create({
            collectionId: collection.id,
            title: config.title,
            description: config.description,
            input: config.input,
            output,
          });

          successCount++;
          console.log(`   ✅ ${label} ${interaction.title}`);
        } catch (error) {
          errorCount++;
          console.error(`   ❌ ${label} Failed to create: ${config.title}`);
          console.error(`      Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log("\n" + "=".repeat(50));
      console.log("📊 Summary");
      console.log("=".repeat(50));
      console.log(`✅ Successfully created: ${successCount} interactions`);
      if (skippedCount > 0) {
        console.log(`⏭️  Skipped (already exist): ${skippedCount} interactions`);
      }
      if (errorCount > 0) {
        console.log(`❌ Failed: ${errorCount} interactions`);
      }
    }

    console.log(`\n👤 Login: ${USER_EMAIL} / ${USER_PASSWORD}`);
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
