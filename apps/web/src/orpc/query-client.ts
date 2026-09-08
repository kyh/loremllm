import { RPCSerializer } from "@orpc/client";
import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query";

// oRPC's own serializer, so dehydrated data round-trips every type the RPC
// protocol supports (Date, Map, Set, BigInt, URL, RegExp) — plain JSON would
// hand the client a string where the server had a Date.
const serializer = new RPCSerializer();

export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      // No blanket mutation `onSuccess` here on purpose: every mutation
      // declares the query filters it actually invalidates (see the dashboard
      // components). Invalidating the whole cache refetches unrelated queries
      // on every write, and — because a default is fully overridden by any
      // per-mutation `onSuccess` — it silently protected nothing anyway.
      dehydrate: {
        // FormData cannot ride the hydration payload into the browser, so keep
        // blobs inline in the JSON.
        serializeData: (data) => serializer.serialize(data, { useFormDataForBlobFields: false }),
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
        shouldRedactErrors: () =>
          // We should not catch Next.js server errors
          // as that's how Next.js detects dynamic pages
          // so we cannot redact them.
          // Next.js also automatically redacts errors for us
          // with better digests.
          false,
      },
      hydrate: {
        deserializeData: (data) => serializer.deserialize(data),
      },
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
    },
  });

  return queryClient;
};
