import { cache } from "react";
import { headers } from "next/headers";
import { appRouter, createTRPCContext } from "@repo/api";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import type { AppRouter } from "@repo/api";
import type { FetchQueryOptions, QueryKey } from "@tanstack/react-query";
import { getSession } from "@/lib/auth-server";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());

  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
    // Dashboard pages call getSession() to gate the route before they prefetch.
    // Reuse that cached result — resolving it again here would be a second
    // session lookup per render.
    session: await getSession(),
  });
});

const getQueryClient = cache(createQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  router: appRouter,
  ctx: createContext,
  queryClient: getQueryClient,
});

export const HydrateClient = (props: { children: React.ReactNode }) => {
  const queryClient = getQueryClient();
  return <HydrationBoundary state={dehydrate(queryClient)}>{props.children}</HydrationBoundary>;
};

export const prefetch = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  queryOptions: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) => {
  void getQueryClient().prefetchQuery(queryOptions);
};

export const caller = appRouter.createCaller(createContext);
