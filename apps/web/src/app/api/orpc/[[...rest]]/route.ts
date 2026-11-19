import type { NextRequest } from "next/server";
import { appRouter, createORPCContext } from "@repo/service";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

// WARNING: no CORS headers here; credentialed CORS would let any page spend embeddings as its visitors.
const handler = new RPCHandler(appRouter, {
  clientInterceptors: [
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- an oRPC interceptor, not a Node-style callback
    onError((error) => {
      if (error instanceof ORPCError) {
        return;
      }

      console.error(">>> oRPC Error", error);
    }),
  ],
});

const isCrossOrigin = (req: Request) => {
  const origin = req.headers.get("origin");

  return origin !== null && origin !== new URL(req.url).origin;
};

const handleRequest = async (req: NextRequest) => {
  if (isCrossOrigin(req)) {
    return new Response("Cross-origin request blocked.", { status: 403 });
  }

  const { response } = await handler.handle(req, {
    context: await createORPCContext({ headers: req.headers }),
    prefix: "/api/orpc",
  });

  return response ?? new Response("Not found", { status: 404 });
};

export { handleRequest as GET, handleRequest as POST };
