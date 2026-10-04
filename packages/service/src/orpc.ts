import { eq } from "@repo/db";
import { db } from "@repo/db/drizzle-client";
import { session as sessionSchema } from "@repo/db/drizzle-schema-auth";
import { contract } from "@repo/contract";
import { implement, ORPCError, os as builder } from "@orpc/server";

import type { Session } from "./auth/auth";
import { auth } from "./auth/auth";

/**
 * Builds the per-request context. Callers supply headers rather than reading
 * them here, so the same code serves the fetch handler and the in-process RSC
 * router client, which have no shared request object.
 *
 * @see https://orpc.dev/docs/context
 */
export const createORPCContext = async (opts: {
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

  return { db, session };
};

export type ORPCContext = Awaited<ReturnType<typeof createORPCContext>>;

/**
 * Implements @repo/contract. Public procedures implement `os.<feature>.<proc>`
 * directly; `context.session` is still populated when the caller happens to be
 * logged in. Request forgery on /api/orpc is stopped above every procedure
 * here, in two halves: the session cookie's SameSite=Lax denies a cross-*site*
 * POST the session, and the route's Origin check denies the same-site
 * cross-origin POST that SameSite does attach the cookie to.
 *
 * `.use` on the implementer (`os.<feature>.use`) runs before input validation;
 * `.use` on a procedure runs after it. Feature routers are plain objects:
 * `.router()` would re-apply implementer middleware.
 *
 * @see https://orpc.dev/docs/contract/implementation#implementer
 */
export const os = implement(contract).$context<ORPCContext>();

const base = builder.$context<ORPCContext>();

/**
 * Requires a valid session and narrows `context.session.user` to non-nullable
 * for the handler. Pairs with `protectedBase` and `organizationBase`; apply it
 * as `os.<feature>.use(requireSession)`, so it runs before input validation.
 */
export const requireSession = base.middleware(({ context, next }) => {
  const { session } = context;

  if (!session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      // infers the `session` as non-nullable
      session: { ...session, user: session.user },
    },
  });
});

type SessionContext = ORPCContext & { session: NonNullable<ORPCContext["session"]> };

/**
 * Proves the caller is a member of the session's active organization and
 * exposes it as `context.organizationId`. Pairs with `organizationBase`; apply
 * it at the implementer after `requireSession`, so it too runs before input
 * validation.
 *
 * The membership row is the authority, not the session: a revoked or stale
 * `activeOrganizationId` would otherwise keep granting every handler that scopes
 * by it access to that tenant's rows. Sessions created during sign-up can miss
 * the active organization (the organization is created in a parallel hook), so
 * an absent one falls back to the user's first membership and persists it.
 */
export const requireActiveOrganization = builder
  .$context<SessionContext>()
  .middleware(async ({ context, next }) => {
    const { activeOrganizationId } = context.session.session;

    const membership = await context.db.query.member.findFirst({
      where: activeOrganizationId
        ? { organizationId: activeOrganizationId, userId: context.session.user.id }
        : { userId: context.session.user.id },
    });

    if (!membership) {
      throw new ORPCError("FORBIDDEN", {
        message: "No active organization found for session",
      });
    }

    if (membership.organizationId !== activeOrganizationId) {
      await context.db
        .update(sessionSchema)
        .set({ activeOrganizationId: membership.organizationId })
        .where(eq(sessionSchema.id, context.session.session.id));
    }

    return next({
      context: { organizationId: membership.organizationId },
    });
  });
