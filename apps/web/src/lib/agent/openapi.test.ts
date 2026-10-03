import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ChatRequestSchema,
  LoremRequestSchema,
  MarkdownRequestSchema,
} from "@/app/api/chat/schema";

import { buildOpenApiDocument } from "./openapi";

const documentedKeys = (schema: { properties: object }) =>
  Object.keys(schema.properties)
    .filter((key) => key !== "type")
    .toSorted();

describe("buildOpenApiDocument", () => {
  const document = buildOpenApiDocument();
  const { schemas } = document.components;

  test("is OpenAPI 3.1 with POST /api/chat", () => {
    assert.equal(document.openapi, "3.1.0");
    assert.ok(document.paths["/api/chat"].post);
  });

  test("documents exactly the fields the zod schemas accept", () => {
    assert.deepEqual(
      documentedKeys(schemas.LoremRequest),
      Object.keys(LoremRequestSchema.shape).toSorted(),
    );
    assert.deepEqual(
      documentedKeys(schemas.MarkdownRequest),
      Object.keys(MarkdownRequestSchema.shape).toSorted(),
    );
    assert.deepEqual(
      documentedKeys(schemas.ChatRequest),
      Object.keys(ChatRequestSchema.shape).toSorted(),
    );
  });

  test("documents the lorem units the schema allows", () => {
    assert.deepEqual(
      schemas.LoremRequest.properties.units.enum,
      LoremRequestSchema.shape.units.unwrap().unwrap().options,
    );
  });

  test("describes every error as a problem document", () => {
    const { responses } = document.paths["/api/chat"].post;
    for (const status of ["400", "403", "404", "500"] as const) {
      assert.ok(responses[status].content["application/problem+json"]);
    }
  });
});
