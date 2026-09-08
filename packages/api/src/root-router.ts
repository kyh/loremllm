import { collectionRouter } from "./collection/collection-router";
import { interactionRouter } from "./interaction/interaction-router";
import { organizationRouter } from "./organization/organization-router";
import { waitlistRouter } from "./waitlist/waitlist-router";

export const appRouter = {
  collection: collectionRouter,
  interaction: interactionRouter,
  organization: organizationRouter,
  waitlist: waitlistRouter,
};

// export type definition of API
export type AppRouter = typeof appRouter;
