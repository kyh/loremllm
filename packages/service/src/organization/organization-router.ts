import { ORPCError } from "@orpc/server";

import { authMetadataSchema } from "../auth/auth-schema";
import { os, requireSession } from "../orpc";

const authed = os.organization.use(requireSession);

export const organizationRouter = {
  get: authed.get.handler(async ({ context, input }) => {
    const { slug } = input;

    const organization = await context.db.query.organization.findFirst({
      where: { slug },
    });

    if (!organization) {
      throw new ORPCError("NOT_FOUND", {
        message: "Organization not found",
      });
    }

    const members = await context.db.query.member.findMany({
      where: { organizationId: organization.id },
      with: {
        user: { columns: { email: true, id: true, image: true, name: true } },
      },
    });

    const currentUserMember = members.find((member) => member.userId === context.session.user.id);

    if (!currentUserMember) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "You are not a member of this organization",
      });
    }

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
