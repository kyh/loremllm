# @loremllm/transport

A lightweight transport implementation for the [Vercel AI SDK UI layer](https://ai-sdk.dev/docs/ai-sdk-ui/transport).  
It lets you describe the exact `UIMessage[]` the UI should display and streams the message back to the client without touching your network stack.

> **When to use it**  
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
  async resolveMessages({ messages }) {
    const userMessage = messages[messages.length - 1];

    return [
      ...messages,
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          { type: "text", text: `You said: ${userMessage?.parts[0]?.text ?? "…"}` },
        ],
      },
    ];
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

Provide a `resolveMessages` implementation (either via the constructor option above or by overriding the protected method) that returns the full message history after your transport runs.  
The helper compares the previous history with your returned array and streams the newly created assistant message back to the UI.

Prefer factory helpers? Use the convenience wrapper:

```ts
import { createStaticChatTransport } from "@loremllm/transport";

const transport = createStaticChatTransport({
  async resolveMessages(context) {
    // ...
  },
});
```

## Abort & reconnect support

- Requests respect `AbortController` signals and surface aborts as the same `AbortError` the AI SDK expects.  
- The transport caches the last assistant message per `chatId` so `reconnectToStream` can replay the existing response.

## Supported message parts

The stream builder currently supports:

- `text`, `reasoning`
- `file`
- `source-url`, `source-document`
- Custom `data-*` parts

Encountering an unsupported part (e.g. tool invocations) throws so the UI can flag the issue. Extend `createChunksFromMessage` if you need more chunk types.

## Customising chunk timing

`chunkDelayMs` accepts either:

```ts
chunkDelayMs: 50; // constant delay for every chunk
// or
chunkDelayMs: async (chunk) => (chunk.type === "text-delta" ? 20 : 0);
```

Return `undefined` or `0` to emit the next chunk immediately.

## Extending the transport

`StaticChatTransport` exposes the raw class if you want to subclass it, override `createStreamFromChunks`, or plug your own caching layer.  
For complex real transports, consider implementing `ChatTransport` directly so you can forward the stream from your backend without converting to `UIMessage` first.
