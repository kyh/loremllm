import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { renderHomeMarkdown, renderNotFoundMarkdown, renderProsePageMarkdown } from "./markdown";
import { docsPage } from "./site-pages";

describe("renderHomeMarkdown", () => {
  const body = renderHomeMarkdown();

  test("opens with a single H1 naming the product", () => {
    assert.ok(body.startsWith("# LoremLLM"));
    assert.equal(body.match(/^# /gmu)?.length, 1);
  });

  test("tells an agent when to use it and where the API lives", () => {
    assert.ok(body.includes("## When to use this"));
    assert.ok(body.includes("/openapi.json"));
    assert.ok(body.includes("/docs"));
  });
});

describe("renderProsePageMarkdown", () => {
  test("renders code blocks as fenced code", () => {
    const body = renderProsePageMarkdown(docsPage);
    assert.ok(body.includes("```sh\n# generated lorem ipsum"));
    assert.ok(body.includes("```json\n{"));
  });

  test("ends with exactly one newline", () => {
    const body = renderProsePageMarkdown(docsPage);
    assert.ok(body.endsWith("\n") && !body.endsWith("\n\n"));
  });
});

describe("renderNotFoundMarkdown", () => {
  test("names the missing path and links recovery surfaces", () => {
    const body = renderNotFoundMarkdown("/missing");
    assert.ok(body.includes("`/missing`"));
    assert.ok(body.includes("/llms.txt"));
    assert.ok(body.includes("/sitemap.xml"));
  });
});
