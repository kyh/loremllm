/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { eq } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { session } from "@repo/db/drizzle-schema-auth";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { Session } from "./auth/auth";
import { auth, trustedOrigins } from "./auth/auth";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
  /**
   * Pass an already-resolved session to reuse it. RSC callers have usually
   * resolved one via the cached `getSession()` before prefetching; without
   * this they'd pay a second session lookup, because React's cache keys on the
   * function, so a separate `auth.api.getSession` call never dedupes with it.
   * `null` means "resolved, and nobody is logged in" — only `undefined` triggers
   * a lookup here.
   */
  session?: Session | null;
}) => {
  const session =
    opts.session === undefined
      ? await auth.api.getSession({ headers: opts.headers })
      : opts.session;

  return {
    session,
    db,
    // Browser-supplied request provenance. Captured here because a tRPC
    // middleware cannot read raw request headers; read by the mutation origin
    // guard below. Both null for non-browser callers (server-to-server).
    origin: opts.headers.get("origin"),
    secFetchSite: opts.headers.get("sec-fetch-site"),
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

export type AuthenticatedSession = NonNullable<TRPCContext["session"]> & {
  user: NonNullable<TRPCContext["session"]>["user"];
};

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

const TRUSTED_ORIGINS = new Set(trustedOrigins);

/**
 * True when a request carries browser provenance that isn't same-origin or an
 * allow-listed origin. This is the browser's own CSRF backstop for /api/trpc,
 * layered under session auth; better-auth's Origin checks only cover
 * /api/auth/*. Non-browser callers send neither header and are left alone.
 */
const isUntrustedOrigin = (origin: string | null, secFetchSite: string | null) => {
  // Sec-Fetch-Site is set by the browser and cannot be forged from script.
  if (secFetchSite === "same-origin" || secFetchSite === "none") return false;
  // No browser provenance at all — not a browser CSRF vector.
  if (!origin && !secFetchSite) return false;
  // A cross-site/same-site label, or any Origin, must match the allow-list.
  // Fail closed: a stripped Origin under a cross-site label is rejected.
  return origin === null || !TRUSTED_ORIGINS.has(origin);
};

/**
 * Rejects state-changing calls whose origin isn't trusted — defence-in-depth
 * against CSRF, layered under session auth rather than replacing it. Queries are
 * side-effect-free and pass through untouched.
 */
const enforceTrustedOriginOnMutation = t.middleware(({ ctx, type, next }) => {
  if (type === "mutation" && isUntrustedOrigin(ctx.origin, ctx.secFetchSite)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cross-origin request rejected",
    });
  }
  return next();
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(enforceTrustedOriginOnMutation);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  const session = ctx.session;

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...session, user: session.user },
    },
  });
});

/**
 * Organization-scoped procedure
 *
 * Builds on `protectedProcedure` and additionally guarantees the session has an
 * active organization, exposing it as `ctx.organizationId`.
 *
 * Sessions created during sign-up can miss the active organization (the
 * organization is created in a parallel hook), so fall back to the user's
 * first membership and persist it on the session.
 */
export const organizationProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  let organizationId = ctx.session.session.activeOrganizationId ?? null;

  if (!organizationId) {
    const membership = await ctx.db.query.member.findFirst({
      where: (member, { eq }) => eq(member.userId, ctx.session.user.id),
    });
    organizationId = membership?.organizationId ?? null;

    if (organizationId) {
      await ctx.db
        .update(session)
        .set({ activeOrganizationId: organizationId })
        .where(eq(session.id, ctx.session.session.id));
    }
  }

  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active organization found for session",
    });
  }

  return next({
    ctx: { ...ctx, organizationId },
  });
});
