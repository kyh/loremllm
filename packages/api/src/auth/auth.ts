import type { User } from "better-auth";
import { eq } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { user as userSchema } from "@repo/db/drizzle-schema-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, genericOAuth, oAuthProxy, organization } from "better-auth/plugins";

import { env } from "../env";
import { FALLBACK_ORGANIZATION_SLUG, slugify } from "./utils";

const resolveBaseUrl = () => {
  if (process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

export const baseUrl = resolveBaseUrl();

// Origins allowed to drive authenticated requests, consumed by better-auth's
// own Origin checks — these cover /api/auth/* only. /api/orpc runs the
// equivalent check itself, in its route handler.
export const trustedOrigins = [baseUrl];

// Set (to the local `emulate` server URL) in dev to exercise GitHub OAuth
// offline; drives the dev-only genericOAuth provider in `plugins` below.
// Unset in production.
const emulatorUrl = env.NEXT_PUBLIC_GITHUB_EMULATOR_URL;

/**
 * Generates an available organization slug by checking for conflicts
 * Recursively adds numbers to the slug until a unique one is found
 * @param slug - The base slug to check
 * @param attempt - The current attempt number for uniqueness
 * @returns Promise<string> - A unique, available slug
 */
const generateAvailableSlug = async (slug: string, attempt = 0): Promise<string> => {
  const org = await db.query.organization.findFirst({
    where: { slug },
  });
  if (org) {
    return generateAvailableSlug(`${slug}-${attempt + 1}`, attempt + 1);
  }
  return slug;
};

/**
 * Sets the active organization for a user session
 * Finds the first organization the user is a member of and sets it as active
 * @param session - The session object containing the user ID
 * @returns Promise<object> - Session data with activeOrganizationId set
 */
const setActiveOrganization = async (session: { userId: string }) => {
  const firstOrg = await db.query.member.findFirst({
    where: { userId: session.userId },
  });

  return {
    data: {
      ...session,
      activeOrganizationId: firstOrg?.organizationId,
    },
  };
};

export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: {
      // Every surface authenticates first-party. This denies a cross-*site*
      // POST the session; it says nothing about a same-site cross-origin one,
      // which the /api/orpc route's Origin check handles. Stated rather than
      // inherited from better-auth's default, because loosening it to "none"
      // would hand the cookie to every site on the internet. `secure` is
      // deliberately left to better-auth, which derives it from the baseURL
      // protocol so local http dev still gets a cookie.
      sameSite: "lax",
    },
  },
  baseURL: baseUrl,
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  databaseHooks: {
    session: {
      create: {
        before: async (session) => await setActiveOrganization(session),
      },
    },
    user: {
      create: {
        after: async (user) => {
          // oxlint-disable-next-line no-use-before-define -- the hook creates the organization through the auth instance it is registered on
          await createDefaultOrganization(user);
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
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
    // genericOAuth, which registers itself as a social provider and shadows the
    // built-in github one under the same id — signIn.social({ provider:
    // "github" }) drives both. Creds are local fixtures matching
    // emulate.config.yaml, not secrets.
    ...(emulatorUrl
      ? [
          genericOAuth({
            config: [
              {
                authorizationUrl: `${emulatorUrl}/login/oauth/authorize`,
                clientId: "loremllm-local-github",
                clientSecret: "loremllm-local-github-secret",
                providerId: "github",
                tokenUrl: `${emulatorUrl}/login/oauth/access_token`,
                userInfoUrl: `${emulatorUrl}/user`,
              },
            ],
          }),
        ]
      : []),
  ],
  // Persist rate-limit counters in the database. The default in-memory store
  // keeps per-instance counters, so on serverless (Vercel) the effective limit
  // multiplies across cold-started instances and resets on every deploy. 10
  // requests/60s per IP throttles credential-stuffing against the auth routes.
  rateLimit: {
    enabled: true,
    max: 10,
    storage: "database",
    window: 60,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      redirectURI: `${baseUrl}/api/auth/callback/github`,
    },
  },
  trustedOrigins,
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];

/**
 * Creates a default personal organization for a new user
 * Generates a unique slug and creates the organization
 * If organization creation fails, the user is deleted to maintain data consistency
 * @param user - The user object for whom to create the organization
 * @throws {Error} if organization creation fails
 */
const createDefaultOrganization = async (user: User) => {
  // A name in a script with no ASCII base ("李明") slugifies to "", which would
  // create an organization at the unroutable /dashboard/. Signup has no user to
  // prompt, so fall back to a generic base and let them rename it later.
  const slug = await generateAvailableSlug(slugify(user.name) || FALLBACK_ORGANIZATION_SLUG);

  try {
    await auth.api.createOrganization({
      body: {
        metadata: {
          personal: true,
        },
        name: "Personal Organization",
        slug,
        userId: user.id,
      },
    });
  } catch (error) {
    // If organization creation fails, delete the user to maintain data consistency
    await db.delete(userSchema).where(eq(userSchema.id, user.id));
    throw error;
  }
};
