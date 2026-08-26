import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import type { UIMessage } from "ai";
import { z } from "zod";

import type { EveStreamEvent } from "./eve";
import { createMemoryEveSessionStore, createStaticEveHandler } from "./eve";

const HOST = "https://mock.test";

const originalFetch = globalThis.fetch;

function createRequest(path: string, init?: RequestInit): Request {
  return new Request(`${HOST}${path}`, init);
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function postJson(path: string, body: JsonValue): Request {
  return createRequest(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readEvents(response: Response): Promise<EveStreamEvent[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map(
      (line) =>
        // SAFETY: the handler under test serializes its own EveStreamEvents to
        // NDJSON; each test then asserts the event shapes it relies on.
        JSON.parse(line) as EveStreamEvent,
    );
}

type CreateResult = { sessionId: string; continuationToken: string };

const createSessionResponse = z.object({
  sessionId: z.string(),
  continuationToken: z.string(),
  ok: z.boolean(),
});

async function createSession(
  handler: (request: Request) => Promise<Response>,
  message: JsonValue = "hello",
): Promise<CreateResult> {
  const response = await handler(postJson("/eve/v1/session", { message }));
  assert.strictEqual(response.status, 202);
  const body = createSessionResponse.parse(await response.json());
  assert.strictEqual(body.ok, true);
  return { sessionId: body.sessionId, continuationToken: body.continuationToken };
}

async function streamEvents(
  handler: (request: Request) => Promise<Response>,
  sessionId: string,
  startIndex?: number,
): Promise<EveStreamEvent[]> {
  const query = startIndex === undefined ? "" : `?startIndex=${startIndex}`;
  const response = await handler(
    createRequest(`/eve/v1/session/${encodeURIComponent(sessionId)}/stream${query}`),
  );
  assert.strictEqual(response.status, 200);
  return readEvents(response);
}

const textHandler = () =>
  createStaticEveHandler({
    async *mockResponse() {
      yield { type: "text", text: "Hello there" };
    },
  });

describe("createStaticEveHandler", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("session creation", () => {
    test("returns 202 with sessionId, continuationToken, and session header", async () => {
      const handler = textHandler();
      const response = await handler(postJson("/eve/v1/session", { message: "hi" }));

      assert.strictEqual(response.status, 202);
      const body = createSessionResponse.parse(await response.json());
      assert.strictEqual(body.ok, true);
      assert.ok(z.string().safeParse(body.sessionId).success);
      assert.ok(z.string().safeParse(body.continuationToken).success);
      assert.strictEqual(response.headers.get("x-eve-session-id"), body.sessionId);
    });

    test("accepts message part arrays and joins text parts", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler, [
        { type: "text", text: "first" },
        { type: "text", text: "second" },
      ]);

      const events = await streamEvents(handler, sessionId);
      const received = events.find((event) => event.type === "message.received");
      assert.notStrictEqual(received, undefined);
      if (received?.type === "message.received") {
        assert.strictEqual(received.data.message, "first\n\nsecond");
        assert.deepEqual(received.data.parts, [
          { type: "text", text: "first" },
          { type: "text", text: "second" },
        ]);
      }
    });

    test("rejects invalid bodies with 400", async () => {
      const handler = textHandler();

      const noMessage = await handler(postJson("/eve/v1/session", {}));
      assert.strictEqual(noMessage.status, 400);

      const emptyMessage = await handler(postJson("/eve/v1/session", { message: "" }));
      assert.strictEqual(emptyMessage.status, 400);

      const badJson = await handler(
        createRequest("/eve/v1/session", { method: "POST", body: "not json" }),
      );
      assert.strictEqual(badJson.status, 400);
    });

    test("rejects non-POST methods with 405", async () => {
      const handler = textHandler();
      const response = await handler(createRequest("/eve/v1/session"));
      assert.strictEqual(response.status, 405);
    });
  });

  describe("event stream", () => {
    test("emits the canonical text turn sequence with protocol headers", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler, "hi");

      const response = await handler(createRequest(`/eve/v1/session/${sessionId}/stream`));
      assert.strictEqual(response.status, 200);
      assert.strictEqual(
        response.headers.get("content-type"),
        "application/x-ndjson; charset=utf-8",
      );
      assert.strictEqual(response.headers.get("x-eve-stream-format"), "ndjson");
      assert.strictEqual(response.headers.get("x-eve-stream-version"), "23");
      assert.strictEqual(response.headers.get("x-eve-session-id"), sessionId);
      assert.strictEqual(response.headers.get("x-eve-stream-tail-index"), null);

      const events = await readEvents(response);
      assert.deepEqual(
        events.map((event) => event.type),
        [
          "session.started",
          "turn.started",
          "message.received",
          "step.started",
          "message.appended", // "Hello"
          "message.appended", // " "
          "message.appended", // "there"
          "message.completed",
          "step.completed",
          "turn.completed",
          "session.waiting",
        ],
      );
    });

    test("streams cumulative messageSoFar values", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const appended = events.filter((event) => event.type === "message.appended");
      const soFars = appended.map((event) =>
        event.type === "message.appended" ? event.data.messageSoFar : "",
      );
      assert.deepEqual(soFars, ["Hello", "Hello ", "Hello there"]);

      const completed = events.find((event) => event.type === "message.completed");
      if (completed?.type === "message.completed") {
        assert.strictEqual(completed.data.message, "Hello there");
        assert.strictEqual(completed.data.finishReason, "stop");
      }
    });

    test("respects autoChunkText: false", async () => {
      const handler = createStaticEveHandler({
        autoChunkText: false,
        async *mockResponse() {
          yield { type: "text", text: "Hello there" };
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const appended = events.filter((event) => event.type === "message.appended");
      assert.strictEqual(appended.length, 1);
    });

    test("slices the log by startIndex and stamps meta.at timestamps", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler);

      const all = await streamEvents(handler, sessionId);
      const sliced = await streamEvents(handler, sessionId, 4);
      assert.deepEqual(sliced, all.slice(4));
      for (const event of all) {
        assert.ok(z.string().safeParse(event.meta?.at).success);
      }
    });

    test("reports the last event index when includeTailIndex is requested", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler);

      const response = await handler(
        createRequest(`/eve/v1/session/${sessionId}/stream?includeTailIndex=1`),
      );
      const events = await readEvents(response);
      assert.strictEqual(
        response.headers.get("x-eve-stream-tail-index"),
        String(events.length - 1),
      );
    });

    test("rejects invalid startIndex and unknown sessions", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler);

      const invalid = await handler(
        createRequest(`/eve/v1/session/${sessionId}/stream?startIndex=-1`),
      );
      assert.strictEqual(invalid.status, 400);

      const unknown = await handler(createRequest("/eve/v1/session/nope/stream"));
      assert.strictEqual(unknown.status, 404);
    });
  });

  describe("part translation", () => {
    test("translates reasoning parts before text in the same step", async () => {
      const handler = createStaticEveHandler({
        autoChunkText: false,
        autoChunkReasoning: false,
        async *mockResponse() {
          yield { type: "reasoning", text: "Thinking" };
          yield { type: "text", text: "Answer" };
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const types = events.map((event) => event.type);
      assert.deepEqual(types, [
        "session.started",
        "turn.started",
        "message.received",
        "step.started",
        "reasoning.appended",
        "reasoning.completed",
        "message.appended",
        "message.completed",
        "step.completed",
        "turn.completed",
        "session.waiting",
      ]);
      const stepIndexes = events
        .filter(
          (event) => event.type === "reasoning.completed" || event.type === "message.completed",
        )
        .map((event) => ("stepIndex" in event.data ? event.data.stepIndex : -1));
      assert.deepEqual(stepIndexes, [0, 0]);
    });

    test("translates tool calls into actions.requested + action.result across steps", async () => {
      const handler = createStaticEveHandler({
        autoChunkText: false,
        async *mockResponse() {
          yield {
            type: "tool-weather",
            toolCallId: "call_1",
            state: "output-available",
            input: { location: "SF" },
            output: { tempF: 68 },
          };
          yield { type: "text", text: "68F and sunny." };
        },
      });
      const { sessionId } = await createSession(handler, "weather in sf?");

      const events = await streamEvents(handler, sessionId);
      const requested = events.find((event) => event.type === "actions.requested");
      assert.notStrictEqual(requested, undefined);
      if (requested?.type === "actions.requested") {
        assert.deepEqual(requested.data.actions, [
          { callId: "call_1", input: { location: "SF" }, kind: "tool-call", toolName: "weather" },
        ]);
      }

      const result = events.find((event) => event.type === "action.result");
      if (result?.type === "action.result") {
        assert.strictEqual(result.data.status, "completed");
        assert.deepEqual(result.data.result, {
          callId: "call_1",
          kind: "tool-result",
          output: { tempF: 68 },
          toolName: "weather",
        });
      }

      // Tool step and text step share stepIndex 0: no text preceded the tool.
      const stepStarts = events.filter((event) => event.type === "step.started");
      assert.strictEqual(stepStarts.length, 1);
    });

    test("breaks to a new step when a tool follows streamed text", async () => {
      const handler = createStaticEveHandler({
        autoChunkText: false,
        async *mockResponse() {
          yield { type: "text", text: "Let me check." };
          yield {
            type: "tool-search",
            toolCallId: "call_2",
            state: "output-available",
            input: {},
            output: { hits: 3 },
          };
          yield { type: "text", text: "Found it." };
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const stepStarts = events.filter((event) => event.type === "step.started");
      assert.strictEqual(stepStarts.length, 2);

      const requested = events.find((event) => event.type === "actions.requested");
      if (requested?.type === "actions.requested") {
        assert.strictEqual(requested.data.stepIndex, 1);
      }
    });

    test("translates tool errors into failed action results", async () => {
      const handler = createStaticEveHandler({
        async *mockResponse() {
          yield {
            type: "tool-search",
            toolCallId: "call_3",
            state: "output-error",
            input: {},
            errorText: "Search unavailable.",
          };
          yield { type: "text", text: "Sorry." };
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const result = events.find((event) => event.type === "action.result");
      if (result?.type === "action.result") {
        assert.strictEqual(result.data.status, "failed");
        assert.deepEqual(result.data.error, {
          code: "TOOL_EXECUTION_FAILED",
          message: "Search unavailable.",
        });
        assert.strictEqual(result.data.result.isError, true);
      }
    });

    test("rejects parts with no eve representation via turn failure", async () => {
      const handler = createStaticEveHandler({
        async *mockResponse() {
          yield { type: "data-chart", data: { rows: [] } };
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const failed = events.find((event) => event.type === "turn.failed");
      assert.notStrictEqual(failed, undefined);
      if (failed?.type === "turn.failed") {
        assert.ok(failed.data.message.includes('"data-chart"'));
      }
      assert.strictEqual(events.at(-1)?.type, "session.failed");
    });
  });

  describe("multi-turn conversations", () => {
    test("continues a session and passes accumulated history to mockResponse", async () => {
      const seenHistories: string[][] = [];
      const handler = createStaticEveHandler({
        autoChunkText: false,
        async *mockResponse({ messages }) {
          seenHistories.push(messages.map((message) => `${message.role}:${message.id}`));
          yield { type: "text", text: `Reply ${messages.length}` };
        },
      });

      const { sessionId } = await createSession(handler, "one");
      const firstTurn = await streamEvents(handler, sessionId);

      const continueResponse = await handler(
        postJson(`/eve/v1/session/${sessionId}`, { message: "two" }),
      );
      assert.strictEqual(continueResponse.status, 200);
      const continueBody: unknown = await continueResponse.json();
      assert.deepEqual(continueBody, { ok: true, sessionId });

      const secondTurn = await streamEvents(handler, sessionId, firstTurn.length);
      assert.strictEqual(secondTurn[0]?.type, "turn.started"); // no session.started on turn 2
      assert.strictEqual(secondTurn.at(-1)?.type, "session.waiting");

      assert.deepEqual(seenHistories, [
        ["user:turn-1:user"],
        ["user:turn-1:user", "assistant:turn-1:assistant", "user:turn-2:user"],
      ]);

      const turnIds = secondTurn
        .filter((event) => event.type === "turn.started")
        .map((event) => (event.type === "turn.started" ? event.data.turnId : ""));
      assert.deepEqual(turnIds, ["turn-2"]);
    });

    test("keeps sequence numbers session-monotonic across turns", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler);
      await handler(postJson(`/eve/v1/session/${sessionId}`, { message: "again" }));

      const events = await streamEvents(handler, sessionId);
      const sequences = events.flatMap((event) =>
        "sequence" in event.data ? [event.data.sequence] : [],
      );
      const sorted = [...sequences].sort((a, b) => a - b);
      assert.deepEqual(sequences, sorted);
      assert.strictEqual(new Set(sequences).size, sequences.length);
    });

    test("rejects turns for unknown sessions, continuation tokens, and HITL-only bodies", async () => {
      const handler = textHandler();
      const { sessionId, continuationToken } = await createSession(handler);

      const unknown = await handler(postJson("/eve/v1/session/nope", { message: "hi" }));
      assert.strictEqual(unknown.status, 404);

      const withToken = await handler(
        postJson(`/eve/v1/session/${sessionId}`, { continuationToken, message: "hi" }),
      );
      assert.strictEqual(withToken.status, 400);
      const tokenBody = z.object({ error: z.string() }).parse(await withToken.json());
      assert.ok(tokenBody.error.includes("continuationToken"));

      const hitlOnly = await handler(
        postJson(`/eve/v1/session/${sessionId}`, {
          inputResponses: [{ requestId: "r1", optionId: "yes" }],
        }),
      );
      assert.strictEqual(hitlOnly.status, 400);
      const body = z.object({ error: z.string() }).parse(await hitlOnly.json());
      assert.ok(body.error.includes("inputResponses"));
    });
  });

  describe("failures", () => {
    test("streams turn.failed + session.failed when mockResponse throws", async () => {
      const handler = createStaticEveHandler({
        // eslint-disable-next-line require-yield
        async *mockResponse() {
          throw new Error("Scripted failure.");
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const types = events.map((event) => event.type);
      assert.deepEqual(types, [
        "session.started",
        "turn.started",
        "message.received",
        "turn.failed",
        "session.failed",
      ]);
      const failed = events.at(-1);
      if (failed?.type === "session.failed") {
        assert.strictEqual(failed.data.message, "Scripted failure.");
        assert.strictEqual(failed.data.code, "MOCK_RESPONSE_FAILED");
        assert.strictEqual(failed.data.sessionId, sessionId);
      }
    });

    test("treats an empty mockResponse as a failure", async () => {
      const handler = createStaticEveHandler({
        async *mockResponse() {
          // yields nothing
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      assert.strictEqual(events.at(-1)?.type, "session.failed");
    });
  });

  describe("routing and CORS", () => {
    test("routes under any mount prefix", async () => {
      const handler = textHandler();
      const response = await handler(
        new Request(`${HOST}/api/mock/abc123/eve/v1/session`, {
          method: "POST",
          body: JSON.stringify({ message: "hi" }),
        }),
      );
      assert.strictEqual(response.status, 202);
    });

    test("serves health and 404s unknown routes", async () => {
      const handler = textHandler();

      const health = await handler(createRequest("/eve/v1/health"));
      assert.strictEqual(health.status, 200);
      const healthBody: unknown = await health.json();
      assert.partialDeepStrictEqual(healthBody, { ok: true, status: "ready" });

      const notEve = await handler(createRequest("/api/chat"));
      assert.strictEqual(notEve.status, 404);

      const unknown = await handler(createRequest("/eve/v1/nope"));
      assert.strictEqual(unknown.status, 404);
    });

    test("answers preflight and exposes eve headers by default", async () => {
      const handler = textHandler();

      const preflight = await handler(createRequest("/eve/v1/session", { method: "OPTIONS" }));
      assert.strictEqual(preflight.status, 204);
      assert.strictEqual(preflight.headers.get("access-control-allow-origin"), "*");

      const { sessionId } = await createSession(handler);
      const stream = await handler(createRequest(`/eve/v1/session/${sessionId}/stream`));
      assert.ok(stream.headers.get("access-control-expose-headers")?.includes("x-eve-session-id"));
    });

    test("supports cors: false and single-origin cors", async () => {
      const noCors = createStaticEveHandler({
        cors: false,
        async *mockResponse() {
          yield { type: "text", text: "x" };
        },
      });
      const response = await noCors(postJson("/eve/v1/session", { message: "hi" }));
      assert.strictEqual(response.headers.get("access-control-allow-origin"), null);

      const singleOrigin = createStaticEveHandler({
        cors: { origin: "https://demo.test" },
        async *mockResponse() {
          yield { type: "text", text: "x" };
        },
      });
      const scoped = await singleOrigin(postJson("/eve/v1/session", { message: "hi" }));
      assert.strictEqual(scoped.headers.get("access-control-allow-origin"), "https://demo.test");
    });
  });

  describe("options", () => {
    test("uses injected sessionStore, generateSessionId, and now", async () => {
      const store = createMemoryEveSessionStore();
      const handler = createStaticEveHandler({
        sessionStore: store,
        generateSessionId: () => "fixed-session",
        now: () => new Date("2026-07-09T00:00:00.000Z"),
        async *mockResponse() {
          yield { type: "text", text: "x" };
        },
      });

      const { sessionId } = await createSession(handler);
      assert.strictEqual(sessionId, "fixed-session");

      const record = await store.get("fixed-session");
      assert.notStrictEqual(record, undefined);
      assert.strictEqual(
        record?.events.every((event) => event.meta?.at === "2026-07-09T00:00:00.000Z"),
        true,
      );
    });

    test("passes clientContext through as requestMetadata", async () => {
      const seen: unknown[] = [];
      const handler = createStaticEveHandler({
        async *mockResponse({ requestMetadata }) {
          seen.push(requestMetadata);
          yield { type: "text", text: "x" };
        },
      });

      await handler(
        postJson("/eve/v1/session", { message: "hi", clientContext: { page: "/pricing" } }),
      );
      assert.deepEqual(seen, [{ page: "/pricing" }]);
    });

    test("applies chunk delays only to content events", async () => {
      const delayed: string[] = [];
      const handler = createStaticEveHandler({
        chunkDelayMs: (event) => {
          delayed.push(event.type);
          return 0;
        },
        async *mockResponse() {
          yield { type: "text", text: "a b" };
        },
      });
      const { sessionId } = await createSession(handler);
      await streamEvents(handler, sessionId);

      assert.deepEqual(new Set(delayed), new Set(["message.appended"]));
      assert.strictEqual(delayed.length, 3); // "a", " ", "b"
    });
  });
});

describe("integration with the real eve client", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function importEveClient() {
    return import("eve/client");
  }

  function stubFetchWith(handler: (request: Request) => Promise<Response>) {
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
      handler(new Request(input, init));
  }

  test("completes a two-turn conversation through eve's ClientSession", async () => {
    const { Client } = await importEveClient();
    const handler = createStaticEveHandler({
      autoChunkText: false,
      async *mockResponse({ messages }) {
        yield { type: "text", text: `Turn ${Math.ceil(messages.length / 2)} reply` };
      },
    });
    stubFetchWith(handler);

    const client = new Client({ host: HOST });
    const { session, response: first } = await client.sessions.create({ message: "hello" });

    const firstEvents = [];
    for await (const event of first) {
      firstEvents.push(event);
    }
    assert.strictEqual(firstEvents.at(-1)?.type, "session.waiting");
    assert.strictEqual(session.state.sessionId, first.sessionId);
    assert.strictEqual(session.state.streamIndex, firstEvents.length);

    const second = await session.send("again");
    const result = await second.result();
    assert.strictEqual(result.status, "waiting");
    assert.strictEqual(result.message, "Turn 2 reply");
  });

  test("surfaces scripted failures as a failed session", async () => {
    const { Client } = await importEveClient();
    const handler = createStaticEveHandler({
      // eslint-disable-next-line require-yield
      async *mockResponse() {
        throw new Error("Scripted failure.");
      },
    });
    stubFetchWith(handler);

    const client = new Client({ host: HOST });
    const { response } = await client.sessions.create({ message: "hello" });

    const events = [];
    for await (const event of response) {
      events.push(event);
    }
    assert.strictEqual(events.at(-1)?.type, "session.failed");
  });

  test("renders tool turns through eve's default message reducer shape", async () => {
    const { Client } = await importEveClient();
    const handler = createStaticEveHandler({
      autoChunkText: false,
      async *mockResponse() {
        yield {
          type: "tool-weather",
          toolCallId: "call_1",
          state: "output-available",
          input: { location: "SF" },
          output: { tempF: 68 },
        };
        yield { type: "text", text: "68F and sunny." };
      },
    });
    stubFetchWith(handler);

    const client = new Client({ host: HOST });
    const { response } = await client.sessions.create({ message: "weather?" });
    const result = await response.result();

    assert.strictEqual(result.status, "waiting");
    assert.strictEqual(result.message, "68F and sunny.");
    const actionEvents = result.events.filter(
      (event) => event.type === "actions.requested" || event.type === "action.result",
    );
    assert.strictEqual(actionEvents.length, 2);
  });

  test("serves bounded reads through eve's ClientSession.snapshot", async () => {
    const { Client } = await importEveClient();
    const handler = createStaticEveHandler({
      autoChunkText: false,
      async *mockResponse() {
        yield { type: "text", text: "Only reply" };
      },
    });
    stubFetchWith(handler);

    const client = new Client({ host: HOST });
    const { session, response } = await client.sessions.create({ message: "hello" });
    const result = await response.result();

    const snapshot = await session.snapshot();
    assert.deepEqual(
      snapshot.events.map((event) => event.type),
      result.events.map((event) => event.type),
    );
    assert.strictEqual(snapshot.session.streamIndex, result.events.length);
  });
});

describe("type parity with StaticChatTransport", () => {
  test("accepts the same mockResponse function for both transports", async () => {
    const { StaticChatTransport } = await import("./index");

    async function* sharedMockResponse() {
      yield { type: "text" as const, text: "shared" };
    }

    // Compile-time parity: the same generator function satisfies both APIs.
    const transport = new StaticChatTransport<UIMessage>({ mockResponse: sharedMockResponse });
    const handler = createStaticEveHandler<UIMessage>({ mockResponse: sharedMockResponse });

    assert.notStrictEqual(transport, undefined);
    const response = await handler(postJson("/eve/v1/session", { message: "hi" }));
    assert.strictEqual(response.status, 202);
  });
});
