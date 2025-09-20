import type { UIMessage } from "ai";
import { convertToModelMessages, smoothStream, streamText } from "ai";

import { caller } from "@/trpc/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const { messages, teamSlug } = (await request.json()) as {
    messages: UIMessage[];
    teamSlug: string;
  };

  // Ensure the team exists and the user has access to it
  await caller.team.getTeam({ slug: teamSlug });

  const result = streamText({
    model: "gpt-4o-mini",
    messages: convertToModelMessages(messages),
    experimental_transform: smoothStream({ chunking: "word" }),
  });

  return result.toUIMessageStreamResponse();
}
