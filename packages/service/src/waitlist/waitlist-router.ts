import { waitlist } from "@repo/db/drizzle-schema";

import { os } from "../orpc";

export const waitlistRouter = {
  join: os.waitlist.join.handler(async ({ context, input }) => {
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
