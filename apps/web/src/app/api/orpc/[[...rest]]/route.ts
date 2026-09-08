import type { NextRequest } from "next/server";
import { appRouter, createORPCContext } from "@repo/api";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

// No CORS headers, and none belong here: nothing consumes this route
// cross-origin. The dashboard is served same-origin, and the documented
// external surfaces are /api/chat and /api/eve, which set their own CORS.
// Credentialed CORS headers here would hand a cross-origin page authenticated
// access, letting any page fan per-call embedding costs across its visitors'
// IPs. GET, the one method a cookie-bearing navigation can reach, is refused
// by the handler's default `allowMethods`.
const handler = new RPCHandler(appRouter, {
  clientInterceptors: [
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- an oRPC interceptor, not a Node-style callback
    onError((error) => {
      // An ORPCError is a procedure answering deliberately — rejected input, a
      // missing row, a caller without access. Everything else is a real fault.
      if (error instanceof ORPCError) {
        return;
      }
      console.error(">>> oRPC Error", error);
    }),
  ],
});

/**
 * The session cookie's `SameSite=Lax` is only half the defense, because
 * `SameSite` keys on *site*, not origin. A sibling subdomain of the
 * registrable domain — or merely another port on the same host — is
 * cross-origin but same-site, so the browser does attach the session cookie to
 * a plain `<form method=POST>` served from there and the mutation runs
 * authenticated. A form POST triggers no preflight, so CORS never sees it, and
 * oRPC ships nothing for this: its CSRF plugin covers GET by its own docstring.
 *
 * Browsers set `Origin` on every POST and page script cannot forge it, so an
 * `Origin` that is not ours is the signal. Absent `Origin` passes: that is a
 * non-browser caller, which authenticates by an explicit header rather than by
 * an ambiently-attached cookie and so has nothing to forge.
 *
 * Checked at the route boundary rather than in a handler plugin so it runs
 * once on the real request, not on client-authored sub-requests should
 * batching ever be enabled.
 */
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
