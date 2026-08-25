import type { NextRequest } from "next/server";
import { appRouter, createORPCContext } from "@repo/api";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";

// No CORS headers: nothing consumes this route cross-origin. The dashboard is
// served same-origin, and the documented external surfaces are /api/chat and
// /api/eve, which set their own CORS. A wildcard here would let any page fan
// per-call embedding costs across its visitors' IPs.
//
// SimpleCsrfProtection requires an `x-csrf-token` header, which the paired link
// plugin sends and an HTML form cannot set — and a cross-origin fetch that
// tries to set it needs a preflight this route never answers.

// Errors that are normal control flow, not server faults: unauthenticated,
// forbidden, missing row, rejected input, and requests the transport plugins
// turn away (header-less CSRF probes, GETs on POST-only procedures). Logging
// them would just add noise.
const EXPECTED_ERROR_CODES = new Set([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "BAD_REQUEST",
  "CSRF_TOKEN_MISMATCH",
  "METHOD_NOT_SUPPORTED",
]);

const handler = new RPCHandler(appRouter, {
  plugins: [new SimpleCsrfProtectionHandlerPlugin()],
  interceptors: [
    onError((error) => {
      if (error instanceof ORPCError && EXPECTED_ERROR_CODES.has(error.code)) return;
      console.error(">>> oRPC Error", error);
    }),
  ],
});

const handleRequest = async (req: NextRequest) => {
  const { response } = await handler.handle(req, {
    prefix: "/api/orpc",
    context: await createORPCContext({ headers: req.headers }),
  });

  return response ?? new Response("Not found", { status: 404 });
};

export { handleRequest as GET, handleRequest as POST };
