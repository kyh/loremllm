import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildHomeGraph, buildOrganization, serializeJsonLd } from "./structured-data";

describe("buildHomeGraph", () => {
  const graph = buildHomeGraph();
  const types = graph["@graph"].map((node) => node["@type"]);

  test("declares the product and who is behind it", () => {
    assert.deepEqual(types, ["Organization", "WebSite", "SoftwareApplication"]);
  });

  test("every node has a name and url", () => {
    for (const node of graph["@graph"]) {
      assert.ok(node.name);
      assert.ok(node.url);
    }
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
