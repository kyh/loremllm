import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { appRouter, createORPCContext } from "@repo/api";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import type { FetchQueryOptions, QueryKey } from "@tanstack/react-query";
import { getSession } from "@/lib/auth-server";
import { createQueryClient } from "./query-client";

/**
 * Wraps the `createORPCContext` helper and provides the required context when
 * a React Server Component calls a procedure.
 */
const createContext = cache(async () =>
  createORPCContext({
    headers: new Headers(await headers()),
    // Dashboard pages call getSession() to gate the route before they prefetch.
    // Reuse that cached result — resolving it again here would be a second
    // session lookup per render.
    session: await getSession(),
  }),
);

const getQueryClient = cache(createQueryClient);

/**
 * Calls procedures in-process, with no HTTP round trip — so the server never
 * asks itself over the network. Used directly by route handlers (chat, eve)
 * and available to server components.
 */
export const caller = createRouterClient(appRouter, { context: createContext });

export const orpc = createTanstackQueryUtils(caller);

export const HydrateClient = (props: { children: React.ReactNode }) => {
  const queryClient = getQueryClient();
  return <HydrationBoundary state={dehydrate(queryClient)}>{props.children}</HydrationBoundary>;
};

export const prefetch = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  queryOptions: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) => {
  void getQueryClient().prefetchQuery(queryOptions);
};
