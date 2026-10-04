import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { slugify } from "./utils";

describe("slugify", () => {
  test("lowercases and replaces spaces with hyphens", () => {
    assert.strictEqual(slugify("Hello World"), "hello-world");
  });

  test("turns tabs and newlines into hyphens", () => {
    assert.strictEqual(slugify("hello\tworld\nagain"), "hello-world-again");
  });

  test("trims leading and trailing whitespace", () => {
    assert.strictEqual(slugify("  hello  "), "hello");
  });

  test("removes special characters", () => {
    assert.strictEqual(slugify("hello@world!"), "helloworld");
  });

  test("collapses multiple hyphens into one", () => {
    assert.strictEqual(slugify("hello---world"), "hello-world");
  });

  test("handles mixed spaces, hyphens, and special chars", () => {
    assert.strictEqual(slugify("  My Cool -- Project!  "), "my-cool-project");
  });

  test("returns empty string for empty input", () => {
    assert.strictEqual(slugify(""), "");
  });

  test("keeps the base letter when stripping diacritics", () => {
    assert.strictEqual(slugify("café latte"), "cafe-latte");
    assert.strictEqual(slugify("José Müller"), "jose-muller");
  });

  test("returns empty string for scripts with no ascii base", () => {
    assert.strictEqual(slugify("李明"), "");
    assert.strictEqual(slugify("Иван"), "");
  });

  test("does not leave leading or trailing hyphens", () => {
    assert.strictEqual(slugify("!hello!"), "hello");
    assert.strictEqual(slugify("-hello-"), "hello");
  });

  test("preserves numbers", () => {
    assert.strictEqual(slugify("Project 123"), "project-123");
  });
});
