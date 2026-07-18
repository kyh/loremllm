import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@repo/api/auth/auth";

/**
 * RSC-only session/organization helpers. They read `next/headers`, so they live
 * in the web app rather than @repo/api — keeping the API package transport-
 * agnostic. React `cache` dedupes the lookup within a single request.
 */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const getOrganization = cache(
  async (query: {
    organizationId?: string | undefined;
    organizationSlug?: string | undefined;
    membersLimit?: string | number | undefined;
  }) =>
    auth.api.getFullOrganization({
      query,
      headers: await headers(),
    }),
);
