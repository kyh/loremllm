import { execFileSync } from "node:child_process";
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
  fetch: async (request, init) => await fetch(request, { ...init, signal: deadline() }),
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

const probeHealth = async () => {
  try {
    const response = await fetch(url("/api/health"), { signal: deadline() });

    const body = z
      .object({ status: z.string().optional() })
      .catch({})
      .parse(await response.json());

    return response.ok && body.status === "ok"
      ? null
      : `HTTP ${response.status} ${JSON.stringify(body)}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const pollHealth: (startedAt: number, attempts: number, lastSeen: string) => Promise<void> = async (
  startedAt,
  attempts,
  lastSeen,
) => {
  if (performance.now() - startedAt >= BOOT_BUDGET_MS) {
    fail(
      `server never became healthy at ${BASE_URL} within ${BOOT_BUDGET_MS / 1000}s ` +
        `(${attempts} attempts) — last saw: ${lastSeen}`,
    );
  }

  const seen = await probeHealth();

  if (seen === null) {
    return;
  }

  await sleep(250);
  await pollHealth(startedAt, attempts + 1, seen);
};

const waitForServer = async () => {
  await pollHealth(performance.now(), 0, "no response at all");
};

const mintSignInCode = () =>
  execFileSync("pnpm", ["sign-in-code", EMAIL], { encoding: "utf-8" }).trim();

const signIn = async () => {
  const otp = mintSignInCode();

  const response = await fetch(url("/api/auth/sign-in/email-otp"), {
    body: JSON.stringify({ email: EMAIL, otp }),
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
