// None of the bases declares errors or metadata, so each is plain `oc`. The
// name says which middleware @repo/service applies to implement a procedure.

/** Public (unauthed): no session required, so implementations add no middleware. */
export { oc as publicBase } from "@orpc/contract";

/** Requires a signed-in session: implement it under `os.<feature>.use(requireSession)`. */
export { oc as protectedBase } from "@orpc/contract";

/**
 * Scoped to the session's active organization: implement it under
 * `os.<feature>.use(requireSession).use(requireActiveOrganization)`. The
 * organization comes from the session, never from input, so inputs don't
 * declare it.
 */
export { oc as organizationBase } from "@orpc/contract";
