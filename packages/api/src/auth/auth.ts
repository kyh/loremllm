import type { User } from "better-auth";
import { eq } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { user as userSchema } from "@repo/db/drizzle-schema-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, genericOAuth, oAuthProxy, organization } from "better-auth/plugins";

import { env } from "../env";
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

// Set (to the local `emulate` server URL) in dev to exercise GitHub OAuth
// offline; drives the dev-only genericOAuth provider in `plugins` below.
// Unset in production.
const emulatorUrl = env.NEXT_PUBLIC_GITHUB_EMULATOR_URL;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  baseURL: baseUrl,
  plugins: [
    // Proxies the OAuth callback through the production deployment so preview
    // deployments can share one registered GitHub callback URL. Off the
    // platform (local dev) there is no production URL to proxy to — falling
    // back to baseUrl makes the plugin a no-op instead of rewriting the
    // callback to a host the local server can't receive.
    oAuthProxy({
      currentURL: baseUrl,
      productionURL: process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : baseUrl,
    }),
    organization(),
    admin(),
    // Dev-only: route GitHub OAuth to the local `emulate` server so the shipped
    // "Continue with Github" button works offline (agents and tests included);
    // production uses the real socialProviders.github below. The built-in github
    // provider has hardcoded endpoints, so the emulated flow rides on
    // genericOAuth — the signInWithGithub() client helper picks signIn.oauth2 to
    // match. Creds are local fixtures matching emulate.config.yaml, not secrets.
    ...(emulatorUrl
      ? [
          genericOAuth({
            config: [
              {
                providerId: "github",
                clientId: "loremllm-local-github",
                clientSecret: "loremllm-local-github-secret",
                authorizationUrl: `${emulatorUrl}/login/oauth/authorize`,
                tokenUrl: `${emulatorUrl}/login/oauth/access_token`,
                userInfoUrl: `${emulatorUrl}/user`,
              },
            ],
          }),
        ]
      : []),
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
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
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
