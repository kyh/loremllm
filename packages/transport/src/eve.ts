import type { UIMessage } from "ai";

import type { SpecialToolPart, StaticChatTransportInit, StaticTransportContext } from "./index.ts";
import type { DelayResolver } from "./shared.ts";
import { resolveChunkDelay, segmentText, sleep } from "./shared.ts";

/**
 * Static mock server for the eve agent framework (https://eve.dev).
 *
 * Implements the three HTTP routes `useEveAgent` / `eve/client` talk to —
 * create session, continue session, and the NDJSON event stream — and answers
 * every turn from the same `mockResponse` generator API used by
 * `StaticChatTransport`. Point `useEveAgent({ host })` at wherever the handler
 * is mounted and the UI renders scripted responses with zero backend and zero
 * model fees.
 *
 * Wire format targets eve stream protocol version 18 (eve 0.22.x).
 */

// ---------------------------------------------------------------------------
// eve wire protocol (stream version 18)
// ---------------------------------------------------------------------------

const EVE_ROUTE_PREFIX = "/eve/v1/";
const EVE_SESSION_ID_HEADER = "x-eve-session-id";
const EVE_STREAM_FORMAT_HEADER = "x-eve-stream-format";
const EVE_STREAM_VERSION_HEADER = "x-eve-stream-version";
const EVE_MESSAGE_STREAM_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";
const EVE_MESSAGE_STREAM_FORMAT = "ndjson";
const EVE_MESSAGE_STREAM_VERSION = "18";

type JsonObject = { [key: string]: unknown };

type AssistantStepFinishReason =
  | "content-filter"
  | "error"
  | "length"
  | "other"
  | "stop"
  | "tool-calls";

type EveEventMeta = { at: string };

type EveToolCallAction = {
  callId: string;
  input: JsonObject;
  kind: "tool-call";
  toolName: string;
};

type EveToolResult = {
  callId: string;
  isError?: boolean;
  kind: "tool-result";
  output: unknown;
  toolName: string;
};

type EveMessageReceivedPart =
  | { type: "text"; text: string }
  | { type: "file"; mediaType: string; filename?: string; url?: string };

/**
 * The subset of eve `HandleMessageStreamEvent`s a static mock emits.
 * Shapes match the eve wire protocol (stream version 18) exactly.
 */
export type EveStreamEvent = (
  | { type: "session.started"; data: JsonObject }
  | { type: "turn.started"; data: { sequence: number; turnId: string } }
  | {
      type: "message.received";
      data: {
        message: string;
        parts?: EveMessageReceivedPart[];
        sequence: number;
        turnId: string;
      };
    }
  | { type: "step.started"; data: { sequence: number; stepIndex: number; turnId: string } }
  | {
      type: "reasoning.appended";
      data: {
        reasoningDelta: string;
        reasoningSoFar: string;
        sequence: number;
        stepIndex: number;
        turnId: string;
      };
    }
  | {
      type: "reasoning.completed";
      data: { reasoning: string; sequence: number; stepIndex: number; turnId: string };
    }
  | {
      type: "message.appended";
      data: {
        messageDelta: string;
        messageSoFar: string;
        sequence: number;
        stepIndex: number;
        turnId: string;
      };
    }
  | {
      type: "message.completed";
      data: {
        finishReason: AssistantStepFinishReason;
        message: string | null;
        sequence: number;
        stepIndex: number;
        turnId: string;
      };
    }
  | {
      type: "actions.requested";
      data: { actions: EveToolCallAction[]; sequence: number; stepIndex: number; turnId: string };
    }
  | {
      type: "action.result";
      data: {
        error?: { code: string; message: string };
        result: EveToolResult;
        sequence: number;
        stepIndex: number;
        status: "completed" | "failed";
        turnId: string;
      };
    }
  | {
      type: "step.completed";
      data: {
        finishReason: AssistantStepFinishReason;
        sequence: number;
        stepIndex: number;
        turnId: string;
      };
    }
  | { type: "turn.completed"; data: { sequence: number; turnId: string } }
  | {
      type: "turn.failed";
      data: { code: string; message: string; sequence: number; turnId: string };
    }
  | { type: "session.waiting"; data: { wait: "next-user-message" } }
  | { type: "session.failed"; data: { code: string; message: string; sessionId: string } }
) & { meta?: EveEventMeta };

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------

/**
 * Everything the handler persists for one eve session. JSON-serializable so
 * stores can be backed by a database or KV in serverless deployments.
 */
export type EveSessionRecord<UI_MESSAGE extends UIMessage = UIMessage> = {
  /** Continuation token minted at session creation, echoed by the client on continues. */
  continuationToken: string;
  /** Full NDJSON event log; the stream route serves slices of it (`startIndex` replay). */
  events: EveStreamEvent[];
  /** Conversation history projected as `UIMessage`s, passed to `mockResponse` as context. */
  messages: UI_MESSAGE[];
  /** Session-monotonic counter for the `sequence` field on emitted events. */
  nextSequence: number;
  /** Number of completed turns; used to mint stable per-turn ids. */
  turnCount: number;
};

/**
 * Persistence seam for sessions. The default is an in-memory Map
 * ({@link createMemoryEveSessionStore}), which suits single-process servers,
 * tests, and dev. Serverless deployments should back this with shared storage —
 * the create-POST and the stream-GET for one turn can hit different instances.
 */
export type EveSessionStore<UI_MESSAGE extends UIMessage = UIMessage> = {
  get(sessionId: string): Promise<EveSessionRecord<UI_MESSAGE> | undefined>;
  set(sessionId: string, record: EveSessionRecord<UI_MESSAGE>): Promise<void>;
};

/** Creates the default in-memory {@link EveSessionStore}. */
export function createMemoryEveSessionStore<
  UI_MESSAGE extends UIMessage = UIMessage,
>(): EveSessionStore<UI_MESSAGE> {
  const sessions = new Map<string, EveSessionRecord<UI_MESSAGE>>();
  return {
    get(sessionId) {
      return Promise.resolve(sessions.get(sessionId));
    },
    set(sessionId, record) {
      sessions.set(sessionId, record);
      return Promise.resolve();
    },
  };
}

/**
 * Parses a value read back from external storage (a JSON column, KV, etc.)
 * into an {@link EveSessionRecord}. Returns `undefined` when the value does
 * not have the record's shape, so stale or foreign rows surface as
 * session-not-found instead of runtime errors.
 *
 * Validation is structural on the record and shallow on `events`/`messages`
 * elements — the record is trusted to have been written by this handler.
 */
export function parseEveSessionRecord<UI_MESSAGE extends UIMessage = UIMessage>(
  value: unknown,
): EveSessionRecord<UI_MESSAGE> | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record: Partial<Record<keyof EveSessionRecord, unknown>> = value;
  if (
    typeof record.continuationToken !== "string" ||
    typeof record.nextSequence !== "number" ||
    typeof record.turnCount !== "number" ||
    !Array.isArray(record.events) ||
    !Array.isArray(record.messages)
  ) {
    return undefined;
  }
  const isEventShaped = (event: unknown): event is EveStreamEvent =>
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    typeof event.type === "string";
  const isMessageShaped = (message: unknown): message is UI_MESSAGE =>
    typeof message === "object" &&
    message !== null &&
    "id" in message &&
    typeof message.id === "string" &&
    "role" in message &&
    typeof message.role === "string" &&
    "parts" in message &&
    Array.isArray(message.parts);
  if (!record.events.every(isEventShaped) || !record.messages.every(isMessageShaped)) {
    return undefined;
  }
  return {
    continuationToken: record.continuationToken,
    events: record.events,
    messages: record.messages,
    nextSequence: record.nextSequence,
    turnCount: record.turnCount,
  };
}

// ---------------------------------------------------------------------------
// Handler options
// ---------------------------------------------------------------------------

/**
 * Delay between streamed eve events to simulate generation. Same shapes as
 * `StaticChatTransport`'s `chunkDelayMs`; the function form receives the eve
 * event about to be emitted. Delays apply to content events
 * (`message.appended`, `reasoning.appended`, `actions.requested`,
 * `action.result`); lifecycle events are emitted immediately.
 */
export type EveChunkDelayResolver = DelayResolver<EveStreamEvent>;

export type StaticEveHandlerInit<UI_MESSAGE extends UIMessage = UIMessage> = {
  /**
   * Async generator that yields message parts for each turn — the exact same
   * option (and function) as `StaticChatTransport`'s `mockResponse`. Supported
   * part types on the eve wire: `text`, `reasoning`, `tool-*`, `dynamic-tool`,
   * and `step-start`. Parts with no eve representation (`file`, `source-*`,
   * `data-*`) throw so the issue is flagged instead of silently dropped.
   */
  mockResponse: StaticChatTransportInit<UI_MESSAGE>["mockResponse"];
  /** See {@link EveChunkDelayResolver}. */
  chunkDelayMs?: EveChunkDelayResolver;
  /**
   * Whether to chunk text into `message.appended` events word-by-word (`true`,
   * default), as a single event (`false`), or by a custom pattern (`RegExp`).
   */
  autoChunkText?: boolean | RegExp;
  /** Same as {@link StaticEveHandlerInit.autoChunkText}, for reasoning parts. */
  autoChunkReasoning?: boolean | RegExp;
  /** Session persistence. Defaults to {@link createMemoryEveSessionStore}. */
  sessionStore?: EveSessionStore<UI_MESSAGE>;
  /**
   * CORS behavior. `true` (default) allows any origin and exposes the
   * `x-eve-*` headers the eve client reads — required whenever the UI runs on
   * a different origin than the handler. `false` emits no CORS headers.
   * Pass `{ origin }` to allow a single origin.
   */
  cors?: boolean | { origin: string };
  /** Override session id generation (useful for deterministic tests). */
  generateSessionId?: () => string;
  /** Override event timestamps (useful for deterministic tests). */
  now?: () => Date;
};

/**
 * A WinterCG fetch handler: mount it wherever a `Request => Response` function
 * runs (Next.js route handlers, Hono, Bun.serve, service workers, or a stubbed
 * global `fetch` in tests).
 */
export type StaticEveHandler = (request: Request) => Promise<Response>;

// ---------------------------------------------------------------------------
// Request body parsing
// ---------------------------------------------------------------------------

type ParsedUserMessage = {
  text: string;
  receivedParts: EveMessageReceivedPart[];
};

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates and flattens the `message` field of a create/continue body
 * (`string | Array<TextPart | FilePart>`). Returns `undefined` when invalid.
 */
function parseUserMessage(message: unknown): ParsedUserMessage | undefined {
  if (typeof message === "string") {
    if (message.length === 0) {
      return undefined;
    }
    return { text: message, receivedParts: [{ type: "text", text: message }] };
  }

  if (!Array.isArray(message) || message.length === 0) {
    return undefined;
  }

  const texts: string[] = [];
  const receivedParts: EveMessageReceivedPart[] = [];
  for (const part of message) {
    if (!isJsonObject(part)) {
      return undefined;
    }
    if (part.type === "text" && typeof part.text === "string" && part.text.length > 0) {
      texts.push(part.text);
      receivedParts.push({ type: "text", text: part.text });
      continue;
    }
    if (part.type === "file" && typeof part.mediaType === "string") {
      receivedParts.push({
        type: "file",
        mediaType: part.mediaType,
        filename: typeof part.filename === "string" ? part.filename : undefined,
      });
      continue;
    }
    return undefined;
  }

  if (texts.length === 0) {
    return undefined;
  }

  return { text: texts.join("\n\n"), receivedParts };
}

// ---------------------------------------------------------------------------
// Part → event translation
// ---------------------------------------------------------------------------

type ToolLikePart = {
  type: string;
  toolCallId: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function toolNameForPart(part: ToolLikePart): string {
  if (typeof part.toolName === "string" && part.toolName.length > 0) {
    return part.toolName;
  }
  if (part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }
  return "tool";
}

type TurnBuilder = {
  events: EveStreamEvent[];
  nextSequence: number;
  stepIndex: number;
  stepOpen: boolean;
  stepHasText: boolean;
  stepHasTools: boolean;
  turnId: string;
};

function stamp(builder: TurnBuilder, event: EveStreamEvent, at: string): void {
  builder.events.push({ ...event, meta: { at } });
}

function openStep(builder: TurnBuilder, at: string): void {
  if (builder.stepOpen) {
    return;
  }
  stamp(
    builder,
    {
      type: "step.started",
      data: {
        sequence: builder.nextSequence++,
        stepIndex: builder.stepIndex,
        turnId: builder.turnId,
      },
    },
    at,
  );
  builder.stepOpen = true;
  builder.stepHasText = false;
  builder.stepHasTools = false;
}

function closeStep(builder: TurnBuilder, at: string): void {
  if (!builder.stepOpen) {
    return;
  }
  const finishReason: AssistantStepFinishReason =
    !builder.stepHasText && builder.stepHasTools ? "tool-calls" : "stop";
  stamp(
    builder,
    {
      type: "step.completed",
      data: {
        finishReason,
        sequence: builder.nextSequence++,
        stepIndex: builder.stepIndex,
        turnId: builder.turnId,
      },
    },
    at,
  );
  builder.stepOpen = false;
  builder.stepIndex += 1;
}

/** Closes the current step and opens the next when `condition` holds. */
function breakStepIf(builder: TurnBuilder, condition: boolean, at: string): void {
  if (condition && builder.stepOpen) {
    closeStep(builder, at);
  }
}

/**
 * Translates one turn's collected parts into the eve event sequence the
 * default `useEveAgent` reducer renders. Steps mirror the real runtime: one
 * text message per step, tool calls break to a fresh step after streamed text.
 */
function createTurnEvents<UI_MESSAGE extends UIMessage>(input: {
  parts: Array<UI_MESSAGE["parts"][number] | SpecialToolPart>;
  turnId: string;
  isFirstTurn: boolean;
  startSequence: number;
  userMessage: ParsedUserMessage;
  autoChunkText: boolean | RegExp;
  autoChunkReasoning: boolean | RegExp;
  at: () => string;
}): { events: EveStreamEvent[]; nextSequence: number } {
  const builder: TurnBuilder = {
    events: [],
    nextSequence: input.startSequence,
    stepIndex: 0,
    stepOpen: false,
    stepHasText: false,
    stepHasTools: false,
    turnId: input.turnId,
  };
  const { at, turnId } = input;

  if (input.isFirstTurn) {
    stamp(builder, { type: "session.started", data: {} }, at());
  }
  stamp(
    builder,
    { type: "turn.started", data: { sequence: builder.nextSequence++, turnId } },
    at(),
  );
  stamp(
    builder,
    {
      type: "message.received",
      data: {
        message: input.userMessage.text,
        parts: input.userMessage.receivedParts,
        sequence: builder.nextSequence++,
        turnId,
      },
    },
    at(),
  );

  for (const part of input.parts) {
    switch (part.type) {
      case "text": {
        const textPart = part as { text: string };
        breakStepIf(builder, builder.stepHasText, at());
        openStep(builder, at());
        let soFar = "";
        for (const segment of segmentText(textPart.text, input.autoChunkText)) {
          soFar += segment;
          stamp(
            builder,
            {
              type: "message.appended",
              data: {
                messageDelta: segment,
                messageSoFar: soFar,
                sequence: builder.nextSequence++,
                stepIndex: builder.stepIndex,
                turnId,
              },
            },
            at(),
          );
        }
        stamp(
          builder,
          {
            type: "message.completed",
            data: {
              finishReason: "stop",
              message: textPart.text,
              sequence: builder.nextSequence++,
              stepIndex: builder.stepIndex,
              turnId,
            },
          },
          at(),
        );
        builder.stepHasText = true;
        break;
      }
      case "reasoning": {
        const reasoningPart = part as { text: string };
        breakStepIf(builder, builder.stepHasText, at());
        openStep(builder, at());
        let soFar = "";
        for (const segment of segmentText(reasoningPart.text, input.autoChunkReasoning)) {
          soFar += segment;
          stamp(
            builder,
            {
              type: "reasoning.appended",
              data: {
                reasoningDelta: segment,
                reasoningSoFar: soFar,
                sequence: builder.nextSequence++,
                stepIndex: builder.stepIndex,
                turnId,
              },
            },
            at(),
          );
        }
        stamp(
          builder,
          {
            type: "reasoning.completed",
            data: {
              reasoning: reasoningPart.text,
              sequence: builder.nextSequence++,
              stepIndex: builder.stepIndex,
              turnId,
            },
          },
          at(),
        );
        break;
      }
      case "step-start": {
        closeStep(builder, at());
        break;
      }
      default: {
        if (
          (typeof part.type === "string" && part.type.startsWith("tool-")) ||
          part.type === "dynamic-tool"
        ) {
          const toolPart = part as ToolLikePart;

          // Special tool parts (e.g. tool-approval-request) have no `state`;
          // skip them, matching StaticChatTransport.
          if (toolPart.state === undefined) {
            break;
          }

          breakStepIf(builder, builder.stepHasText, at());
          openStep(builder, at());
          const toolName = toolNameForPart(toolPart);
          const toolInput = isJsonObject(toolPart.input) ? toolPart.input : {};
          stamp(
            builder,
            {
              type: "actions.requested",
              data: {
                actions: [
                  { callId: toolPart.toolCallId, input: toolInput, kind: "tool-call", toolName },
                ],
                sequence: builder.nextSequence++,
                stepIndex: builder.stepIndex,
                turnId,
              },
            },
            at(),
          );
          builder.stepHasTools = true;

          if (toolPart.state === "output-available") {
            stamp(
              builder,
              {
                type: "action.result",
                data: {
                  result: {
                    callId: toolPart.toolCallId,
                    kind: "tool-result",
                    output: toolPart.output ?? null,
                    toolName,
                  },
                  sequence: builder.nextSequence++,
                  stepIndex: builder.stepIndex,
                  status: "completed",
                  turnId,
                },
              },
              at(),
            );
          } else if (toolPart.state === "output-error") {
            const message = toolPart.errorText ?? "An unknown tool error occurred.";
            stamp(
              builder,
              {
                type: "action.result",
                data: {
                  error: { code: "TOOL_EXECUTION_FAILED", message },
                  result: {
                    callId: toolPart.toolCallId,
                    isError: true,
                    kind: "tool-result",
                    output: null,
                    toolName,
                  },
                  sequence: builder.nextSequence++,
                  stepIndex: builder.stepIndex,
                  status: "failed",
                  turnId,
                },
              },
              at(),
            );
          }
          // input-streaming / input-available: leave the action pending.
          break;
        }
        throw new Error(
          `StaticEveHandler does not support streaming parts of type "${part.type}" over the eve protocol.`,
        );
      }
    }
  }

  closeStep(builder, at());
  stamp(
    builder,
    { type: "turn.completed", data: { sequence: builder.nextSequence++, turnId } },
    at(),
  );
  stamp(builder, { type: "session.waiting", data: { wait: "next-user-message" } }, at());

  return { events: builder.events, nextSequence: builder.nextSequence };
}

function createFailureEvents(input: {
  error: unknown;
  turnId: string;
  sessionId: string;
  isFirstTurn: boolean;
  startSequence: number;
  userMessage: ParsedUserMessage;
  at: () => string;
}): { events: EveStreamEvent[]; nextSequence: number } {
  const message = input.error instanceof Error ? input.error.message : "The mock response failed.";
  const events: EveStreamEvent[] = [];
  let sequence = input.startSequence;
  const push = (event: EveStreamEvent) => events.push({ ...event, meta: { at: input.at() } });

  if (input.isFirstTurn) {
    push({ type: "session.started", data: {} });
  }
  push({ type: "turn.started", data: { sequence: sequence++, turnId: input.turnId } });
  push({
    type: "message.received",
    data: {
      message: input.userMessage.text,
      parts: input.userMessage.receivedParts,
      sequence: sequence++,
      turnId: input.turnId,
    },
  });
  push({
    type: "turn.failed",
    data: { code: "MOCK_RESPONSE_FAILED", message, sequence: sequence++, turnId: input.turnId },
  });
  push({
    type: "session.failed",
    data: { code: "MOCK_RESPONSE_FAILED", message, sessionId: input.sessionId },
  });

  return { events, nextSequence: sequence };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates the static eve fetch handler. See the module doc for mounting
 * patterns; the handler routes on the `/eve/v1/` segment of the request path,
 * so any mount prefix works (`/api/mock`, `/eve/agents/<name>`, "").
 */
export function createStaticEveHandler<UI_MESSAGE extends UIMessage = UIMessage>(
  init: StaticEveHandlerInit<UI_MESSAGE>,
): StaticEveHandler {
  const sessionStore = init.sessionStore ?? createMemoryEveSessionStore<UI_MESSAGE>();
  const autoChunkText = init.autoChunkText ?? true;
  const autoChunkReasoning = init.autoChunkReasoning ?? true;
  const generateSessionId = init.generateSessionId ?? (() => generateId("ses"));
  const now = init.now ?? (() => new Date());
  const at = () => now().toISOString();
  const cors = init.cors ?? true;

  const corsHeaders = (): Record<string, string> => {
    if (cors === false) {
      return {};
    }
    return {
      "access-control-allow-origin": cors === true ? "*" : cors.origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-expose-headers": `${EVE_SESSION_ID_HEADER}, ${EVE_STREAM_FORMAT_HEADER}, ${EVE_STREAM_VERSION_HEADER}`,
    };
  };

  const json = (status: number, body: JsonObject, headers: Record<string, string> = {}): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        ...corsHeaders(),
        ...headers,
      },
    });

  const runTurn = async (
    sessionId: string,
    record: EveSessionRecord<UI_MESSAGE>,
    userMessage: ParsedUserMessage,
    clientContext: unknown,
  ): Promise<void> => {
    const turnId = `turn-${record.turnCount + 1}`;
    const isFirstTurn = record.turnCount === 0;

    const userUiMessage = {
      id: `${turnId}:user`,
      role: "user",
      parts: [{ type: "text", text: userMessage.text }],
    } as UI_MESSAGE;
    const contextMessages = [...record.messages, userUiMessage];

    const context: StaticTransportContext<UI_MESSAGE> = {
      id: sessionId,
      messages: contextMessages,
      requestMetadata: clientContext,
      trigger: "submit-message",
      messageId: undefined,
    };

    let turn: { events: EveStreamEvent[]; nextSequence: number };
    let assistantParts: Array<UI_MESSAGE["parts"][number] | SpecialToolPart> = [];
    try {
      for await (const part of init.mockResponse(context)) {
        assistantParts.push(part);
      }
      if (assistantParts.length === 0) {
        throw new Error("StaticEveHandler: mockResponse must yield at least one part.");
      }
      turn = createTurnEvents({
        parts: assistantParts,
        turnId,
        isFirstTurn,
        startSequence: record.nextSequence,
        userMessage,
        autoChunkText,
        autoChunkReasoning,
        at,
      });
    } catch (error) {
      assistantParts = [];
      turn = createFailureEvents({
        error,
        turnId,
        sessionId,
        isFirstTurn,
        startSequence: record.nextSequence,
        userMessage,
        at,
      });
    }

    record.events.push(...turn.events);
    record.nextSequence = turn.nextSequence;
    record.turnCount += 1;
    record.messages.push(userUiMessage);
    if (assistantParts.length > 0) {
      record.messages.push({
        id: `${turnId}:assistant`,
        role: "assistant",
        parts: assistantParts,
      } as UI_MESSAGE);
    }
    await sessionStore.set(sessionId, record);
  };

  const streamResponse = (
    sessionId: string,
    events: EveStreamEvent[],
    signal: AbortSignal,
  ): Response => {
    const encoder = new TextEncoder();
    let cancelled = false;

    const isDelayed = (event: EveStreamEvent): boolean =>
      event.type === "message.appended" ||
      event.type === "reasoning.appended" ||
      event.type === "actions.requested" ||
      event.type === "action.result";

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          for (const event of events) {
            if (cancelled || signal.aborted) {
              break;
            }
            if (isDelayed(event)) {
              const delay = await resolveChunkDelay(init.chunkDelayMs, event);
              if (delay && delay > 0) {
                await sleep(delay);
                if (cancelled || signal.aborted) {
                  break;
                }
              }
            }
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel: () => {
        cancelled = true;
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "cache-control": "no-store, no-transform",
        "content-type": EVE_MESSAGE_STREAM_CONTENT_TYPE,
        "x-accel-buffering": "no",
        [EVE_SESSION_ID_HEADER]: sessionId,
        [EVE_STREAM_FORMAT_HEADER]: EVE_MESSAGE_STREAM_FORMAT,
        [EVE_STREAM_VERSION_HEADER]: EVE_MESSAGE_STREAM_VERSION,
        ...corsHeaders(),
      },
    });
  };

  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const pathname = new URL(request.url).pathname;
    const prefixIndex = pathname.indexOf(EVE_ROUTE_PREFIX);
    if (prefixIndex === -1) {
      return json(404, { error: "Not an eve route.", ok: false });
    }
    const route = pathname.slice(prefixIndex + EVE_ROUTE_PREFIX.length).replace(/\/+$/, "");
    const segments = route.split("/").map((segment) => decodeURIComponent(segment));

    if (segments[0] === "health" && request.method === "GET") {
      return json(200, { ok: true, status: "ready", workflowId: "static-eve-handler" });
    }

    if (segments[0] !== "session") {
      return json(404, { error: `Unknown eve route "${route}".`, ok: false });
    }

    // POST /eve/v1/session — create session + first turn
    if (segments.length === 1) {
      if (request.method !== "POST") {
        return json(405, { error: "Method not allowed.", ok: false });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json(400, { error: "Request body must be JSON.", ok: false });
      }
      if (!isJsonObject(body)) {
        return json(400, { error: "Request body must be an object.", ok: false });
      }
      const userMessage = parseUserMessage(body.message);
      if (!userMessage) {
        return json(400, { error: "A non-empty message is required.", ok: false });
      }

      const sessionId = generateSessionId();
      const record: EveSessionRecord<UI_MESSAGE> = {
        continuationToken: `eve:${generateId("tok")}`,
        events: [],
        messages: [],
        nextSequence: 0,
        turnCount: 0,
      };
      await runTurn(sessionId, record, userMessage, body.clientContext);

      return json(
        202,
        { continuationToken: record.continuationToken, ok: true, sessionId },
        { [EVE_SESSION_ID_HEADER]: sessionId },
      );
    }

    const sessionId = segments[1];
    if (!sessionId) {
      return json(404, { error: "Session id missing.", ok: false });
    }

    // POST /eve/v1/session/:id — continue turn
    if (segments.length === 2) {
      if (request.method !== "POST") {
        return json(405, { error: "Method not allowed.", ok: false });
      }
      const record = await sessionStore.get(sessionId);
      if (!record) {
        return json(404, { error: "Session not found.", ok: false });
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json(400, { error: "Request body must be JSON.", ok: false });
      }
      if (!isJsonObject(body)) {
        return json(400, { error: "Request body must be an object.", ok: false });
      }
      if (typeof body.continuationToken !== "string" || body.continuationToken.length === 0) {
        return json(400, { error: "continuationToken is required.", ok: false });
      }
      const userMessage = parseUserMessage(body.message);
      if (!userMessage) {
        const hasInputResponses =
          Array.isArray(body.inputResponses) && body.inputResponses.length > 0;
        return json(400, {
          error: hasInputResponses
            ? "StaticEveHandler does not support inputResponses (HITL) turns."
            : "A non-empty message is required.",
          ok: false,
        });
      }

      await runTurn(sessionId, record, userMessage, body.clientContext);
      return json(200, { ok: true, sessionId }, { [EVE_SESSION_ID_HEADER]: sessionId });
    }

    // GET /eve/v1/session/:id/stream
    if (segments.length === 3 && segments[2] === "stream") {
      if (request.method !== "GET") {
        return json(405, { error: "Method not allowed.", ok: false });
      }
      const record = await sessionStore.get(sessionId);
      if (!record) {
        return json(404, { error: "Session not found.", ok: false });
      }
      const rawStartIndex = new URL(request.url).searchParams.get("startIndex");
      const startIndex = rawStartIndex === null ? 0 : Number(rawStartIndex);
      if (!Number.isSafeInteger(startIndex) || startIndex < 0) {
        return json(400, { error: "startIndex must be a non-negative integer.", ok: false });
      }
      return streamResponse(sessionId, record.events.slice(startIndex), request.signal);
    }

    return json(404, { error: `Unknown eve route "${route}".`, ok: false });
  };
}
