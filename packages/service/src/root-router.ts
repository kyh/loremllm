import { collectionRouter } from "./collection/collection-router";
import { interactionRouter } from "./interaction/interaction-router";
import { organizationRouter } from "./organization/organization-router";
import { os } from "./orpc";
import { waitlistRouter } from "./waitlist/waitlist-router";

/** `os.router` fails to compile if any contract procedure is missing or mistyped. */
export const appRouter = os.router({
  collection: collectionRouter,
  interaction: interactionRouter,
  organization: organizationRouter,
  waitlist: waitlistRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
