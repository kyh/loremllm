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

interface RouteContext {
  params: Promise<{ collectionId: string }>;
}

const handleEveRequest = async (request: Request, context: RouteContext): Promise<Response> => {
  const { collectionId } = await context.params;

  const handler = createStaticEveHandler({
    chunkDelayMs: 20,
    async *mockResponse({ messages }) {
      // Dynamically import caller only when needed
      const { caller } = await import("@/orpc/server");

      const lastUserMessage = messages.findLast((message) => message.role === "user");
      const query =
        lastUserMessage?.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n") ?? "";

      // Throws a descriptive ORPCError when nothing matches; the eve handler
      // streams it to the client as a failed session.
      const queryResult = await caller.interaction.query({
        limit: 1,
        publicId: collectionId,
        query,
      });

      const [bestMatch] = queryResult.matches;
      if (!bestMatch) {
        throw new Error("No matching response found");
      }

      yield { text: bestMatch.output, type: "text" };
    },
    sessionStore: createDbEveSessionStore(collectionId),
  });

  return handler(request);
};

export const GET = handleEveRequest;
export const POST = handleEveRequest;
export const OPTIONS = handleEveRequest;
