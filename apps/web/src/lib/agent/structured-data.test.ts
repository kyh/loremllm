import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { aboutPage, docsPage } from "./site-pages";
import {
  buildHomeGraph,
  buildOrganization,
  buildProsePageGraph,
  serializeJsonLd,
} from "./structured-data";

describe("buildHomeGraph", () => {
  const graph = buildHomeGraph();
  const types = graph["@graph"].map((node) => node["@type"]);

  test("declares the product and who is behind it", () => {
    assert.deepEqual(types, ["Organization", "WebSite", "SoftwareApplication", "VideoObject"]);
  });

  test("describes the og:video with absolute URLs, a date and a duration", () => {
    const video = graph["@graph"].find((node) => node["@type"] === "VideoObject");
    assert.ok(video && "contentUrl" in video);
    assert.match(video.contentUrl, /^https:\/\/www\.loremllm\.com\/og\/og\.mp4$/u);
    assert.match(video.thumbnailUrl, /^https:\/\//u);
    assert.match(video.uploadDate, /^\d{4}-\d{2}-\d{2}$/u);
    assert.match(video.duration, /^PT\d+S$/u);
  });

  test("every node has a name and url", () => {
    for (const node of graph["@graph"]) {
      assert.ok(node.name);
      assert.ok(node.url);
    }
  });
});

const typesOf = (graph: ReturnType<typeof buildProsePageGraph>) =>
  graph["@graph"].map((node) => node["@type"]);

describe("buildProsePageGraph", () => {
  test("describes the docs as a TechArticle about the transport package", () => {
    assert.deepEqual(typesOf(buildProsePageGraph(docsPage)), [
      "Organization",
      "WebPage",
      "BreadcrumbList",
      "TechArticle",
      "SoftwareSourceCode",
    ]);
  });

  test("describes other prose pages as a WebPage with breadcrumbs", () => {
    assert.deepEqual(typesOf(buildProsePageGraph(aboutPage)), [
      "Organization",
      "WebPage",
      "BreadcrumbList",
    ]);
  });
});

describe("buildOrganization", () => {
  const organization = buildOrganization();

  test("has a contactPoint with email and type, and no invented address", () => {
    const [primary] = organization.contactPoint;
    assert.equal(primary?.email, "kai@kyh.io");
    assert.ok(primary?.contactType);
    assert.equal("address" in organization, false);
  });

  test("links sameAs profiles", () => {
    assert.ok(organization.sameAs.includes("https://github.com/kyh/loremllm"));
  });
});

describe("serializeJsonLd", () => {
  test("escapes < so a value cannot close the script tag", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    assert.equal(serialized.includes("<"), false);
    assert.deepEqual(JSON.parse(serialized), { name: "</script><script>alert(1)</script>" });
  });
});
