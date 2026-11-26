import { createStaticEveHandler } from "@loremllm/eve";

import { createDbEveSessionStore } from "../../eve-session-store";

interface RouteContext {
  params: Promise<{ collectionId: string }>;
}

const handleEveRequest = async (request: Request, context: RouteContext) => {
  const { collectionId } = await context.params;

  const handler = createStaticEveHandler({
    chunkDelayMs: 20,
    async *mockResponse({ messages }) {
      const { caller } = await import("@/orpc/server");

      const lastUserMessage = messages.findLast((message) => message.role === "user");

      const query =
        lastUserMessage?.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n") ?? "";

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

  return await handler(request);
};

export const GET = handleEveRequest;
export const POST = handleEveRequest;
export const OPTIONS = handleEveRequest;
