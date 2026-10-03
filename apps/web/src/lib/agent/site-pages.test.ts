import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  findPageByPath,
  headingId,
  privacyPage,
  prosePages,
  rendersOutsideRouter,
  termsPage,
} from "./site-pages";

import type { ProseBlock, ProsePage } from "./site-pages";

const blockText = (block: ProseBlock): string => {
  switch (block.kind) {
    case "list": {
      return block.items.map((item) => `${item.label} ${item.text ?? ""}`).join(" ");
    }
    case "bullets": {
      return block.items.join(" ");
    }
    case "table": {
      return [...block.columns, ...block.rows.flat()].join(" ");
    }
    default: {
      return block.text;
    }
  }
};

const proseText = (path: string) => {
  const page = findPageByPath(path);
  assert.ok(page, `${path} should exist`);
  return page.blocks.map(blockText).join(" ");
};

const headings = (page: ProsePage) =>
  page.blocks.flatMap((block) => (block.kind === "heading" ? [block.text] : []));

const legalPages = [privacyPage, termsPage];

const GENERAL_LEGAL_CREDIT =
  'This template was prepared and made publicly available by General Legal, PC ("General Legal"). It is provided for general reference purposes only and does not constitute, and should not be construed as, legal advice, or an endorsement or review of any particular transaction in which it is used. Use of this template does not create an attorney-client relationship with General Legal. General Legal has not reviewed, and takes no position on, any modifications made to this document or the deal terms it is used to document.';

describe("prose pages", () => {
  test("each trust page carries at least 500 characters of copy", () => {
    for (const path of ["/about", "/contact", "/privacy", "/terms", "/docs"]) {
      const { length } = proseText(path);
      assert.ok(length >= 500, `${path} has only ${length} chars`);
    }
  });

  test("paths are unique", () => {
    const paths = prosePages.map((page) => page.path);
    assert.equal(new Set(paths).size, paths.length);
  });

  test("contact names the published email", () => {
    assert.ok(proseText("/contact").includes("kai@kyh.io"));
  });

  test("unknown paths have no page", () => {
    assert.equal(findPageByPath("/nope"), null);
  });

  test("top-level heading ids are unique on every page", () => {
    for (const page of prosePages) {
      const ids = headings(page).map(headingId);
      assert.equal(new Set(ids).size, ids.length, `${page.path} repeats a heading id`);
    }
  });

  test("every table row has one cell per column", () => {
    for (const page of prosePages) {
      for (const block of page.blocks) {
        if (block.kind === "table") {
          for (const row of block.rows) {
            assert.equal(row.length, block.columns.length, `${page.path}: ${row[0] ?? ""}`);
          }
        }
      }
    }
  });
});

describe("legal pages", () => {
  test("are named for their templates", () => {
    assert.equal(privacyPage.heading, "Privacy Policy");
    assert.equal(privacyPage.path, "/privacy");
    assert.equal(termsPage.heading, "Terms of Use");
    assert.equal(termsPage.path, "/terms");
  });

  test("carry the effective date and the contact email", () => {
    for (const page of legalPages) {
      const text = proseText(page.path);
      assert.ok(text.includes("October 3, 2026"), `${page.path} has no date`);
      assert.ok(text.includes("kai@kyh.io"), `${page.path} names no email`);
    }
  });

  test("end with General Legal's credit, verbatim", () => {
    for (const page of legalPages) {
      assert.deepEqual(page.blocks.at(-1), { kind: "paragraph", text: GENERAL_LEGAL_CREDIT });
    }
  });

  test("leave no template placeholder or drafting note behind", () => {
    for (const page of legalPages) {
      const text = proseText(page.path);
      for (const residue of ["<mark>", "[INSERT", "[ADD]", "{{", "[Company", "DecisionLayer"]) {
        assert.equal(text.includes(residue), false, `${page.path} still has ${residue}`);
      }
    }
  });

  test("the privacy policy keeps the template's sections, in order", () => {
    assert.deepEqual(headings(privacyPage), [
      "Personal information we collect",
      "Tracking & Other Technologies",
      "How we use your personal information",
      "Retention",
      "How we share your personal information",
      "Your choices",
      "Other sites and services",
      "Security",
      "International data transfer",
      "Children",
      "Changes to this Privacy Policy",
      "How to contact us",
      "State privacy rights notice",
      "Notice to European users",
    ]);
  });

  test("the privacy policy's index links every top-level section", () => {
    const index = privacyPage.blocks.find((block) => block.kind === "list");
    assert.ok(index?.kind === "list");
    assert.deepEqual(
      index.items.map((item) => item.href),
      headings(privacyPage).map((text) => `#${headingId(text)}`),
    );
  });

  test("the terms keep sections 1 to 11 so cross-references hold", () => {
    assert.deepEqual(
      headings(termsPage).map((text) => text.split(". ")[0]),
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
    );
    assert.equal(/\bCompany\b|COMPANY/u.test(proseText("/terms")), false);
  });

  test("the terms link the privacy policy", () => {
    assert.ok(proseText("/terms").includes("](/privacy)"));
  });
});

describe("headingId", () => {
  test("follows GitHub's slug rule", () => {
    assert.equal(headingId("Tracking & Other Technologies"), "tracking--other-technologies");
    assert.equal(headingId("Changes to this Privacy Policy"), "changes-to-this-privacy-policy");
    assert.equal(
      headingId("5. Third-Party Services & Other Users"),
      "5-third-party-services--other-users",
    );
  });
});

describe("rendersOutsideRouter", () => {
  test("route handlers and off-site links bypass the client router", () => {
    assert.equal(rendersOutsideRouter("/llms.txt"), true);
    assert.equal(rendersOutsideRouter("/openapi.json"), true);
    assert.equal(rendersOutsideRouter("https://github.com/kyh/loremllm"), true);
    assert.equal(rendersOutsideRouter("mailto:kai@kyh.io"), true);
  });

  test("in-page anchors are plain links", () => {
    assert.equal(rendersOutsideRouter("#your-choices"), true);
  });

  test("pages stay on the client router", () => {
    assert.equal(rendersOutsideRouter("/docs"), false);
    assert.equal(rendersOutsideRouter("/"), false);
    assert.equal(rendersOutsideRouter("/privacy#tracking--other-technologies"), false);
  });
});
