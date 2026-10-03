import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { inlineMarksToMarkdown, parseInlineMarks } from "./inline-marks";

describe("parseInlineMarks", () => {
  test("splits code, strong and links out of the surrounding text, in order", () => {
    assert.deepEqual(parseInlineMarks("**Email**: send `POST` to [us](mailto:a@b.c)."), [
      { kind: "strong", text: "Email" },
      { kind: "text", text: ": send " },
      { kind: "code", text: "POST" },
      { kind: "text", text: " to " },
      { href: "mailto:a@b.c", kind: "link", text: "us" },
      { kind: "text", text: "." },
    ]);
  });

  test("leaves a lone marker as plain text", () => {
    assert.deepEqual(parseInlineMarks("a * b [c] d"), [{ kind: "text", text: "a * b [c] d" }]);
  });

  test("does not read a mark inside a code span", () => {
    assert.deepEqual(parseInlineMarks("`[x](/y) **z**`"), [
      { kind: "code", text: "[x](/y) **z**" },
    ]);
  });
});

describe("inlineMarksToMarkdown", () => {
  const text = 'See the "**Service**" [section](#service), the [Terms](/terms) and `code`.';

  test("writes the copy back unchanged when hrefs are left alone", () => {
    assert.equal(
      inlineMarksToMarkdown(text, (href) => href),
      text,
    );
  });

  test("passes every link href through the resolver", () => {
    assert.equal(
      inlineMarksToMarkdown(text, (href) =>
        href.startsWith("/") ? `https://x.test${href}` : href,
      ),
      'See the "**Service**" [section](#service), the [Terms](https://x.test/terms) and `code`.',
    );
  });
});
