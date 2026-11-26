import type { User } from "better-auth";
import { eq } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { session as sessionSchema, user as userSchema } from "@repo/db/drizzle-schema-auth";
import { betterAuth } from "better-auth";
// WARNING: not `better-auth/adapters/drizzle`, which reads `db._.fullSchema`, gone in drizzle 1.0.
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { admin, genericOAuth, oAuthProxy, organization } from "better-auth/plugins";

import { EMAIL_MODE, EMAIL_OFF_WARNING, sendEmail } from "../email/send-email";
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

const sendsEmail = EMAIL_MODE.kind !== "off";

if (!sendsEmail) {
  console.warn(`[email] ${EMAIL_OFF_WARNING}`);
}

export const trustedOrigins = [baseUrl];

const emulatorUrl = env.NEXT_PUBLIC_GITHUB_EMULATOR_URL;

const generateAvailableSlug = async (slug: string, attempt = 0) => {
  const org = await db.query.organization.findFirst({
    where: { slug },
  });

  if (org) {
    return generateAvailableSlug(`${slug}-${attempt + 1}`, attempt + 1);
  }

  return slug;
};

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

const backfillActiveOrganization = async (userId: string, organizationId: string) => {
  try {
    await db
      .update(sessionSchema)
      .set({ activeOrganizationId: organizationId })
      .where(eq(sessionSchema.userId, userId));
  } catch (error) {
    console.error("Failed to set active organization on sign-up session:", error);
  }
};

export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: {
      // WARNING: loosening sameSite to "none" hands the session cookie to every site; it is half of /api/orpc's forgery defense.
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
          const defaultOrganization = await createDefaultOrganization(user);
          await backfillActiveOrganization(user.id, defaultOrganization.id);
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: sendsEmail
      ? async ({ user, url }) => {
          await sendEmail({
            subject: "Reset your password",
            text: `Click the link to reset your password: ${url}`,
            to: user.email,
          });
        }
      : undefined,
  },
  plugins: [
    oAuthProxy({
      currentURL: baseUrl,
      productionURL: process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : baseUrl,
    }),
    organization(),
    admin(),
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

const createDefaultOrganization = async (user: User) => {
  const slug = await generateAvailableSlug(slugify(user.name) || FALLBACK_ORGANIZATION_SLUG);

  try {
    return await auth.api.createOrganization({
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
    await db.delete(userSchema).where(eq(userSchema.id, user.id));
    throw error;
  }
};
