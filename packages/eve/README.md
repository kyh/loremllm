# @loremllm/eve

A static mock server for the [eve agent framework](https://eve.dev). Script the response, mount the handler, and `useEveAgent` streams it like a real agent: no model, no fees.

## Installation

```bash
pnpm add @loremllm/eve
```

The package declares a peer dependency on `ai@^6.0.0 || ^7.0.0` (for the `UIMessage` part types).

## Quick start

`@loremllm/eve` serves the same scripted responses over the [eve agent framework](https://eve.dev)'s wire protocol (stream version 23, eve 0.42.x). Instead of a client-side transport, eve support is a tiny mock server: a [fetch handler](https://developer.mozilla.org/en-US/docs/Web/API/Request) implementing the three routes `useEveAgent` talks to.

```ts
// app/api/mock/[[...eve]]/route.ts (Next.js example — any Request => Response host works)
import { createStaticEveHandler } from "@loremllm/eve";

const handler = createStaticEveHandler({
  chunkDelayMs: 25,
  async *mockResponse() {
    yield { type: "reasoning", text: "The user greeted me." };
    yield { type: "text", text: "Hello! How can I help you today?" };
  },
});

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
```

```tsx
"use client";
import { useEveAgent } from "eve/react";

export const DemoAgent = () => {
  const { data, send, status } = useEveAgent({ host: "/api/mock" });
  // data.messages renders exactly like a real eve agent's output
};
```

`mockResponse` is the **same option — and can be the same function — as [`@loremllm/ai-sdk`](../ai-sdk/README.md)'s `StaticChatTransport`**: author a scripted response once and serve it to both AI SDK `useChat` UIs and eve `useEveAgent` UIs. `chunkDelayMs`, `autoChunkText`, and `autoChunkReasoning` behave identically.

Notes:

- Supported parts on the eve wire: `text`, `reasoning`, `tool-*`, `dynamic-tool`, `step-start`. Parts with no eve representation (`file`, `source-*`, `data-*`) fail the turn loudly rather than dropping silently.
- The handler routes on the `/eve/v1/` path segment, so any mount prefix works. CORS is on by default (any origin) since demos usually run cross-origin; pass `cors: { origin }` or `cors: false` to tighten.
- Sessions live in memory by default. On serverless, pass a `sessionStore` backed by shared storage — the create request and the stream request for a turn can land on different instances.
- A thrown `mockResponse` becomes a `turn.failed` + `session.failed` sequence, surfacing in `useEveAgent`'s `error`/`status`.
- HITL (`inputResponses`) turns and task-mode sessions aren't supported; every successful turn ends `session.waiting` (conversation mode).

## Session store

`EveSessionStore` is the persistence seam: `createMemoryEveSessionStore()` is the default, and `parseEveSessionRecord` validates records you read back from your own storage (a database row, KV, Redis).

## Migrating from `@loremllm/transport/eve`

`@loremllm/transport` is deprecated. Replace `@loremllm/transport/eve` with `@loremllm/eve`; the API is unchanged.
