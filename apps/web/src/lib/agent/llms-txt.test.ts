import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { renderLlmsTxt } from "./llms-txt";

describe("renderLlmsTxt", () => {
  const body = renderLlmsTxt();
  const lines = body.split("\n");

  test("follows the llmstxt.org shape: H1, then a blockquote summary", () => {
    assert.equal(lines[0], "# LoremLLM");
    assert.equal(lines[1], "");
    assert.ok(lines[2]?.startsWith("> "));
  });

  test("has exactly one H1", () => {
    assert.equal(body.match(/^# /gmu)?.length, 1);
  });

  test("keeps when-to-use guidance before the first H2", () => {
    const firstH2 = body.indexOf("\n## ");
    const guidance = body.indexOf("**When to use LoremLLM:**");
    assert.ok(guidance > 0 && guidance < firstH2);
  });

  test("links the docs and the OpenAPI spec", () => {
    assert.ok(body.includes("(https://www.loremllm.com/docs)") || body.includes("/docs)"));
    assert.ok(body.includes("/openapi.json)"));
  });

  test("H2 sections contain only link lists", () => {
    const sections = body.split("\n## ").slice(1);
    for (const section of sections) {
      const entries = section.split("\n").slice(1).filter(Boolean);
      for (const entry of entries) {
        assert.ok(entry.startsWith("- "), `unexpected line in H2 section: ${entry}`);
      }
    }
  });
});
