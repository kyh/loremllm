import { siteConfig } from "@/lib/site-config";

import { siteSummary } from "./site-overview";

/**
 * OpenAPI 3.1 description of `POST /api/chat`. Hand-written rather than
 * generated because the route is a plain handler, not an oRPC procedure;
 * `openapi.test.ts` pins every documented field to the zod schemas in
 * `app/api/chat/schema.ts` so the two cannot drift.
 */

const problemSchema = {
  properties: {
    detail: { description: "Human-readable explanation of this failure.", type: "string" },
    status: { description: "The HTTP status code.", type: "integer" },
    title: { description: "Short summary of the status.", type: "string" },
    type: { description: "Always `about:blank`.", type: "string" },
  },
  required: ["type", "title", "status", "detail"],
  type: "object",
};

const messagesSchema = {
  description:
    "AI SDK `UIMessage[]`, as sent by `useChat`. For `chat`, the text parts of the last user message are the query.",
  items: { type: "object" },
  type: "array",
};

const loremRequest = {
  properties: {
    count: { default: 1, description: "How many units to generate.", minimum: 1, type: "number" },
    messages: messagesSchema,
    paragraphLowerBound: { default: 3, minimum: 1, type: "number" },
    paragraphUpperBound: { default: 7, minimum: 1, type: "number" },
    sentenceLowerBound: { default: 5, minimum: 1, type: "number" },
    sentenceUpperBound: { default: 15, minimum: 1, type: "number" },
    suffix: { default: "\n", description: "Separator between paragraphs.", type: "string" },
    type: { const: "lorem", type: "string" },
    units: {
      default: "sentences",
      enum: ["words", "sentences", "paragraphs"],
      type: "string",
    },
    words: {
      description: "Custom vocabulary to draw from instead of Latin filler.",
      items: { type: "string" },
      type: "array",
    },
  },
  required: ["type"],
  title: "LoremRequest",
  type: "object",
};

const markdownRequest = {
  properties: {
    markdown: {
      description: "Markdown streamed back verbatim, in word-sized chunks.",
      minLength: 1,
      type: "string",
    },
    type: { const: "markdown", type: "string" },
  },
  required: ["type", "markdown"],
  title: "MarkdownRequest",
  type: "object",
};

const chatRequest = {
  properties: {
    collectionId: {
      description: "The public id of a collection. Private collections answer 403.",
      minLength: 1,
      type: "string",
    },
    messages: messagesSchema,
    type: { const: "chat", type: "string" },
  },
  required: ["type", "collectionId"],
  title: "ChatRequest",
  type: "object",
};

const problemResponse = (description: string) => ({
  content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } },
  description,
});

export const buildOpenApiDocument = () => ({
  components: {
    schemas: {
      ChatRequest: chatRequest,
      LoremRequest: loremRequest,
      MarkdownRequest: markdownRequest,
      Problem: problemSchema,
    },
  },
  externalDocs: { description: "API reference", url: `${siteConfig.url}/docs` },
  info: {
    contact: {
      email: siteConfig.email,
      name: siteConfig.author.name,
      url: `${siteConfig.url}/contact`,
    },
    description: siteSummary,
    termsOfService: `${siteConfig.url}/terms`,
    title: `${siteConfig.name} API`,
    version: "1.0.0",
  },
  openapi: "3.1.0",
  paths: {
    "/api/chat": {
      post: {
        description:
          "Streams a mock assistant reply as an AI SDK UI message stream (server-sent events), readable by `useChat` without an adapter. `lorem` and `markdown` need no account; `chat` queries a public collection by embedding similarity and reports the matched interaction's `interactionId`, `title` and `similarity` as message metadata on the finish event. Unknown properties are ignored. Bodies without `type` are still accepted and routed by shape, for backwards compatibility, but new callers should always set it.",
        operationId: "streamMockResponse",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                discriminator: { propertyName: "type" },
                oneOf: [
                  { $ref: "#/components/schemas/LoremRequest" },
                  { $ref: "#/components/schemas/MarkdownRequest" },
                  { $ref: "#/components/schemas/ChatRequest" },
                ],
              },
            },
          },
          required: true,
        },
        responses: {
          "200": {
            content: {
              "text/event-stream": {
                schema: {
                  description: "AI SDK UI message stream: one JSON chunk per `data:` line.",
                  type: "string",
                },
              },
            },
            description: "The streamed mock response.",
          },
          "400": problemResponse("The body is not valid JSON or does not match any request type."),
          "403": problemResponse("The collection exists but is not public."),
          "404": problemResponse(
            "Unknown collection, an empty collection, or no interaction above its similarity threshold.",
          ),
          "500": problemResponse("Unexpected failure, e.g. the embedding provider is unavailable."),
        },
        security: [],
        summary: "Stream a mock LLM response",
        tags: ["chat"],
      },
    },
  },
  servers: [{ url: siteConfig.url }],
  tags: [{ description: "Mock chat completions", name: "chat" }],
});
