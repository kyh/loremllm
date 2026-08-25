import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createQueryClient } from "./query-client";

const transformers = () => {
  const { dehydrate, hydrate } = createQueryClient().getDefaultOptions();
  assert.ok(dehydrate?.serializeData, "query client must configure dehydrate.serializeData");
  assert.ok(hydrate?.deserializeData, "query client must configure hydrate.deserializeData");
  return { serialize: dehydrate.serializeData, deserialize: hydrate.deserializeData };
};

describe("dehydrate/hydrate", () => {
  test("round-trips every rich type the RPC protocol supports", () => {
    const { serialize, deserialize } = transformers();

    const data = {
      at: new Date("2020-01-01T00:00:00.000Z"),
      tags: new Set(["a", "b"]),
      lookup: new Map([[1, "one"]]),
      big: 123n,
      url: new URL("https://example.com/path?q=1"),
      re: /pattern/i,
    };
    const revived: typeof data = deserialize(serialize(data));

    // Field by field, not one deepStrictEqual on the whole object: the
    // serializer revives a null-prototype container, which deepStrictEqual
    // counts as a difference even when every value inside it matches.
    assert.deepStrictEqual(revived.at, data.at);
    assert.deepStrictEqual(revived.tags, data.tags);
    assert.deepStrictEqual(revived.lookup, data.lookup);
    assert.strictEqual(revived.big, data.big);
    assert.strictEqual(revived.url.href, data.url.href);
    assert.strictEqual(revived.re.source, data.re.source);
    assert.strictEqual(revived.re.flags, data.re.flags);
  });

  test("survives the JSON round trip the hydration payload takes", () => {
    // Dehydrated state rides the RSC flight payload as JSON, so a serializer
    // whose output only round-trips in-process would still hand the browser a
    // string where the server had a Date.
    const { serialize, deserialize } = transformers();

    const data = { at: new Date("2020-01-01T00:00:00.000Z") };
    const wire: unknown = JSON.parse(JSON.stringify(serialize(data)));
    const revived: typeof data = deserialize(wire);

    assert.deepStrictEqual(revived.at, data.at);
  });
});
