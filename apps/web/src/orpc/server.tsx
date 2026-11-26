import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { appRouter, createORPCContext } from "@repo/service";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { dehydrate, HydrationBoundary, noop } from "@tanstack/react-query";

import type { QueryExecuteOptions, QueryKey } from "@tanstack/react-query";
import { getSession } from "@/lib/auth-server";
import { createQueryClient } from "./query-client";

const createContext = cache(
  async () =>
    await createORPCContext({
      headers: new Headers(await headers()),
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
  queryOptions: QueryExecuteOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>,
) => {
  void getQueryClient().query(queryOptions).catch(noop);
};
