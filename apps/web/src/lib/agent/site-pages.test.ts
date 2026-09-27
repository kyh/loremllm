import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { findPageByPath, prosePages, rendersOutsideRouter } from "./site-pages";

const proseText = (path: string) => {
  const page = findPageByPath(path);
  assert.ok(page, `${path} should exist`);
  return page.blocks
    .map((block) => {
      if (block.kind === "list") {
        return block.items.map((item) => `${item.label} ${item.text ?? ""}`).join(" ");
      }
      return block.text;
    })
    .join(" ");
};

describe("prose pages", () => {
  test("each trust page carries at least 500 characters of copy", () => {
    for (const path of ["/about", "/contact", "/privacy", "/docs"]) {
      const { length } = proseText(path);
      assert.ok(length >= 500, `${path} has only ${length} chars`);
    }
  });

  test("paths are unique", () => {
    const paths = prosePages.map((page) => page.path);
    assert.equal(new Set(paths).size, paths.length);
  });

  test("contact names the published email", () => {
    assert.ok(proseText("/contact").includes("im.kaiyu@gmail.com"));
  });

  test("unknown paths have no page", () => {
    assert.equal(findPageByPath("/nope"), null);
  });
});

describe("rendersOutsideRouter", () => {
  test("route handlers and off-site links bypass the client router", () => {
    assert.equal(rendersOutsideRouter("/llms.txt"), true);
    assert.equal(rendersOutsideRouter("/openapi.json"), true);
    assert.equal(rendersOutsideRouter("https://github.com/kyh/loremllm"), true);
    assert.equal(rendersOutsideRouter("mailto:im.kaiyu@gmail.com"), true);
  });

  test("pages stay on the client router", () => {
    assert.equal(rendersOutsideRouter("/docs"), false);
    assert.equal(rendersOutsideRouter("/"), false);
  });
});
