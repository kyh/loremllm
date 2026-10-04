import type { invitation, member, organization, user } from "@repo/db/drizzle-schema-auth";
import { type } from "@orpc/contract";
import type { z } from "zod";

import { protectedBase } from "../base";
import type { authMetadata } from "./organization-schema";
import { getOrganizationInput } from "./organization-schema";

type MemberRow = typeof member.$inferSelect;

interface OrganizationMember extends MemberRow {
  user: Pick<typeof user.$inferSelect, "email" | "id" | "image" | "name"> | null;
}

interface OrganizationDetail {
  currentUserMember: OrganizationMember;
  invitations: (typeof invitation.$inferSelect)[];
  members: OrganizationMember[];
  organization: typeof organization.$inferSelect;
  organizationMetadata: z.output<typeof authMetadata>;
}

export const organizationContract = {
  get: protectedBase.input(getOrganizationInput).output(type<OrganizationDetail>()),
};
