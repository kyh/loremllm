import type { UIDataTypes, UIMessage, UIMessagePart, UITools } from "ai";
import { z } from "zod";

import type { SpecialToolPart, StaticChatTransportInit, StaticTransportContext } from "./index.ts";
import type { DelayResolver, ToolLikePart } from "./shared.ts";
import { eachInOrder, parseToolPart, resolveChunkDelay, segmentText, sleep } from "./shared.ts";

const EVE_ROUTE_PREFIX = "/eve/v1/";
const EVE_SESSION_ID_HEADER = "x-eve-session-id";
const EVE_STREAM_FORMAT_HEADER = "x-eve-stream-format";
const EVE_STREAM_TAIL_INDEX_HEADER = "x-eve-stream-tail-index";
const EVE_STREAM_VERSION_HEADER = "x-eve-stream-version";
const EVE_MESSAGE_STREAM_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";
const EVE_MESSAGE_STREAM_FORMAT = "ndjson";
const EVE_MESSAGE_STREAM_VERSION = "23";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JsonObject {
  [key: string]: JsonValue;
}

type AssistantStepFinishReason =
  | "content-filter"
  | "error"
  | "length"
  | "other"
  | "stop"
  | "tool-calls";

interface EveEventMeta {
  at: string;
  deliveryIds?: readonly string[];
}

interface EveToolCallAction {
  callId: string;
  input: JsonObject;
  kind: "tool-call";
  toolName: string;
}

interface EveToolResult {
  callId: string;
  isError?: boolean;
  kind: "tool-result";
  output: unknown;
  toolName: string;
}

type EveMessageReceivedPart =
  | { type: "text"; text: string }
  | { type: "file"; mediaType: string; filename?: string; url?: string };

/**
 * The subset of eve `HandleMessageStreamEvent`s a static mock emits.
 * Shapes match the eve wire protocol (stream version 23) exactly.
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

/**
 * Everything the handler persists for one eve session. JSON-serializable so
 * stores can be backed by a database or KV in serverless deployments.
 */
export interface EveSessionRecord<UI_MESSAGE extends UIMessage = UIMessage> {
  /** Continuation token minted at session creation and returned in the create response. */
  continuationToken: string;
  /** Full NDJSON event log; the stream route serves slices of it (`startIndex` replay). */
  events: EveStreamEvent[];
  /** Conversation history projected as `UIMessage`s, passed to `mockResponse` as context. */
  messages: UI_MESSAGE[];
  /** Session-monotonic counter for the `sequence` field on emitted events. */
  nextSequence: number;
  /** Number of completed turns; used to mint stable per-turn ids. */
  turnCount: number;
}

/**
 * Persistence seam for sessions. The default is an in-memory Map
 * ({@link createMemoryEveSessionStore}), which suits single-process servers,
 * tests, and dev. Serverless deployments should back this with shared storage —
 * the create-POST and the stream-GET for one turn can hit different instances.
 */
export interface EveSessionStore<UI_MESSAGE extends UIMessage = UIMessage> {
  get: (sessionId: string) => Promise<EveSessionRecord<UI_MESSAGE> | undefined>;
  set: (sessionId: string, record: EveSessionRecord<UI_MESSAGE>) => Promise<void>;
}

/** Creates the default in-memory {@link EveSessionStore}. */
export const createMemoryEveSessionStore = <UI_MESSAGE extends UIMessage = UIMessage>() => {
  const sessions = new Map<string, EveSessionRecord<UI_MESSAGE>>();

  const store: EveSessionStore<UI_MESSAGE> = {
    async get(sessionId) {
      return await Promise.resolve(sessions.get(sessionId));
    },
    async set(sessionId, record) {
      sessions.set(sessionId, record);

      await Promise.resolve();
    },
  };

  return store;
};

const storedEveStreamEvent = z.looseObject({ type: z.string() });

const storedUiMessage = z.looseObject({
  id: z.string(),
  parts: z.array(z.looseObject({ type: z.string() })),
  role: z.string(),
});

const UI_MESSAGE_ROLES = {
  assistant: true,
  system: true,
  user: true,
} satisfies Record<UIMessage["role"], true>;

const isStoredUiMessage = (
  message: z.infer<typeof storedUiMessage>,
): message is UIMessage & z.infer<typeof storedUiMessage> =>
  Object.hasOwn(UI_MESSAGE_ROLES, message.role);

const storedEveSessionRecord = z.looseObject({
  continuationToken: z.string(),
  events: z.array(storedEveStreamEvent),
  messages: z.array(storedUiMessage),
  nextSequence: z.number(),
  turnCount: z.number(),
});

const EVE_STREAM_EVENT_TYPES = {
  "action.result": true,
  "actions.requested": true,
  "message.appended": true,
  "message.completed": true,
  "message.received": true,
  "reasoning.appended": true,
  "reasoning.completed": true,
  "session.failed": true,
  "session.started": true,
  "session.waiting": true,
  "step.completed": true,
  "step.started": true,
  "turn.completed": true,
  "turn.failed": true,
  "turn.started": true,
} satisfies Record<EveStreamEvent["type"], true>;

const isStoredEveStreamEvent = (
  event: z.infer<typeof storedEveStreamEvent>,
): event is EveStreamEvent & z.infer<typeof storedEveStreamEvent> =>
  Object.hasOwn(EVE_STREAM_EVENT_TYPES, event.type);

interface BuiltUiMessage {
  id: string;
  parts: unknown[];
  role: string;
}

export const parseEveSessionRecord = (value: JsonValue) => {
  const result = storedEveSessionRecord.safeParse(value);

  const valid =
    result.success &&
    result.data.events.every(isStoredEveStreamEvent) &&
    result.data.messages.every(isStoredUiMessage);

  const record: EveSessionRecord | undefined = valid
    ? {
        continuationToken: result.data.continuationToken,
        events: result.data.events.filter(isStoredEveStreamEvent),
        messages: result.data.messages.filter(isStoredUiMessage),
        nextSequence: result.data.nextSequence,
        turnCount: result.data.turnCount,
      }
    : undefined;

  return record;
};

/**
 * Delay between streamed eve events to simulate generation. Same shapes as
 * `StaticChatTransport`'s `chunkDelayMs`; the function form receives the eve
 * event about to be emitted. Delays apply to content events
 * (`message.appended`, `reasoning.appended`, `actions.requested`,
 * `action.result`); lifecycle events are emitted immediately.
 */
export type EveChunkDelayResolver = DelayResolver<EveStreamEvent>;

export interface StaticEveHandlerInit<UI_MESSAGE extends UIMessage = UIMessage> {
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
}

/**
 * A WinterCG fetch handler: mount it wherever a `Request => Response` function
 * runs (Next.js route handlers, Hono, Bun.serve, service workers, or a stubbed
 * global `fetch` in tests).
 */
export type StaticEveHandler = (request: Request) => Promise<Response>;

interface ParsedUserMessage {
  text: string;
  receivedParts: EveMessageReceivedPart[];
}

const jsonObject: z.ZodType<JsonObject> = z.record(z.string(), z.json());

const stringValue = z.string();

const userTextPart = z.object({ text: z.string().min(1), type: z.literal("text") });

const userFilePart = z.object({
  filename: z.string().optional().catch(undefined),
  mediaType: z.string(),
  type: z.literal("file"),
});

const userMessageParts = z.array(z.union([userTextPart, userFilePart])).min(1);

const parseUserMessage = (message: JsonValue | undefined) => {
  const text = stringValue.safeParse(message);

  if (text.success) {
    if (text.data.length === 0) {
      return null;
    }

    return {
      receivedParts: [{ text: text.data, type: "text" }],
      text: text.data,
    } satisfies ParsedUserMessage;
  }

  const parts = userMessageParts.safeParse(message);

  if (!parts.success) {
    return null;
  }

  const texts: string[] = [];
  const receivedParts: EveMessageReceivedPart[] = [];

  for (const part of parts.data) {
    if (part.type === "text") {
      texts.push(part.text);
      receivedParts.push({ text: part.text, type: "text" });
    } else {
      receivedParts.push({ filename: part.filename, mediaType: part.mediaType, type: "file" });
    }
  }

  if (texts.length === 0) {
    return null;
  }

  return { receivedParts, text: texts.join("\n\n") } satisfies ParsedUserMessage;
};

type TurnPart = UIMessagePart<UIDataTypes, UITools> | SpecialToolPart;

const toolNameForPart = (part: ToolLikePart) => {
  if (part.toolName !== undefined && part.toolName.length > 0) {
    return part.toolName;
  }

  if (part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }

  return "tool";
};

interface TurnBuilder {
  events: EveStreamEvent[];
  nextSequence: number;
  stepIndex: number;
  stepOpen: boolean;
  stepHasText: boolean;
  stepHasTools: boolean;
  turnId: string;
}

const stamp = (builder: TurnBuilder, event: EveStreamEvent, at: string) => {
  builder.events.push({ ...event, meta: { at } });
};

const takeSequence = (counter: { nextSequence: number }) => {
  const { nextSequence } = counter;
  counter.nextSequence += 1;

  return nextSequence;
};

const openStep = (builder: TurnBuilder, at: string) => {
  if (builder.stepOpen) {
    return;
  }

  stamp(
    builder,
    {
      data: {
        sequence: takeSequence(builder),
        stepIndex: builder.stepIndex,
        turnId: builder.turnId,
      },
      type: "step.started",
    },
    at,
  );
  builder.stepOpen = true;
  builder.stepHasText = false;
  builder.stepHasTools = false;
};

const closeStep = (builder: TurnBuilder, at: string) => {
  if (!builder.stepOpen) {
    return;
  }

  const finishReason: AssistantStepFinishReason =
    !builder.stepHasText && builder.stepHasTools ? "tool-calls" : "stop";

  stamp(
    builder,
    {
      data: {
        finishReason,
        sequence: takeSequence(builder),
        stepIndex: builder.stepIndex,
        turnId: builder.turnId,
      },
      type: "step.completed",
    },
    at,
  );
  builder.stepOpen = false;
  builder.stepIndex += 1;
};

const breakStepIf = (builder: TurnBuilder, condition: boolean, at: string) => {
  if (condition && builder.stepOpen) {
    closeStep(builder, at);
  }
};

const stampToolPart = (builder: TurnBuilder, part: TurnPart, at: () => string) => {
  const toolPart = parseToolPart(part);

  if (toolPart.state === undefined) {
    return;
  }

  breakStepIf(builder, builder.stepHasText, at());
  openStep(builder, at());
  const toolName = toolNameForPart(toolPart);
  const parsedInput = jsonObject.safeParse(toolPart.input);
  const toolInput = parsedInput.success ? parsedInput.data : {};
  stamp(
    builder,
    {
      data: {
        actions: [{ callId: toolPart.toolCallId, input: toolInput, kind: "tool-call", toolName }],
        sequence: takeSequence(builder),
        stepIndex: builder.stepIndex,
        turnId: builder.turnId,
      },
      type: "actions.requested",
    },
    at(),
  );
  builder.stepHasTools = true;

  if (toolPart.state === "output-available") {
    stamp(
      builder,
      {
        data: {
          result: {
            callId: toolPart.toolCallId,
            kind: "tool-result",
            output: toolPart.output ?? null,
            toolName,
          },
          sequence: takeSequence(builder),
          status: "completed",
          stepIndex: builder.stepIndex,
          turnId: builder.turnId,
        },
        type: "action.result",
      },
      at(),
    );
  } else if (toolPart.state === "output-error") {
    const message = toolPart.errorText ?? "An unknown tool error occurred.";
    stamp(
      builder,
      {
        data: {
          error: { code: "TOOL_EXECUTION_FAILED", message },
          result: {
            callId: toolPart.toolCallId,
            isError: true,
            kind: "tool-result",
            output: null,
            toolName,
          },
          sequence: takeSequence(builder),
          status: "failed",
          stepIndex: builder.stepIndex,
          turnId: builder.turnId,
        },
        type: "action.result",
      },
      at(),
    );
  }
};

const unsupportedEvePart = (type: string) =>
  new Error(
    `StaticEveHandler does not support streaming parts of type "${type}" over the eve protocol.`,
  );

const createTurnEvents = (input: {
  parts: TurnPart[];
  turnId: string;
  isFirstTurn: boolean;
  startSequence: number;
  userMessage: ParsedUserMessage;
  autoChunkText: boolean | RegExp;
  autoChunkReasoning: boolean | RegExp;
  at: () => string;
}) => {
  const builder: TurnBuilder = {
    events: [],
    nextSequence: input.startSequence,
    stepHasText: false,
    stepHasTools: false,
    stepIndex: 0,
    stepOpen: false,
    turnId: input.turnId,
  };

  const { at, turnId } = input;

  if (input.isFirstTurn) {
    stamp(builder, { data: {}, type: "session.started" }, at());
  }

  stamp(builder, { data: { sequence: takeSequence(builder), turnId }, type: "turn.started" }, at());
  stamp(
    builder,
    {
      data: {
        message: input.userMessage.text,
        parts: input.userMessage.receivedParts,
        sequence: takeSequence(builder),
        turnId,
      },
      type: "message.received",
    },
    at(),
  );

  for (const part of input.parts) {
    switch (part.type) {
      case "text": {
        const textPart = part;
        breakStepIf(builder, builder.stepHasText, at());
        openStep(builder, at());
        let soFar = "";

        for (const segment of segmentText(textPart.text, input.autoChunkText)) {
          soFar += segment;
          stamp(
            builder,
            {
              data: {
                messageDelta: segment,
                messageSoFar: soFar,
                sequence: takeSequence(builder),
                stepIndex: builder.stepIndex,
                turnId,
              },
              type: "message.appended",
            },
            at(),
          );
        }

        stamp(
          builder,
          {
            data: {
              finishReason: "stop",
              message: textPart.text,
              sequence: takeSequence(builder),
              stepIndex: builder.stepIndex,
              turnId,
            },
            type: "message.completed",
          },
          at(),
        );
        builder.stepHasText = true;
        break;
      }

      case "reasoning": {
        const reasoningPart = part;
        breakStepIf(builder, builder.stepHasText, at());
        openStep(builder, at());
        let soFar = "";

        for (const segment of segmentText(reasoningPart.text, input.autoChunkReasoning)) {
          soFar += segment;
          stamp(
            builder,
            {
              data: {
                reasoningDelta: segment,
                reasoningSoFar: soFar,
                sequence: takeSequence(builder),
                stepIndex: builder.stepIndex,
                turnId,
              },
              type: "reasoning.appended",
            },
            at(),
          );
        }

        stamp(
          builder,
          {
            data: {
              reasoning: reasoningPart.text,
              sequence: takeSequence(builder),
              stepIndex: builder.stepIndex,
              turnId,
            },
            type: "reasoning.completed",
          },
          at(),
        );
        break;
      }

      case "step-start": {
        closeStep(builder, at());
        break;
      }

      case "dynamic-tool": {
        stampToolPart(builder, part, at);
        break;
      }

      case "custom":
      case "file":
      case "reasoning-file":
      case "source-document":
      case "source-url": {
        throw unsupportedEvePart(part.type);
      }

      default: {
        if (part.type.startsWith("tool-")) {
          stampToolPart(builder, part, at);
          break;
        }

        throw unsupportedEvePart(part.type);
      }
    }
  }

  closeStep(builder, at());
  stamp(
    builder,
    { data: { sequence: takeSequence(builder), turnId }, type: "turn.completed" },
    at(),
  );
  stamp(builder, { data: { wait: "next-user-message" }, type: "session.waiting" }, at());

  return { events: builder.events, nextSequence: builder.nextSequence };
};

const createFailureEvents = (input: {
  error: unknown;
  turnId: string;
  sessionId: string;
  isFirstTurn: boolean;
  startSequence: number;
  userMessage: ParsedUserMessage;
  at: () => string;
}) => {
  const message = input.error instanceof Error ? input.error.message : "The mock response failed.";
  const events: EveStreamEvent[] = [];
  const counter = { nextSequence: input.startSequence };
  const push = (event: EveStreamEvent) => events.push({ ...event, meta: { at: input.at() } });

  if (input.isFirstTurn) {
    push({ data: {}, type: "session.started" });
  }

  push({ data: { sequence: takeSequence(counter), turnId: input.turnId }, type: "turn.started" });
  push({
    data: {
      message: input.userMessage.text,
      parts: input.userMessage.receivedParts,
      sequence: takeSequence(counter),
      turnId: input.turnId,
    },
    type: "message.received",
  });
  push({
    data: {
      code: "MOCK_RESPONSE_FAILED",
      message,
      sequence: takeSequence(counter),
      turnId: input.turnId,
    },
    type: "turn.failed",
  });
  push({
    data: { code: "MOCK_RESPONSE_FAILED", message, sessionId: input.sessionId },
    type: "session.failed",
  });

  return { events, nextSequence: counter.nextSequence };
};

const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const isDelayedEvent = (event: EveStreamEvent) =>
  event.type === "message.appended" ||
  event.type === "reasoning.appended" ||
  event.type === "actions.requested" ||
  event.type === "action.result";

/**
 * Creates the static eve fetch handler. See the module doc for mounting
 * patterns; the handler routes on the `/eve/v1/` segment of the request path,
 * so any mount prefix works (`/api/mock`, `/eve/agents/<name>`, "").
 */
export const createStaticEveHandler = <UI_MESSAGE extends UIMessage = UIMessage>(
  init: StaticEveHandlerInit<UI_MESSAGE>,
) => {
  const sessionStore = init.sessionStore ?? createMemoryEveSessionStore<UI_MESSAGE>();
  const autoChunkText = init.autoChunkText ?? true;
  const autoChunkReasoning = init.autoChunkReasoning ?? true;
  const generateSessionId = init.generateSessionId ?? (() => generateId("ses"));
  const now = init.now ?? (() => new Date());
  const at = () => now().toISOString();
  const cors = init.cors ?? true;

  const asUiMessage = (message: BuiltUiMessage) =>
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion, anti-slop/require-safety-comment-for-type-assertion -- UI_MESSAGE is the caller's type parameter: nothing at runtime describes its metadata, data or tool types, so a message the handler builds can only be asserted to it
    message as UI_MESSAGE;

  const corsHeaders = () => {
    const headers: Record<string, string> =
      cors === false
        ? {}
        : {
            "access-control-allow-headers": "content-type, authorization",
            "access-control-allow-methods": "GET, POST, OPTIONS",
            "access-control-allow-origin": cors === true ? "*" : cors.origin,
            "access-control-expose-headers": [
              EVE_SESSION_ID_HEADER,
              EVE_STREAM_FORMAT_HEADER,
              EVE_STREAM_TAIL_INDEX_HEADER,
              EVE_STREAM_VERSION_HEADER,
            ].join(", "),
          };

    return headers;
  };

  const json = (status: number, body: JsonObject, headers: Record<string, string> = {}) =>
    Response.json(body, {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
        ...corsHeaders(),
        ...headers,
      },
      status,
    });

  const runTurn = async (
    sessionId: string,
    record: EveSessionRecord<UI_MESSAGE>,
    userMessage: ParsedUserMessage,
    clientContext: JsonValue | undefined,
  ) => {
    const turnId = `turn-${record.turnCount + 1}`;
    const deliveryId = generateId("dlv");
    const isFirstTurn = record.turnCount === 0;

    const userUiMessage = asUiMessage({
      id: `${turnId}:user`,
      parts: [{ text: userMessage.text, type: "text" }],
      role: "user",
    });

    const contextMessages = [...record.messages, userUiMessage];

    const context: StaticTransportContext<UI_MESSAGE> = {
      id: sessionId,
      messageId: undefined,
      messages: contextMessages,
      requestMetadata: clientContext,
      trigger: "submit-message",
    };

    let turn: { events: EveStreamEvent[]; nextSequence: number };
    let assistantParts: (UI_MESSAGE["parts"][number] | SpecialToolPart)[] = [];

    try {
      for await (const part of init.mockResponse(context)) {
        assistantParts.push(part);
      }

      if (assistantParts.length === 0) {
        throw new Error("StaticEveHandler: mockResponse must yield at least one part.");
      }

      turn = createTurnEvents({
        at,
        autoChunkReasoning,
        autoChunkText,
        isFirstTurn,
        parts: assistantParts,
        startSequence: record.nextSequence,
        turnId,
        userMessage,
      });
    } catch (error) {
      assistantParts = [];
      turn = createFailureEvents({
        at,
        error,
        isFirstTurn,
        sessionId,
        startSequence: record.nextSequence,
        turnId,
        userMessage,
      });
    }

    // WARNING: eve's client drops every event until one carries this turn's delivery id.
    record.events.push(
      ...turn.events.map((event) => ({
        ...event,
        meta: { at: event.meta?.at ?? at(), deliveryIds: [deliveryId] },
      })),
    );
    record.nextSequence = turn.nextSequence;
    record.turnCount += 1;
    record.messages.push(userUiMessage);

    if (assistantParts.length > 0) {
      record.messages.push(
        asUiMessage({
          id: `${turnId}:assistant`,
          parts: assistantParts,
          role: "assistant",
        }),
      );
    }

    await sessionStore.set(sessionId, record);

    return deliveryId;
  };

  const streamResponse = (
    sessionId: string,
    events: EveStreamEvent[],
    signal: AbortSignal,
    tailIndex: number | undefined,
  ) => {
    const encoder = new TextEncoder();
    let cancelled = false;

    const stream = new ReadableStream<Uint8Array>({
      cancel: () => {
        cancelled = true;
      },
      start: async (controller) => {
        try {
          await eachInOrder(events, async (event) => {
            if (cancelled || signal.aborted) {
              return "stop";
            }

            if (isDelayedEvent(event)) {
              const delay = await resolveChunkDelay(init.chunkDelayMs, event);

              if (delay !== null && delay > 0) {
                await sleep(delay);

                if (cancelled || signal.aborted) {
                  return "stop";
                }
              }
            }

            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

            return "next";
          });

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    const headers = new Headers({
      "cache-control": "no-store, no-transform",
      "content-type": EVE_MESSAGE_STREAM_CONTENT_TYPE,
      "x-accel-buffering": "no",
      [EVE_SESSION_ID_HEADER]: sessionId,
      [EVE_STREAM_FORMAT_HEADER]: EVE_MESSAGE_STREAM_FORMAT,
      [EVE_STREAM_VERSION_HEADER]: EVE_MESSAGE_STREAM_VERSION,
      ...corsHeaders(),
    });

    if (tailIndex !== undefined) {
      headers.set(EVE_STREAM_TAIL_INDEX_HEADER, String(tailIndex));
    }

    return new Response(stream, { headers, status: 200 });
  };

  const readJsonBody = async (request: Request) => {
    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch {
      return json(400, { error: "Request body must be JSON.", ok: false });
    }

    const parsedBody = jsonObject.safeParse(rawBody);

    if (!parsedBody.success) {
      return json(400, { error: "Request body must be an object.", ok: false });
    }

    return parsedBody.data;
  };

  const createSession = async (request: Request) => {
    if (request.method !== "POST") {
      return json(405, { error: "Method not allowed.", ok: false });
    }

    const body = await readJsonBody(request);

    if (body instanceof Response) {
      return body;
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

    const deliveryId = await runTurn(sessionId, record, userMessage, body.clientContext);

    return json(
      202,
      { continuationToken: record.continuationToken, deliveryId, ok: true, sessionId },
      { [EVE_SESSION_ID_HEADER]: sessionId },
    );
  };

  const sendTurn = async (request: Request, sessionId: string) => {
    if (request.method !== "POST") {
      return json(405, { error: "Method not allowed.", ok: false });
    }

    const record = await sessionStore.get(sessionId);

    if (!record) {
      return json(404, { error: "Session not found.", ok: false });
    }

    const body = await readJsonBody(request);

    if (body instanceof Response) {
      return body;
    }

    if ("continuationToken" in body) {
      return json(400, {
        error: "Session-ID routes do not accept 'continuationToken'.",
        ok: false,
      });
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

    const deliveryId = await runTurn(sessionId, record, userMessage, body.clientContext);

    return json(200, { deliveryId, ok: true, sessionId }, { [EVE_SESSION_ID_HEADER]: sessionId });
  };

  const streamSession = async (request: Request, sessionId: string) => {
    if (request.method !== "GET") {
      return json(405, { error: "Method not allowed.", ok: false });
    }

    const record = await sessionStore.get(sessionId);

    if (!record) {
      return json(404, { error: "Session not found.", ok: false });
    }

    const { searchParams } = new URL(request.url);
    const rawStartIndex = searchParams.get("startIndex");
    const startIndex = rawStartIndex === null ? 0 : Number(rawStartIndex);

    if (!Number.isSafeInteger(startIndex) || startIndex < 0) {
      return json(400, { error: "startIndex must be a non-negative integer.", ok: false });
    }

    const rawIncludeTailIndex = searchParams.get("includeTailIndex");

    // WARNING: eve's bounded reads throw without the tail index header.
    const tailIndex =
      rawIncludeTailIndex === "1" || rawIncludeTailIndex === "true"
        ? record.events.length - 1
        : undefined;

    return streamResponse(sessionId, record.events.slice(startIndex), request.signal, tailIndex);
  };

  const handler: StaticEveHandler = async (request) => {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(), status: 204 });
    }

    const { pathname } = new URL(request.url);
    const prefixIndex = pathname.indexOf(EVE_ROUTE_PREFIX);

    if (prefixIndex === -1) {
      return json(404, { error: "Not an eve route.", ok: false });
    }

    const route = pathname.slice(prefixIndex + EVE_ROUTE_PREFIX.length).replace(/\/+$/u, "");
    const segments = route.split("/").map((segment) => decodeURIComponent(segment));

    if (segments[0] === "health" && request.method === "GET") {
      return json(200, { ok: true, status: "ready", workflowId: "static-eve-handler" });
    }

    if (segments[0] !== "session") {
      return json(404, { error: `Unknown eve route "${route}".`, ok: false });
    }

    if (segments.length === 1) {
      return await createSession(request);
    }

    const [, sessionId] = segments;

    if (sessionId === undefined || sessionId === "") {
      return json(404, { error: "Session id missing.", ok: false });
    }

    if (segments.length === 2) {
      return await sendTurn(request, sessionId);
    }

    if (segments.length === 3 && segments[2] === "stream") {
      return await streamSession(request, sessionId);
    }

    return json(404, { error: `Unknown eve route "${route}".`, ok: false });
  };

  return handler;
};
