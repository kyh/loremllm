# @loremllm/transport

A lightweight transport implementation for the [Vercel AI SDK UI layer](https://v6.ai-sdk.dev/docs/ai-sdk-ui/transport).  
It lets you describe the exact `UIMessage[]` the UI should display and streams the message back to the client without touching your network stack.

> **When to use it**
>
> - Building demos or stories where the response is known ahead of time.
> - Faking AI interactions offline or in tests.
> - Wrapping bespoke backends that already output `UIMessage` objects.

## Installation

```bash
pnpm add @loremllm/transport
```

The package declares a peer dependency on `ai@^5.0.81`; make sure it is available in your workspace.

## Quick start

```ts
import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "ai/react";

const transport = new StaticChatTransport({
  chunkDelayMs: 25,
  async *mockResponse({ messages }) {
    const userMessage = messages[messages.length - 1];
    const userText =
      userMessage?.parts.find((p) => p.type === "text")?.text ?? "…";

    yield { type: "text", text: `You said: ${userText}` };
  },
});

export const DemoChat = () => {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    id: "demo",
    transport,
  });

  // render messages + form
};
```

Provide a `mockResponse` async generator function that yields `UIMessagePart` objects.  
All yielded parts are collected into a single assistant message with an auto-generated ID and streamed back to the UI.

Prefer factory helpers? Use the convenience wrapper:

```ts
import { createStaticChatTransport } from "@loremllm/transport";

const transport = createStaticChatTransport({
  async *mockResponse(context) {
    yield { type: "text", text: "Hello!" };
    yield { type: "text", text: " How are you?" };
  },
});
```

## Usage examples

### Tool calling

You can simulate tool calls by yielding tool parts. Here's an example inspired by the [AI SDK tool calling documentation](https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling):

```ts
import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "ai/react";

const transport = new StaticChatTransport({
  async *mockResponse({ messages }) {
    const userMessage = messages[messages.length - 1];
    const userText =
      userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

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
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    id: "weather-demo",
    transport,
  });

  // render messages + form
};
```

### Custom data streams

Use custom `data-*` parts to stream application-specific data that your UI can handle. This is useful for widgets, charts, or other interactive components:

```ts
import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "ai/react";

const transport = new StaticChatTransport({
  async *mockResponse({ messages }) {
    const userMessage = messages[messages.length - 1];
    const userText =
      userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

    // Stream a chart widget
    if (userText.includes("chart")) {
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
    }

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
  const { messages, input, handleInputChange, handleSubmit } = useChat({
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

For [Model Context Protocol (MCP)](https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#mcp-tools) dynamic tools, use the `dynamic-tool` type:

```ts
import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "ai/react";

const transport = new StaticChatTransport({
  async *mockResponse({ messages }) {
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
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    id: "mcp-demo",
    transport,
  });

  // render messages + form
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

## Extending the transport

`StaticChatTransport` exposes the raw class if you want to subclass it, override `createStreamFromChunks`, or plug your own caching layer.  
For complex real transports, consider implementing `ChatTransport` directly so you can forward the stream from your backend without converting to `UIMessage` first.
