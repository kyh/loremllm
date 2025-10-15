import { z } from "zod";

/**
 * Schema for lorem ipsum generation parameters. All fields are optional and
 * have sensible defaults so the lorem endpoint can be called with an empty
 * body.
 */
export const LoremParamsSchema = z.object({
  count: z.number().min(1).optional().default(1),
  paragraphLowerBound: z.number().min(1).optional().default(3),
  paragraphUpperBound: z.number().min(1).optional().default(7),
  sentenceLowerBound: z.number().min(1).optional().default(5),
  sentenceUpperBound: z.number().min(1).optional().default(15),
  suffix: z.string().optional().default("\n"),
  units: z
    .enum(["words", "sentences", "paragraphs"])
    .optional()
    .default("sentences"),
  words: z.array(z.string()).optional(),
});

export const MarkdownRequestSchema = z.object({
  markdown: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  collectionId: z.string().min(1),
  messages: z.array(z.unknown()).optional(),
});

export const LoremRequestSchema = LoremParamsSchema.merge(
  z.object({
    messages: z.array(z.unknown()).optional(),
  }),
);

export type LoremParams = z.infer<typeof LoremParamsSchema>;
export type MarkdownRequest = z.infer<typeof MarkdownRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type LoremRequest = z.infer<typeof LoremRequestSchema>;

export type ParsedRequestPayload =
  | { type: "markdown"; data: MarkdownRequest }
  | { type: "chat"; data: ChatRequest }
  | { type: "lorem"; data: LoremRequest };

export const parseRequestPayload = (body: unknown): ParsedRequestPayload => {
  const markdownResult = MarkdownRequestSchema.safeParse(body);
  if (markdownResult.success) {
    return { type: "markdown", data: markdownResult.data };
  }

  const chatResult = ChatRequestSchema.safeParse(body);
  if (chatResult.success) {
    return { type: "chat", data: chatResult.data };
  }

  const loremResult = LoremRequestSchema.safeParse(body);
  if (loremResult.success) {
    return { type: "lorem", data: loremResult.data };
  }

  throw new Error("Invalid request payload");
};
