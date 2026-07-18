import type { User } from "better-auth";
import { eq } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { user as userSchema } from "@repo/db/drizzle-schema-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, oAuthProxy, organization } from "better-auth/plugins";

import { FALLBACK_ORGANIZATION_SLUG, slugify } from "./utils";

export const baseUrl =
  process.env.VERCEL_ENV === "production"
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_ENV === "preview"
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT ?? 3000}`;

// Origins allowed to drive authenticated requests. Consumed by better-auth's own
// Origin checks and by the tRPC mutation guard (see packages/api/src/trpc.ts).
export const trustedOrigins = [baseUrl];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  baseURL: baseUrl,
  plugins: [
    oAuthProxy({
      currentURL: baseUrl,
      productionURL: `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "loremllm.com"}`,
    }),
    organization(),
    admin(),
  ],
  trustedOrigins,
  // Persist rate-limit counters in the database. The default in-memory store
  // keeps per-instance counters, so on serverless (Vercel) the effective limit
  // multiplies across cold-started instances and resets on every deploy. 10
  // requests/60s per IP throttles credential-stuffing against the auth routes.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 10,
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      redirectURI: `${baseUrl}/api/auth/callback/github`,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createDefaultOrganization(user);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          return await setActiveOrganization(session);
        },
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];

/**
 * Creates a default personal organization for a new user
 * Generates a unique slug and creates the organization
 * If organization creation fails, the user is deleted to maintain data consistency
 * @param user - The user object for whom to create the organization
 * @throws Error if organization creation fails
 */
const createDefaultOrganization = async (user: User) => {
  /**
   * Generates an available organization slug by checking for conflicts
   * Recursively adds numbers to the slug until a unique one is found
   * @param slug - The base slug to check
   * @param attempt - The current attempt number for uniqueness
   * @returns Promise<string> - A unique, available slug
   */
  const generateAvailableSlug = async (slug: string, attempt = 0) => {
    const org = await db.query.organization.findFirst({
      where: (organization, { eq }) => eq(organization.slug, slug),
    });
    if (org) {
      return generateAvailableSlug(slug + `-${attempt + 1}`, attempt + 1);
    }
    return slug;
  };

  // A name in a script with no ASCII base ("李明") slugifies to "", which would
  // create an organization at the unroutable /dashboard/. Signup has no user to
  // prompt, so fall back to a generic base and let them rename it later.
  const slug = await generateAvailableSlug(slugify(user.name) || FALLBACK_ORGANIZATION_SLUG);

  try {
    await auth.api.createOrganization({
      body: {
        userId: user.id,
        name: "Personal Organization",
        slug,
        metadata: {
          personal: true,
        },
      },
    });
  } catch (err) {
    // If organization creation fails, delete the user to maintain data consistency
    await db.delete(userSchema).where(eq(userSchema.id, user.id));
    throw err;
  }
};

/**
 * Sets the active organization for a user session
 * Finds the first organization the user is a member of and sets it as active
 * @param session - The session object containing the user ID
 * @returns Promise<object> - Session data with activeOrganizationId set
 */
const setActiveOrganization = async (session: { userId: string }) => {
  const firstOrg = await db.query.member.findFirst({
    where: (member, { eq }) => eq(member.userId, session.userId),
  });

  return {
    data: {
      ...session,
      activeOrganizationId: firstOrg?.organizationId,
    },
  };
};
