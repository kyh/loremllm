# @loremllm/transport

A lightweight transport implementation for the [Vercel AI SDK UI layer](https://ai-sdk.dev/docs/ai-sdk-ui/transport). It lets you describe the exact `UIMessage[]` the UI should display and streams the message back to the client without touching your network stack or incurring any llm fees.

## When to use it

- Building demos or stories where the response is known ahead of time.
- Faking AI interactions offline or in tests.
- Wrapping bespoke backends that already output `UIMessage` objects.

## Installation

```bash
pnpm add @loremllm/transport
```

The package declares a peer dependency on `ai@^6.0.0 || ^7.0.0`; make sure it is available in your workspace.

## Quick start

```ts
import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "@ai-sdk/react";

const transport = new StaticChatTransport({
  chunkDelayMs: 25,
  async *mockResponse() {
    yield { type: "text", text: "Hello! How can I help you today?" };
  },
});

export const DemoChat = () => {
  const { messages, sendMessage, status } = useChat({
    id: "demo",
    transport,
  });

  // render messages + form, call sendMessage({ text }) on submit
};
```

Provide a `mockResponse` async generator function that yields `UIMessagePart` objects.  
All yielded parts are collected into a single assistant message with an auto-generated ID and streamed back to the UI.

## Options

| Option               | Type                                                                                                        | Required | Default     | Description                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | -------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `mockResponse`       | `(context: StaticTransportContext) => AsyncGenerator<UIMessagePart>`                                        | Yes      | -           | Async generator that yields message parts. All yielded parts are collected into a single assistant message. |
| `chunkDelayMs`       | `number \| [number, number] \| (chunk: UIMessageChunk) => Promise<number \| [number, number] \| undefined>` | No       | `undefined` | Delay between chunk emissions to simulate streaming. See "Customizing chunk timing" section.                |
| `autoChunkText`      | `boolean \| RegExp`                                                                                         | No       | `true`      | Whether to chunk text parts. `true` = word-by-word, `false` = single chunk, `RegExp` = custom pattern.      |
| `autoChunkReasoning` | `boolean \| RegExp`                                                                                         | No       | `true`      | Whether to chunk reasoning parts. `true` = word-by-word, `false` = single chunk, `RegExp` = custom pattern. |

## Context

The `mockResponse` function receives a `StaticTransportContext` parameter with the following properties:

| Property          | Type                                       | Description                                                             |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `id`              | `string`                                   | The chat ID for this conversation.                                      |
| `messages`        | `UIMessage[]`                              | Array of all messages in the conversation history.                      |
| `requestMetadata` | `unknown`                                  | Metadata passed from the `useChat` hook's `body` or `metadata` options. |
| `trigger`         | `"submit-message" \| "regenerate-message"` | Whether this is a new message or a regeneration.                        |
| `messageId`       | `string \| undefined`                      | The ID of the message being generated, if provided.                     |

## Customizing chunk timing

`chunkDelayMs` accepts:

```ts
// Constant delay for every chunk
chunkDelayMs: 50;

// Random delay between min and max (inclusive)
chunkDelayMs: [20, 100]; // random delay between 20ms and 100ms

// Function that returns a delay per chunk
chunkDelayMs: async (chunk) => (chunk.type === "text-delta" ? 20 : 0);

// Function that returns a tuple for random delay per chunk
chunkDelayMs: async (chunk) => {
  if (chunk.type === "text-delta") {
    return [10, 50]; // random delay between 10ms and 50ms for text deltas
  }
  return 0; // no delay for other chunks
};
```

Return `undefined` or `0` to emit the next chunk immediately.

## Usage examples

### Tool calling

You can simulate tool calls by yielding tool parts. Here's an example inspired by the [AI SDK tool calling documentation](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling):

```ts
import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "@ai-sdk/react";

const transport = new StaticChatTransport({
  async *mockResponse({ messages }) {
    const userMessage = messages[messages.length - 1];
    const userText = userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

    // Check if user asked about weather
    if (userText.toLowerCase().includes("weather")) {
      const locationMatch = userText.match(/weather in (.+?)(?:\?|$)/i);
      const location = locationMatch?.[1]?.trim() ?? "San Francisco";

      // Yield a tool call
      yield {
        type: "tool-weather",
        toolCallId: "call_123",
        toolName: "weather",
        state: "output-available",
        input: { location },
        output: {
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        },
      };

      // Yield a text response with the tool result
      yield {
        type: "text",
        text: `The weather in ${location} is sunny with a temperature of 68°F.`,
      };
    } else {
      yield { type: "text", text: "How can I help you today?" };
    }
  },
});

export const WeatherChat = () => {
  const { messages, sendMessage, status } = useChat({
    id: "weather-demo",
    transport,
  });

  // render messages + form, call sendMessage({ text }) on submit
};
```

### Custom data streams

Use custom `data-*` parts to stream application-specific data that your UI can handle. This is useful for widgets, charts, or other interactive components:

```ts
import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "@ai-sdk/react";

const transport = new StaticChatTransport({
  async *mockResponse() {
    // Stream a chart widget
    yield {
      type: "data-chart",
      data: {
        type: "line",
        data: [
          { x: "Jan", y: 65 },
          { x: "Feb", y: 72 },
          { x: "Mar", y: 68 },
        ],
      },
    };

    // Stream a notification
    yield {
      type: "data-notification",
      id: "notif-1",
      data: {
        message: "Data has been processed",
        severity: "success",
      },
      transient: true, // This data won't persist in message history
    };

    yield {
      type: "text",
      text: "I've created a chart for you.",
    };
  },
});

export const DataStreamChat = () => {
  const { messages, sendMessage, status } = useChat({
    id: "data-demo",
    transport,
    onData: (dataPart) => {
      // Handle custom data parts
      if (dataPart.type === "data-chart") {
        // Render your chart component
        console.log("Chart data:", dataPart.data);
      } else if (dataPart.type === "data-notification") {
        // Show notification
        console.log("Notification:", dataPart.data);
      }
    },
  });

  // render messages + form
};
```

### MCP dynamic tools

For [Model Context Protocol (MCP)](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#mcp-tools) dynamic tools, use the `dynamic-tool` type:

```ts
import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "@ai-sdk/react";

const transport = new StaticChatTransport({
  async *mockResponse() {
    // Simulate a dynamic tool from an MCP server
    yield {
      type: "dynamic-tool",
      toolCallId: "call_mcp_123",
      toolName: "mcp-file-read",
      state: "output-available",
      input: {
        path: "/path/to/file.txt",
      },
      output: {
        content: "File contents here...",
        size: 1024,
      },
    };

    yield {
      type: "text",
      text: "I've read the file using the MCP tool.",
    };
  },
});

export const MCPChat = () => {
  const { messages, sendMessage, status } = useChat({
    id: "mcp-demo",
    transport,
  });

  // render messages + form, call sendMessage({ text }) on submit
};
```

## Abort & reconnect support

- Requests respect `AbortController` signals and surface aborts as the same `AbortError` the AI SDK expects.
- The transport caches the last assistant message per `chatId` so `reconnectToStream` can replay the existing response.

## Supported message parts

The stream builder currently supports:

- `text`, `reasoning`
- `file`
- `source-url`, `source-document`
- `tool-*` parts (e.g., `tool-search`, `tool-booking`) and `dynamic-tool`
- Custom `data-*` parts

Tool parts automatically emit the appropriate chunks (`tool-input-available`, `tool-output-available`, or `tool-output-error`) based on the part's `state` and properties.

Encountering an unsupported part type throws so the UI can flag the issue. Extend `createChunksFromMessage` if you need more chunk types.

## Extending the transport

`StaticChatTransport` exposes the raw class if you want to subclass it, override `createStreamFromChunks`, or plug your own caching layer.  
For complex real transports, consider implementing `ChatTransport` directly so you can forward the stream from your backend without converting to `UIMessage` first.

## eve framework support

The `@loremllm/transport/eve` entry point serves the same scripted responses over the [eve agent framework](https://eve.dev)'s wire protocol (stream version 18, eve 0.22.x). Instead of a client-side transport, eve support is a tiny mock server: a [fetch handler](https://developer.mozilla.org/en-US/docs/Web/API/Request) implementing the three routes `useEveAgent` talks to.

```ts
// app/api/mock/[[...eve]]/route.ts (Next.js example — any Request => Response host works)
import { createStaticEveHandler } from "@loremllm/transport/eve";

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

`mockResponse` is the **same option — and can be the same function — as `StaticChatTransport`'s**: author a scripted response once and serve it to both AI SDK `useChat` UIs and eve `useEveAgent` UIs. `chunkDelayMs`, `autoChunkText`, and `autoChunkReasoning` behave identically.

Notes:

- Supported parts on the eve wire: `text`, `reasoning`, `tool-*`, `dynamic-tool`, `step-start`. Parts with no eve representation (`file`, `source-*`, `data-*`) fail the turn loudly rather than dropping silently.
- The handler routes on the `/eve/v1/` path segment, so any mount prefix works. CORS is on by default (any origin) since demos usually run cross-origin; pass `cors: { origin }` or `cors: false` to tighten.
- Sessions live in memory by default. On serverless, pass a `sessionStore` backed by shared storage — the create request and the stream request for a turn can land on different instances.
- A thrown `mockResponse` becomes a `turn.failed` + `session.failed` sequence, surfacing in `useEveAgent`'s `error`/`status`.
- HITL (`inputResponses`) turns and task-mode sessions aren't supported; every successful turn ends `session.waiting` (conversation mode).

## Copy messages to clipboard

The `copyMessagesToClipboard` function can be used to copy a real llm response to the clipboard as a static transport template.

```ts
import { copyMessagesToClipboard } from "@loremllm/transport/copy-messages-to-clipboard";
import { useChat } from "@ai-sdk/react";

const { messages, sendMessage, status, error } = useChat({
  onFinish: copyMessagesToClipboard,
});
```
