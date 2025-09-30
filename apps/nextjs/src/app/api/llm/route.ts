import { handleMockCollectionRequest } from "./collection-handler";
import { handleDemoRequest } from "./demo-handler";
import {
  collectionIdHeaderSchema,
  jsonResponseHeaders,
  requestSchema,
} from "./utils";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    json = undefined;
  }

  const parseResult = requestSchema.safeParse(json);

  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request payload",
        details: parseResult.error.flatten(),
      }),
      {
        status: 400,
        headers: jsonResponseHeaders,
      },
    );
  }

  const { messages } = parseResult.data;
  const collectionHeader = request.headers.get("x-collection-id")?.trim();

  // Route to database handler if collection ID is provided
  if (collectionHeader) {
    const collectionIdResult =
      collectionIdHeaderSchema.safeParse(collectionHeader);

    if (!collectionIdResult.success) {
      return new Response(JSON.stringify({ error: "Invalid collection" }), {
        status: 400,
        headers: jsonResponseHeaders,
      });
    }

    return handleMockCollectionRequest(collectionIdResult.data, messages);
  }

  // Route to demo handler for general requests
  return handleDemoRequest(messages);
}
