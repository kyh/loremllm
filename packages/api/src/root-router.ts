import { collectionRouter } from "./collection/collection-router";
import { interactionRouter } from "./interaction/interaction-router";
import { organizationRouter } from "./organization/organization-router";
import { waitlistRouter } from "./waitlist/waitlist-router";

export const appRouter = {
  waitlist: waitlistRouter,
  organization: organizationRouter,
  collection: collectionRouter,
  interaction: interactionRouter,
};

// export type definition of API
export type AppRouter = typeof appRouter;
