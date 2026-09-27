import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildSitemapEntries } from "./sitemap-entries";

describe("buildSitemapEntries", () => {
  const lastModified = new Date("2026-09-26T00:00:00Z");
  const entries = buildSitemapEntries(lastModified);
  const urls = entries.map((entry) => entry.url);

  test("lists the home page first, then every prose page", () => {
    assert.equal(urls[0], "https://www.loremllm.com/");
    for (const path of ["/docs", "/about", "/contact", "/privacy"]) {
      assert.ok(urls.includes(`https://www.loremllm.com${path}`), `missing ${path}`);
    }
  });

  test("stamps every entry with the given date", () => {
    for (const entry of entries) {
      assert.equal(entry.lastModified, lastModified);
    }
  });

  test("has no duplicate URLs", () => {
    assert.equal(new Set(urls).size, urls.length);
  });
});
