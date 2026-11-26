import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { z } from "zod";

import { createQueryClient } from "./query-client";

const transformers = () => {
  const { dehydrate, hydrate } = createQueryClient().getDefaultOptions();
  assert.ok(dehydrate?.serializeData, "query client must configure dehydrate.serializeData");
  assert.ok(hydrate?.deserializeData, "query client must configure hydrate.deserializeData");

  return { deserialize: hydrate.deserializeData, serialize: dehydrate.serializeData };
};

describe("dehydrate/hydrate", () => {
  test("round-trips every rich type the RPC protocol supports", () => {
    const { serialize, deserialize } = transformers();

    const data = {
      at: new Date("2020-01-01T00:00:00.000Z"),
      big: 123n,
      lookup: new Map([[1, "one"]]),
      tags: new Set(["a", "b"]),
      url: new URL("https://example.com/path?q=1"),
    };

    const revived = z
      .object({
        at: z.date(),
        big: z.bigint(),
        lookup: z.map(z.number(), z.string()),
        tags: z.set(z.string()),
        url: z.instanceof(URL),
      })
      .parse(deserialize(serialize(data)));

    assert.deepStrictEqual(revived.at, data.at);
    assert.deepStrictEqual(revived.tags, data.tags);
    assert.deepStrictEqual(revived.lookup, data.lookup);
    assert.strictEqual(revived.big, data.big);
    assert.strictEqual(revived.url.href, data.url.href);
  });

  test("survives the JSON round trip the hydration payload takes", () => {
    const { serialize, deserialize } = transformers();

    const data = { at: new Date("2020-01-01T00:00:00.000Z") };
    const wire: unknown = structuredClone(serialize(data));
    const revived = z.object({ at: z.date() }).parse(deserialize(wire));

    assert.deepStrictEqual(revived.at, data.at);
  });
});
