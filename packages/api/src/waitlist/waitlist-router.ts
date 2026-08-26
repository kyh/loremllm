import { waitlist } from "@repo/db/drizzle-schema";

import { publicProcedure } from "../orpc";
import { joinWaitlistInput } from "./waitlist-schema";

export const waitlistRouter = {
  join: publicProcedure.input(joinWaitlistInput).handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(waitlist)
      .values({
        ...input,
        source: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "",
        userId: context.session?.user.id ?? null,
      })
      .returning();

    return {
      waitlist: created,
    };
  }),
};
