import { waitlist } from "@repo/db/drizzle-schema";

import { createTRPCRouter, publicProcedure } from "../trpc";
import type { AuthenticatedSession } from "../trpc";
import { joinWaitlistInput } from "./waitlist-schema";

export const waitlistRouter = createTRPCRouter({
  join: publicProcedure
    .input(joinWaitlistInput)
    .mutation(async ({ ctx, input }) => {
        const [created] = await ctx.db
          .insert(waitlist)
          .values({
            ...input,
            source: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "",
            userId: (ctx.session as AuthenticatedSession | null)?.user.id ?? null,
          })
          .returning();

      return {
        waitlist: created,
      };
    }),
});
