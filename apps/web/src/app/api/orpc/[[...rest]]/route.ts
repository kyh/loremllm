import type { NextRequest } from "next/server";
import { appRouter, createORPCContext } from "@repo/service";
import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

// WARNING: no CORS headers here; credentialed CORS would let any page spend embeddings as its visitors.
const handler = new RPCHandler(appRouter, {
  clientInterceptors: [
    async (options) => {
      try {
        return await options.next();
      } catch (error) {
        if (!(error instanceof ORPCError)) {
          console.error(">>> oRPC Error", error);
        }

        throw error;
      }
    },
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
