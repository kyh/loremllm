import { createStaticEveHandler } from "@loremllm/transport/eve";

import { createDbEveSessionStore } from "../../eve-session-store";

/**
 * Hosted eve-protocol endpoint for a collection. Point eve's client at this
 * route as its host and every turn answers with the collection's best-matching
 * interaction:
 *
 * ```ts
 * useEveAgent({ host: "https://loremllm.dev/api/eve/<collectionId>" });
 * ```
 *
 * The eve client appends its own route paths (`/eve/v1/session`, ...), which
 * the catch-all segment receives and @loremllm/transport/eve serves.
 */

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ collectionId: string }> };

async function handleEveRequest(request: Request, context: RouteContext): Promise<Response> {
  const { collectionId } = await context.params;

  const handler = createStaticEveHandler({
    chunkDelayMs: 20,
    sessionStore: createDbEveSessionStore(collectionId),
    async *mockResponse({ messages }) {
      // Dynamically import caller only when needed
      const { caller } = await import("@/trpc/server");

      const lastUserMessage = messages.findLast((message) => message.role === "user");
      const query =
        lastUserMessage?.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n") ?? "";

      // Throws a descriptive TRPCError when nothing matches; the eve handler
      // streams it to the client as a failed session.
      const queryResult = await caller.interaction.query({
        publicId: collectionId,
        query,
        limit: 1,
      });

      const bestMatch = queryResult.matches[0];
      if (!bestMatch) {
        throw new Error("No matching response found");
      }

      yield { type: "text", text: bestMatch.output };
    },
  });

  return handler(request);
}

export const GET = handleEveRequest;
export const POST = handleEveRequest;
export const OPTIONS = handleEveRequest;
