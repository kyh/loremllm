import { ORPCError } from "@orpc/server";

import { authMetadataSchema } from "../auth/auth-schema";
import { protectedProcedure } from "../orpc";
import { getOrganizationInput } from "./organization-schema";

export const organizationRouter = {
  get: protectedProcedure.input(getOrganizationInput).handler(async ({ context, input }) => {
    const { slug } = input;

    const organization = await context.db.query.organization.findFirst({
      where: { slug },
    });

    if (!organization) {
      throw new ORPCError("NOT_FOUND", {
        message: "Organization not found",
      });
    }

    // drizzle embeds the related user via `with`, so rows arrive pre-joined —
    // no second query and hand-built Map to reunite members with their users.
    const members = await context.db.query.member.findMany({
      where: { organizationId: organization.id },
      with: {
        // Allow-list only — full rows include admin-only fields (role, banned, banReason)
        user: { columns: { email: true, id: true, image: true, name: true } },
      },
    });
    const currentUserMember = members.find((member) => member.userId === context.session.user.id);

    if (!currentUserMember) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "You are not a member of this organization",
      });
    }

    // Exclude canceled invitations in SQL rather than fetching then dropping them.
    const invitations = await context.db.query.invitation.findMany({
      where: { organizationId: organization.id, status: { ne: "canceled" } },
    });

    return {
      currentUserMember,
      invitations,
      members,
      organization,
      organizationMetadata: authMetadataSchema.parse(organization.metadata ?? "{}"),
    };
  }),
};
