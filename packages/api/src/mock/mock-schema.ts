import { z } from "zod";

export const toolCallInput = z.object({
  callId: z.string().optional(),
  toolName: z.string().min(1),
  arguments: z.unknown().optional(),
  result: z.unknown().optional(),
});

export const messageContentSchema = z.union([
  z.string(),
  z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
      data: z.unknown().optional(),
    }),
  ),
  z.record(z.string(), z.unknown()),
]);

export const messageInput = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  name: z.string().optional(),
  content: messageContentSchema.optional(),
  toolCalls: z.array(toolCallInput).optional(),
});

export const createScenarioInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateScenarioInput = z.object({
  scenarioId: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const scenarioByIdInput = z.object({
  scenarioId: z.string().uuid(),
});

export const deleteScenarioInput = z.object({
  scenarioId: z.string().uuid(),
});

export const createInteractionInput = z.object({
  scenarioId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  messages: z.array(messageInput).min(1),
});

export const deleteInteractionInput = z.object({
  interactionId: z.string().uuid(),
});

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type MessageInput = z.infer<typeof messageInput>;
export type ToolCallInput = z.infer<typeof toolCallInput>;
