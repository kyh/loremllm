import { z } from "zod";

const jsonValue = z.json();

export type JsonBody = z.infer<typeof jsonValue>;

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
  units: z.enum(["words", "sentences", "paragraphs"]).optional().default("sentences"),
  words: z.array(z.string()).optional(),
});

export const MarkdownRequestSchema = z.object({
  markdown: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  collectionId: z.string().min(1),
  messages: z.array(jsonValue).optional(),
});

export const LoremRequestSchema = LoremParamsSchema.merge(
  z.object({
    messages: z.array(jsonValue).optional(),
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

export class PayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadError";
  }
}

const parseOrThrow = <T>(schema: z.ZodType<T>, body: JsonBody, label: string) => {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new PayloadError(
      `Invalid "${label}" request: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  return result.data;
};

const explicitlyTypedBody = z.object({ type: z.string() });

export const parseRequestPayload = (body: JsonBody) => {
  const explicitBody = explicitlyTypedBody.safeParse(body);
  const explicitType = explicitBody.success ? explicitBody.data.type : null;

  if (explicitType !== null) {
    switch (explicitType) {
      case "markdown": {
        return {
          data: parseOrThrow(MarkdownRequestSchema, body, "markdown"),
          type: "markdown",
        } satisfies ParsedRequestPayload;
      }

      case "chat": {
        return {
          data: parseOrThrow(ChatRequestSchema, body, "chat"),
          type: "chat",
        } satisfies ParsedRequestPayload;
      }

      case "lorem": {
        return {
          data: parseOrThrow(LoremRequestSchema, body, "lorem"),
          type: "lorem",
        } satisfies ParsedRequestPayload;
      }

      default: {
        throw new PayloadError(
          `Unknown request type "${explicitType}". Expected "chat", "markdown", or "lorem".`,
        );
      }
    }
  }

  const markdownResult = MarkdownRequestSchema.safeParse(body);

  if (markdownResult.success) {
    return { data: markdownResult.data, type: "markdown" } satisfies ParsedRequestPayload;
  }

  const chatResult = ChatRequestSchema.safeParse(body);

  if (chatResult.success) {
    return { data: chatResult.data, type: "chat" } satisfies ParsedRequestPayload;
  }

  const loremResult = LoremRequestSchema.safeParse(body);

  if (loremResult.success) {
    return { data: loremResult.data, type: "lorem" } satisfies ParsedRequestPayload;
  }

  throw new PayloadError("Invalid request payload");
};
