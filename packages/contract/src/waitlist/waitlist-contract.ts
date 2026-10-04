import type { waitlist } from "@repo/db/drizzle-schema";
import { type } from "@orpc/contract";

import { publicBase } from "../base";
import { joinWaitlistInput } from "./waitlist-schema";

export const waitlistContract = {
  join: publicBase
    .input(joinWaitlistInput)
    .output(type<{ waitlist: typeof waitlist.$inferSelect | undefined }>()),
};
