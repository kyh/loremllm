import type { UIMessage } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EveStreamEvent } from "./eve";
import { createMemoryEveSessionStore, createStaticEveHandler } from "./eve";

const HOST = "https://mock.test";

function createRequest(path: string, init?: RequestInit): Request {
  return new Request(`${HOST}${path}`, init);
}

function postJson(path: string, body: unknown): Request {
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
    .map((line) => JSON.parse(line) as EveStreamEvent);
}

type CreateResult = { sessionId: string; continuationToken: string };

async function createSession(
  handler: (request: Request) => Promise<Response>,
  message: unknown = "hello",
): Promise<CreateResult> {
  const response = await handler(postJson("/eve/v1/session", { message }));
  expect(response.status).toBe(202);
  const body = (await response.json()) as {
    sessionId: string;
    continuationToken: string;
    ok: boolean;
  };
  expect(body.ok).toBe(true);
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
  expect(response.status).toBe(200);
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
    vi.unstubAllGlobals();
  });

  describe("session creation", () => {
    it("returns 202 with sessionId, continuationToken, and session header", async () => {
      const handler = textHandler();
      const response = await handler(postJson("/eve/v1/session", { message: "hi" }));

      expect(response.status).toBe(202);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body.ok).toBe(true);
      expect(typeof body.sessionId).toBe("string");
      expect(typeof body.continuationToken).toBe("string");
      expect(response.headers.get("x-eve-session-id")).toBe(body.sessionId);
    });

    it("accepts message part arrays and joins text parts", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler, [
        { type: "text", text: "first" },
        { type: "text", text: "second" },
      ]);

      const events = await streamEvents(handler, sessionId);
      const received = events.find((event) => event.type === "message.received");
      expect(received).toBeDefined();
      if (received?.type === "message.received") {
        expect(received.data.message).toBe("first\n\nsecond");
        expect(received.data.parts).toEqual([
          { type: "text", text: "first" },
          { type: "text", text: "second" },
        ]);
      }
    });

    it("rejects invalid bodies with 400", async () => {
      const handler = textHandler();

      const noMessage = await handler(postJson("/eve/v1/session", {}));
      expect(noMessage.status).toBe(400);

      const emptyMessage = await handler(postJson("/eve/v1/session", { message: "" }));
      expect(emptyMessage.status).toBe(400);

      const badJson = await handler(
        createRequest("/eve/v1/session", { method: "POST", body: "not json" }),
      );
      expect(badJson.status).toBe(400);
    });

    it("rejects non-POST methods with 405", async () => {
      const handler = textHandler();
      const response = await handler(createRequest("/eve/v1/session"));
      expect(response.status).toBe(405);
    });
  });

  describe("event stream", () => {
    it("emits the canonical text turn sequence with protocol headers", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler, "hi");

      const response = await handler(createRequest(`/eve/v1/session/${sessionId}/stream`));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/x-ndjson; charset=utf-8");
      expect(response.headers.get("x-eve-stream-format")).toBe("ndjson");
      expect(response.headers.get("x-eve-stream-version")).toBe("18");
      expect(response.headers.get("x-eve-session-id")).toBe(sessionId);

      const events = await readEvents(response);
      expect(events.map((event) => event.type)).toEqual([
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
      ]);
    });

    it("streams cumulative messageSoFar values", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const appended = events.filter((event) => event.type === "message.appended");
      const soFars = appended.map((event) =>
        event.type === "message.appended" ? event.data.messageSoFar : "",
      );
      expect(soFars).toEqual(["Hello", "Hello ", "Hello there"]);

      const completed = events.find((event) => event.type === "message.completed");
      if (completed?.type === "message.completed") {
        expect(completed.data.message).toBe("Hello there");
        expect(completed.data.finishReason).toBe("stop");
      }
    });

    it("respects autoChunkText: false", async () => {
      const handler = createStaticEveHandler({
        autoChunkText: false,
        async *mockResponse() {
          yield { type: "text", text: "Hello there" };
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const appended = events.filter((event) => event.type === "message.appended");
      expect(appended).toHaveLength(1);
    });

    it("slices the log by startIndex and stamps meta.at timestamps", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler);

      const all = await streamEvents(handler, sessionId);
      const sliced = await streamEvents(handler, sessionId, 4);
      expect(sliced).toEqual(all.slice(4));
      expect(all.every((event) => typeof event.meta?.at === "string")).toBe(true);
    });

    it("rejects invalid startIndex and unknown sessions", async () => {
      const handler = textHandler();
      const { sessionId } = await createSession(handler);

      const invalid = await handler(
        createRequest(`/eve/v1/session/${sessionId}/stream?startIndex=-1`),
      );
      expect(invalid.status).toBe(400);

      const unknown = await handler(createRequest("/eve/v1/session/nope/stream"));
      expect(unknown.status).toBe(404);
    });
  });

  describe("part translation", () => {
    it("translates reasoning parts before text in the same step", async () => {
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
      expect(types).toEqual([
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
      expect(stepIndexes).toEqual([0, 0]);
    });

    it("translates tool calls into actions.requested + action.result across steps", async () => {
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
      expect(requested).toBeDefined();
      if (requested?.type === "actions.requested") {
        expect(requested.data.actions).toEqual([
          { callId: "call_1", input: { location: "SF" }, kind: "tool-call", toolName: "weather" },
        ]);
      }

      const result = events.find((event) => event.type === "action.result");
      if (result?.type === "action.result") {
        expect(result.data.status).toBe("completed");
        expect(result.data.result).toEqual({
          callId: "call_1",
          kind: "tool-result",
          output: { tempF: 68 },
          toolName: "weather",
        });
      }

      // Tool step and text step share stepIndex 0: no text preceded the tool.
      const stepStarts = events.filter((event) => event.type === "step.started");
      expect(stepStarts).toHaveLength(1);
    });

    it("breaks to a new step when a tool follows streamed text", async () => {
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
      expect(stepStarts).toHaveLength(2);

      const requested = events.find((event) => event.type === "actions.requested");
      if (requested?.type === "actions.requested") {
        expect(requested.data.stepIndex).toBe(1);
      }
    });

    it("translates tool errors into failed action results", async () => {
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
        expect(result.data.status).toBe("failed");
        expect(result.data.error).toEqual({
          code: "TOOL_EXECUTION_FAILED",
          message: "Search unavailable.",
        });
        expect(result.data.result.isError).toBe(true);
      }
    });

    it("rejects parts with no eve representation via turn failure", async () => {
      const handler = createStaticEveHandler({
        async *mockResponse() {
          yield { type: "data-chart", data: { rows: [] } };
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const failed = events.find((event) => event.type === "turn.failed");
      expect(failed).toBeDefined();
      if (failed?.type === "turn.failed") {
        expect(failed.data.message).toContain('"data-chart"');
      }
      expect(events.at(-1)?.type).toBe("session.failed");
    });
  });

  describe("multi-turn conversations", () => {
    it("continues a session and passes accumulated history to mockResponse", async () => {
      const seenHistories: string[][] = [];
      const handler = createStaticEveHandler({
        autoChunkText: false,
        async *mockResponse({ messages }) {
          seenHistories.push(messages.map((message) => `${message.role}:${message.id}`));
          yield { type: "text", text: `Reply ${messages.length}` };
        },
      });

      const { sessionId, continuationToken } = await createSession(handler, "one");
      const firstTurn = await streamEvents(handler, sessionId);

      const continueResponse = await handler(
        postJson(`/eve/v1/session/${sessionId}`, { continuationToken, message: "two" }),
      );
      expect(continueResponse.status).toBe(200);
      const continueBody = (await continueResponse.json()) as Record<string, unknown>;
      expect(continueBody).toEqual({ ok: true, sessionId });

      const secondTurn = await streamEvents(handler, sessionId, firstTurn.length);
      expect(secondTurn[0]?.type).toBe("turn.started"); // no session.started on turn 2
      expect(secondTurn.at(-1)?.type).toBe("session.waiting");

      expect(seenHistories).toEqual([
        ["user:turn-1:user"],
        ["user:turn-1:user", "assistant:turn-1:assistant", "user:turn-2:user"],
      ]);

      const turnIds = secondTurn
        .filter((event) => event.type === "turn.started")
        .map((event) => (event.type === "turn.started" ? event.data.turnId : ""));
      expect(turnIds).toEqual(["turn-2"]);
    });

    it("keeps sequence numbers session-monotonic across turns", async () => {
      const handler = textHandler();
      const { sessionId, continuationToken } = await createSession(handler);
      await handler(
        postJson(`/eve/v1/session/${sessionId}`, { continuationToken, message: "again" }),
      );

      const events = await streamEvents(handler, sessionId);
      const sequences = events.flatMap((event) =>
        "sequence" in event.data && typeof event.data.sequence === "number"
          ? [event.data.sequence]
          : [],
      );
      const sorted = [...sequences].sort((a, b) => a - b);
      expect(sequences).toEqual(sorted);
      expect(new Set(sequences).size).toBe(sequences.length);
    });

    it("rejects continues for unknown sessions, missing tokens, and HITL-only turns", async () => {
      const handler = textHandler();
      const { sessionId, continuationToken } = await createSession(handler);

      const unknown = await handler(
        postJson("/eve/v1/session/nope", { continuationToken, message: "hi" }),
      );
      expect(unknown.status).toBe(404);

      const missingToken = await handler(
        postJson(`/eve/v1/session/${sessionId}`, { message: "hi" }),
      );
      expect(missingToken.status).toBe(400);

      const hitlOnly = await handler(
        postJson(`/eve/v1/session/${sessionId}`, {
          continuationToken,
          inputResponses: [{ requestId: "r1", optionId: "yes" }],
        }),
      );
      expect(hitlOnly.status).toBe(400);
      const body = (await hitlOnly.json()) as { error: string };
      expect(body.error).toContain("inputResponses");
    });
  });

  describe("failures", () => {
    it("streams turn.failed + session.failed when mockResponse throws", async () => {
      const handler = createStaticEveHandler({
        // eslint-disable-next-line require-yield
        async *mockResponse() {
          throw new Error("Scripted failure.");
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      const types = events.map((event) => event.type);
      expect(types).toEqual([
        "session.started",
        "turn.started",
        "message.received",
        "turn.failed",
        "session.failed",
      ]);
      const failed = events.at(-1);
      if (failed?.type === "session.failed") {
        expect(failed.data.message).toBe("Scripted failure.");
        expect(failed.data.code).toBe("MOCK_RESPONSE_FAILED");
        expect(failed.data.sessionId).toBe(sessionId);
      }
    });

    it("treats an empty mockResponse as a failure", async () => {
      const handler = createStaticEveHandler({
        async *mockResponse() {
          // yields nothing
        },
      });
      const { sessionId } = await createSession(handler);

      const events = await streamEvents(handler, sessionId);
      expect(events.at(-1)?.type).toBe("session.failed");
    });
  });

  describe("routing and CORS", () => {
    it("routes under any mount prefix", async () => {
      const handler = textHandler();
      const response = await handler(
        new Request(`${HOST}/api/mock/abc123/eve/v1/session`, {
          method: "POST",
          body: JSON.stringify({ message: "hi" }),
        }),
      );
      expect(response.status).toBe(202);
    });

    it("serves health and 404s unknown routes", async () => {
      const handler = textHandler();

      const health = await handler(createRequest("/eve/v1/health"));
      expect(health.status).toBe(200);
      const healthBody = (await health.json()) as { ok: boolean; status: string };
      expect(healthBody).toMatchObject({ ok: true, status: "ready" });

      const notEve = await handler(createRequest("/api/chat"));
      expect(notEve.status).toBe(404);

      const unknown = await handler(createRequest("/eve/v1/nope"));
      expect(unknown.status).toBe(404);
    });

    it("answers preflight and exposes eve headers by default", async () => {
      const handler = textHandler();

      const preflight = await handler(createRequest("/eve/v1/session", { method: "OPTIONS" }));
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("access-control-allow-origin")).toBe("*");

      const { sessionId } = await createSession(handler);
      const stream = await handler(createRequest(`/eve/v1/session/${sessionId}/stream`));
      expect(stream.headers.get("access-control-expose-headers")).toContain("x-eve-session-id");
    });

    it("supports cors: false and single-origin cors", async () => {
      const noCors = createStaticEveHandler({
        cors: false,
        async *mockResponse() {
          yield { type: "text", text: "x" };
        },
      });
      const response = await noCors(postJson("/eve/v1/session", { message: "hi" }));
      expect(response.headers.get("access-control-allow-origin")).toBeNull();

      const singleOrigin = createStaticEveHandler({
        cors: { origin: "https://demo.test" },
        async *mockResponse() {
          yield { type: "text", text: "x" };
        },
      });
      const scoped = await singleOrigin(postJson("/eve/v1/session", { message: "hi" }));
      expect(scoped.headers.get("access-control-allow-origin")).toBe("https://demo.test");
    });
  });

  describe("options", () => {
    it("uses injected sessionStore, generateSessionId, and now", async () => {
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
      expect(sessionId).toBe("fixed-session");

      const record = await store.get("fixed-session");
      expect(record).toBeDefined();
      expect(record?.events.every((event) => event.meta?.at === "2026-07-09T00:00:00.000Z")).toBe(
        true,
      );
    });

    it("passes clientContext through as requestMetadata", async () => {
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
      expect(seen).toEqual([{ page: "/pricing" }]);
    });

    it("applies chunk delays only to content events", async () => {
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

      expect(new Set(delayed)).toEqual(new Set(["message.appended"]));
      expect(delayed).toHaveLength(3); // "a", " ", "b"
    });
  });
});

describe("integration with the real eve client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function importEveClient() {
    return import("eve/client");
  }

  function stubFetchWith(handler: (request: Request) => Promise<Response>) {
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      handler(new Request(input, init)),
    );
  }

  it("completes a two-turn conversation through eve's ClientSession", async () => {
    const { Client } = await importEveClient();
    const handler = createStaticEveHandler({
      autoChunkText: false,
      async *mockResponse({ messages }) {
        yield { type: "text", text: `Turn ${Math.ceil(messages.length / 2)} reply` };
      },
    });
    stubFetchWith(handler);

    const client = new Client({ host: HOST });
    const session = client.session();

    const first = await session.send("hello");
    const firstEvents = [];
    for await (const event of first) {
      firstEvents.push(event);
    }
    expect(firstEvents.at(-1)?.type).toBe("session.waiting");
    expect(session.state.sessionId).toBeDefined();
    expect(session.state.streamIndex).toBe(firstEvents.length);

    const second = await session.send("again");
    const result = await second.result();
    expect(result.status).toBe("waiting");
    expect(result.message).toBe("Turn 2 reply");
  });

  it("surfaces scripted failures as a failed session", async () => {
    const { Client } = await importEveClient();
    const handler = createStaticEveHandler({
      // eslint-disable-next-line require-yield
      async *mockResponse() {
        throw new Error("Scripted failure.");
      },
    });
    stubFetchWith(handler);

    const client = new Client({ host: HOST });
    const session = client.session();

    const response = await session.send("hello");
    const events = [];
    for await (const event of response) {
      events.push(event);
    }
    expect(events.at(-1)?.type).toBe("session.failed");
  });

  it("renders tool turns through eve's default message reducer shape", async () => {
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
    const session = client.session();
    const response = await session.send("weather?");
    const result = await response.result();

    expect(result.status).toBe("waiting");
    expect(result.message).toBe("68F and sunny.");
    const actionEvents = result.events.filter(
      (event) => event.type === "actions.requested" || event.type === "action.result",
    );
    expect(actionEvents).toHaveLength(2);
  });
});

describe("type parity with StaticChatTransport", () => {
  it("accepts the same mockResponse function for both transports", async () => {
    const { StaticChatTransport } = await import("./index");

    async function* sharedMockResponse() {
      yield { type: "text" as const, text: "shared" };
    }

    // Compile-time parity: the same generator function satisfies both APIs.
    const transport = new StaticChatTransport<UIMessage>({ mockResponse: sharedMockResponse });
    const handler = createStaticEveHandler<UIMessage>({ mockResponse: sharedMockResponse });

    expect(transport).toBeDefined();
    const response = await handler(postJson("/eve/v1/session", { message: "hi" }));
    expect(response.status).toBe(202);
  });
});
