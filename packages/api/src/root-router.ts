import { organizationRouter } from "./organization/organization-router";
import { createTRPCRouter } from "./trpc";
import { waitlistRouter } from "./waitlist/waitlist-router";
import { mockRouter } from "./mock/mock-router";

export const appRouter = createTRPCRouter({
  waitlist: waitlistRouter,
  organization: organizationRouter,
  mock: mockRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
