import { createHash, randomUUID } from "node:crypto";

import {
  UI_MESSAGE_STREAM_HEADERS,
  createUIMessageStreamResponse,
  simulateReadableStream,
} from "ai";
import { db } from "@repo/db/drizzle-client";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z
    .union([
      z.string(),
      z.array(
        z.object({
          type: z.string(),
          text: z.string().optional(),
          data: z.unknown().optional(),
        }),
      ),
      z.record(z.string(), z.unknown()),
    ])
    .optional(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
});

const paramsSchema = z.object({
  scenarioId: z.string().uuid(),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1),
});

type IncomingRequest = z.infer<typeof requestSchema>;
type IncomingMessage = z.infer<typeof messageSchema>;

const normalizeWhitespace = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const hashSignature = (value: string) =>
  createHash("sha256").update(normalizeWhitespace(value)).digest("hex");

const flattenContentToText = (content: IncomingMessage["content"]) => {
  if (content === undefined) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (typeof part.text === "string") {
          return part.text;
        }
        if (typeof part.data === "string") {
          return part.data;
        }
        return JSON.stringify(part.data ?? "");
      })
      .join(" ");
  }

  if (typeof content === "object") {
    const maybeText = (content as { text?: unknown }).text;
    if (typeof maybeText === "string") {
      return maybeText;
    }

    return JSON.stringify(content);
  }

  return String(content);
};

const buildMatchingInput = (messages: IncomingMessage[]) => {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => flattenContentToText(message.content))
    .join("\n")
    .trim();

  if (userText.length > 0) {
    return userText;
  }

  return messages
    .map((message) => flattenContentToText(message.content))
    .join("\n")
    .trim();
};

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.map((token) => token.trim())
    .filter(Boolean) ?? [];

const cosineSimilarity = (a: string, b: string) => {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (!tokensA.length || !tokensB.length) {
    return 0;
  }

  const frequencyA = new Map<string, number>();
  const frequencyB = new Map<string, number>();

  for (const token of tokensA) {
    frequencyA.set(token, (frequencyA.get(token) ?? 0) + 1);
  }

  for (const token of tokensB) {
    frequencyB.set(token, (frequencyB.get(token) ?? 0) + 1);
  }

  const intersection = new Set([...frequencyA.keys()].filter((token) => frequencyB.has(token)));

  let dotProduct = 0;
  for (const token of intersection) {
    dotProduct += (frequencyA.get(token) ?? 0) * (frequencyB.get(token) ?? 0);
  }

  const magnitudeA = Math.sqrt(
    [...frequencyA.values()].reduce((acc, value) => acc + value * value, 0),
  );
  const magnitudeB = Math.sqrt(
    [...frequencyB.values()].reduce((acc, value) => acc + value * value, 0),
  );

  if (!magnitudeA || !magnitudeB) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

const chunkText = (text: string) => {
  const maxChunkLength = 40;
  const words = text.split(/(\s+)/);
  const chunks: string[] = [];
  let buffer = "";

  for (const word of words) {
    if ((buffer + word).length > maxChunkLength) {
      if (buffer.length > 0) {
        chunks.push(buffer);
        buffer = "";
      }
    }

    buffer += word;
  }

  if (buffer.length > 0) {
    chunks.push(buffer);
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
};

export const maxDuration = 30;

export async function POST(request: Request, context: { params: unknown }) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    json = undefined;
  }

  const parseResult = requestSchema.safeParse(json);

  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request payload", details: parseResult.error.flatten() }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const paramResult = paramsSchema.safeParse(context.params);

  if (!paramResult.success) {
    return new Response(JSON.stringify({ error: "Invalid scenario" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const body: IncomingRequest = parseResult.data;
  const { scenarioId } = paramResult.data;

  const scenario = await db.query.mockScenarios.findFirst({
    where: (scenario, { eq }) => eq(scenario.publicId, scenarioId),
  });

  if (!scenario) {
    return new Response(JSON.stringify({ error: "Scenario not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const matchingInput = buildMatchingInput(body.messages);

  if (!matchingInput.length) {
    return new Response(JSON.stringify({ error: "Messages must include content" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const matchingSignature = hashSignature(matchingInput);

  const exactInteraction = await db.query.mockInteractions.findFirst({
    where: (interaction, { and, eq }) =>
      and(
        eq(interaction.scenarioId, scenario.id),
        eq(interaction.matchingSignature, matchingSignature),
      ),
    with: {
      messages: {
        orderBy: (message, { asc }) => [asc(message.position)],
        with: {
          toolCalls: {
            orderBy: (toolCall, { asc }) => [asc(toolCall.callIndex)],
          },
        },
      },
    },
  });

  let matchedInteraction = exactInteraction;
  let similarity = 1;

  if (!matchedInteraction) {
    const interactions = await db.query.mockInteractions.findMany({
      where: (interaction, { eq }) => eq(interaction.scenarioId, scenario.id),
      columns: {
        id: true,
        matchingInput: true,
      },
    });

    const scored = interactions
      .map((interaction) => ({
        interaction,
        score: cosineSimilarity(matchingInput, interaction.matchingInput),
      }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];

    if (best && best.score >= 0.15) {
      similarity = best.score;
      matchedInteraction = await db.query.mockInteractions.findFirst({
        where: (interaction, { eq }) => eq(interaction.id, best.interaction.id),
        with: {
          messages: {
            orderBy: (message, { asc }) => [asc(message.position)],
            with: {
              toolCalls: {
                orderBy: (toolCall, { asc }) => [asc(toolCall.callIndex)],
              },
            },
          },
        },
      });
    }
  }

  const buildHeaders = () => new Headers(UI_MESSAGE_STREAM_HEADERS);

  if (!matchedInteraction) {
    const stream = simulateReadableStream({
      chunks: [
        { type: "start", messageId: randomUUID() },
        { type: "text-start", id: "fallback" },
        {
          type: "text-delta",
          id: "fallback",
          delta: "No matching mock interaction found.",
        },
        { type: "text-end", id: "fallback" },
        {
          type: "finish",
          messageMetadata: {
            scenarioId: scenario.publicId,
            matched: false,
          },
        },
      ],
    });

    return createUIMessageStreamResponse({
      stream,
      headers: buildHeaders(),
    });
  }

  const responseMessageId = randomUUID();
  const chunks: Record<string, unknown>[] = [
    { type: "start", messageId: responseMessageId },
    {
      type: "data-matching",
      id: "matching",
      data: {
        scenario: scenario.name,
        interactionId: matchedInteraction.id,
        title: matchedInteraction.title,
        similarity,
      },
    },
  ];

  for (const message of matchedInteraction.messages) {
    if (message.role !== "assistant") {
      continue;
    }

    for (const toolCall of message.toolCalls) {
      chunks.push({
        type: "tool-input-start",
        toolCallId: toolCall.callId,
        toolName: toolCall.toolName,
      });

      const argumentText =
        typeof toolCall.arguments === "string"
          ? toolCall.arguments
          : toolCall.arguments !== undefined && toolCall.arguments !== null
            ? JSON.stringify(toolCall.arguments)
            : "";

      if (argumentText.length) {
        chunks.push({
          type: "tool-input-delta",
          toolCallId: toolCall.callId,
          inputTextDelta: argumentText,
        });
      }

      chunks.push({
        type: "tool-input-available",
        toolCallId: toolCall.callId,
        toolName: toolCall.toolName,
        input: toolCall.arguments,
      });

      if (toolCall.result !== undefined && toolCall.result !== null) {
        chunks.push({
          type: "tool-output-available",
          toolCallId: toolCall.callId,
          output: toolCall.result,
        });
      }
    }

    const text = flattenContentToText(message.content);

    if (!text.length) {
      continue;
    }

    const textId = `${matchedInteraction.id}-${message.id}`;

    chunks.push({ type: "text-start", id: textId });

    for (const chunk of chunkText(text)) {
      chunks.push({
        type: "text-delta",
        id: textId,
        delta: chunk,
      });
    }

    chunks.push({ type: "text-end", id: textId });
  }

  chunks.push({
    type: "finish",
    messageMetadata: {
      scenarioId: scenario.publicId,
      interactionId: matchedInteraction.id,
      similarity,
    },
  });

  const stream = simulateReadableStream({ chunks });

  return createUIMessageStreamResponse({
    stream,
    headers: buildHeaders(),
  });
}
