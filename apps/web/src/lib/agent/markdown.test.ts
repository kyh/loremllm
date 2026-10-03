import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { renderHomeMarkdown, renderNotFoundMarkdown, renderProsePageMarkdown } from "./markdown";
import { docsPage, privacyPage, termsPage } from "./site-pages";

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

  test("lists the privacy policy", () => {
    assert.ok(body.includes("[Privacy Policy](https://www.loremllm.com/privacy)"));
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

  test("renders tables as GFM pipe tables", () => {
    const body = renderProsePageMarkdown(privacyPage);
    assert.ok(
      body.includes(
        '| Personal Information ("PI") we collect | CCPA statutory category | Purposes |',
      ),
    );
    assert.ok(body.includes("\n| --- | --- | --- | --- | --- |\n| Contact data | Identifiers;"));
    assert.ok(
      body.includes("| Purpose | Categories of personal information involved | Legal basis |"),
    );
  });

  test("renders sections as ## and the sections within them as ###", () => {
    const body = renderProsePageMarkdown(privacyPage);
    assert.ok(body.includes("\n## Notice to European users\n\n### General\n"));
  });

  test("keeps in-page anchors and makes on-site links absolute", () => {
    const privacy = renderProsePageMarkdown(privacyPage);
    assert.ok(privacy.includes("- [Tracking & Other Technologies](#tracking--other-technologies)"));
    assert.ok(privacy.includes("**Contact data**, such as your name and email address."));

    const terms = renderProsePageMarkdown(termsPage);
    assert.ok(terms.includes("(https://www.loremllm.com/privacy#tracking--other-technologies)"));
    assert.ok(terms.includes("[kai@kyh.io](mailto:kai@kyh.io)"));
    assert.equal(terms.includes("](/"), false);
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
