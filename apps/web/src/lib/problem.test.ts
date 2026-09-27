import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { PROBLEM_CONTENT_TYPE, problemResponse, readProblemDetail } from "./problem";

describe("problemResponse", () => {
  test("is an RFC 9457 document with the problem content type", async () => {
    const response = problemResponse(404, "Collection not found", { Allow: "POST" });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("content-type"), PROBLEM_CONTENT_TYPE);
    assert.equal(response.headers.get("allow"), "POST");
    assert.deepEqual(await response.json(), {
      detail: "Collection not found",
      status: 404,
      title: "Not Found",
      type: "about:blank",
    });
  });

  test("falls back to a generic title for unmapped statuses", async () => {
    const body = await problemResponse(418, "teapot").json();
    assert.equal(body.title, "Error");
  });
});

describe("readProblemDetail", () => {
  test("extracts detail from a problem document", () => {
    const text = JSON.stringify({ detail: "No match", status: 404, title: "Not Found" });
    assert.equal(readProblemDetail(text), "No match");
  });

  test("passes other text through", () => {
    assert.equal(readProblemDetail("Network error"), "Network error");
    assert.equal(readProblemDetail('{"other":1}'), '{"other":1}');
  });
});
