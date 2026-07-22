import type { NextRequest } from "next/server";
import { appRouter, createTRPCContext } from "@repo/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

// export const runtime = "edge";

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
const setCorsHeaders = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
};

/**
 * Codes the API throws as ordinary control flow — a signed-out visitor, a
 * rejected cross-origin mutation, a missing collection, a failed zod parse.
 * Logging them buries the errors that actually need attention in routine noise.
 */
const EXPECTED_ERROR_CODES = new Set(["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "BAD_REQUEST"]);

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });

  setCorsHeaders(response);

  return response;
};

const handler = async (req: NextRequest) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError: ({ error, path }) => {
      if (!EXPECTED_ERROR_CODES.has(error.code)) {
        console.error(`>>> tRPC Error on '${path}'`, error);
      }
    },
  });

  setCorsHeaders(response);

  return response;
};

export { handler as GET, handler as POST };
