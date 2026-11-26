import { setTimeout as sleep } from "node:timers/promises";
import { styleText } from "node:util";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractClient } from "@repo/contract";
import { z } from "zod";

const BASE_URL = (
  process.env.SMOKE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`
).replace(/\/$/u, "");

const EMAIL = "dev@loremllm.local";
const PASSWORD = "password";

const deadline = () => AbortSignal.timeout(15_000);

const BOOT_BUDGET_MS = 90_000;

class SmokeError extends Error {
  override name = "SmokeError";
}

const fail: (message: string) => never = (message) => {
  throw new SmokeError(message);
};

const url = (path: string) => `${BASE_URL}${path}`;

const BROWSER_HEADERS = { origin: BASE_URL };

let cookie = "";

const link = new RPCLink({
  fetch: (request, init) => fetch(request, { ...init, signal: deadline() }),
  headers: () => (cookie ? { cookie } : {}),
  origin: BASE_URL,
  url: "/api/orpc",
});

const client: ContractClient = createORPCClient(link);

const describeResponse = async (response: Response) => {
  const body = await response.text().catch(() => "<unreadable body>");
  const trimmed = body.replaceAll(/\s+/gu, " ").trim();

  return `HTTP ${response.status} — ${trimmed.slice(0, 400) || "<empty body>"}`;
};

const waitForServer = async () => {
  const startedAt = performance.now();
  let lastSeen = "no response at all";
  let attempts = 0;

  while (performance.now() - startedAt < BOOT_BUDGET_MS) {
    attempts += 1;

    try {
      const response = await fetch(url("/api/health"), { signal: deadline() });

      const body = z
        .object({ status: z.string().optional() })
        .catch({})
        .parse(await response.json());

      if (response.ok && body.status === "ok") {
        return;
      }

      lastSeen = `HTTP ${response.status} ${JSON.stringify(body)}`;
    } catch (error) {
      lastSeen = error instanceof Error ? error.message : String(error);
    }

    await sleep(250);
  }

  fail(
    `server never became healthy at ${BASE_URL} within ${BOOT_BUDGET_MS / 1000}s ` +
      `(${attempts} attempts) — last saw: ${lastSeen}`,
  );
};

const signIn = async () => {
  const response = await fetch(url("/api/auth/sign-in/email"), {
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    headers: { ...BROWSER_HEADERS, "content-type": "application/json" },
    method: "POST",
    signal: deadline(),
  });

  if (!response.ok) {
    fail(
      `sign-in as ${EMAIL} failed: ${await describeResponse(response)}. ` +
        "Is the database seeded? (pnpm db:seed)",
    );
  }

  const cookies = response.headers.getSetCookie();

  if (cookies.length === 0) {
    fail("sign-in succeeded but set no session cookie");
  }

  cookie = cookies.map((value) => value.split(";")[0]).join("; ");
};

const step = async <T>(label: string, run: () => Promise<T>) => {
  const startedAt = performance.now();
  let result: T;

  try {
    result = await run();
  } catch (error) {
    if (error instanceof SmokeError) {
      throw error;
    }

    return fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const elapsed = styleText("dim", `${Math.round(performance.now() - startedAt)}ms`);
  console.log(`  ${styleText("green", "✓")} ${label} ${elapsed}`);

  return result;
};

const main = async () => {
  console.log(`\n  Smoke test → ${BASE_URL}\n`);

  await step("server is live (/api/health)", waitForServer);
  await step(`signed in as ${EMAIL}`, signIn);

  await step("read the seeded Demo collection", async () => {
    const collections = await client.collection.list();
    const seeded = collections.find((collection) => collection.publicId === "demo");

    if (!seeded) {
      fail("no collection with publicId demo — run pnpm db:seed");
    }
  });

  const created = await step("created a collection", async () => {
    const name = `smoke-${Date.now()}`;
    const collection = await client.collection.create({ name });

    if (collection.name !== name) {
      fail("collection.create did not return the created row");
    }

    return collection;
  });

  await step("renamed it, and the change persisted", async () => {
    const name = `${created.name}-renamed`;

    await client.collection.update({ collectionId: created.id, name });

    const persisted = await client.collection.byId({ collectionId: created.id });

    if (persisted.name !== name) {
      fail("collection.update did not persist the name");
    }
  });

  await step("deleted it", async () => {
    await client.collection.delete({ collectionId: created.id });

    const collections = await client.collection.list();

    if (collections.some((collection) => collection.id === created.id)) {
      fail("collection.delete left the row behind");
    }
  });

  await step("the authenticated dashboard renders", async () => {
    const response = await fetch(url("/dashboard"), {
      headers: { ...BROWSER_HEADERS, cookie },
      redirect: "manual",
      signal: deadline(),
    });

    if (response.status !== 200) {
      fail(`/dashboard answered ${await describeResponse(response)}, not the signed-in page`);
    }
  });

  console.log(`\n  ${styleText("green", "Smoke test passed.")}\n`);
};

const run = async () => {
  try {
    await main();
  } catch (error) {
    console.error(
      `\n  ${styleText("red", "✗ Smoke test failed:")} ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
};

void run();
