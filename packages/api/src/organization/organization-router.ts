import { TRPCError } from "@trpc/server";

import { authMetadataSchema } from "../auth/auth-schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getOrganizationInput } from "./organization-schema";

export const organizationRouter = createTRPCRouter({
  get: protectedProcedure.input(getOrganizationInput).query(async ({ ctx, input }) => {
    const { slug } = input;

    const organization = await ctx.db.query.organization.findFirst({
      where: (org, { eq }) => eq(org.slug, slug),
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    // drizzle embeds the related user via `with`, so rows arrive pre-joined —
    // no second query and hand-built Map to reunite members with their users.
    const members = await ctx.db.query.member.findMany({
      where: (member, { eq }) => eq(member.organizationId, organization.id),
      with: {
        // Allow-list only — full rows include admin-only fields (role, banned, banReason)
        user: { columns: { id: true, name: true, email: true, image: true } },
      },
    });
    const currentUserMember = members.find((member) => member.userId === ctx.session.user.id);

    if (!currentUserMember) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not a member of this organization",
      });
    }

    // Exclude canceled invitations in SQL rather than fetching then dropping them.
    const invitations = await ctx.db.query.invitation.findMany({
      where: (invitation, { and, eq, ne }) =>
        and(eq(invitation.organizationId, organization.id), ne(invitation.status, "canceled")),
    });

    return {
      currentUserMember,
      organization,
      organizationMetadata: authMetadataSchema.parse(organization.metadata ?? "{}"),
      members,
      invitations,
    };
  }),
});
