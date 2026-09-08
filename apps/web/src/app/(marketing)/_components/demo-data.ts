import type { UIMessage } from "ai";
import { StaticChatTransport } from "@loremllm/transport";

import type { StaticTransportContext } from "@loremllm/transport";

export interface Demo {
  id: string;
  title: string;
  section: string;
  description: string;
  placeholder?: string;
  preset?: string;
  transport?: StaticChatTransport;
  code?: string;
}

export const transportDemos: Demo[] = [
  {
    code: `import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "@ai-sdk/react";

export function SimpleTextResponse() {
  const { messages, sendMessage } = useChat({
    transport: new StaticChatTransport({
      chunkDelayMs: [50, 120],
      async *mockResponse() {
        yield {
          type: "text",
          text: \`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\`,
        };
      },
    }),
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}
    </div>
  );
}`,
    description: "A simple response that echoes lorem ipsum text.",
    id: "transport-text-response",
    section: "AI SDK Transport",
    title: "Simple Text Response",
    transport: new StaticChatTransport({
      chunkDelayMs: [50, 120],
      async *mockResponse() {
        yield {
          text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
          type: "text",
        };
      },
    }),
  },
  {
    code: `import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "@ai-sdk/react";
import type { StaticTransportContext, UIMessage } from "@loremllm/transport";

export function ToolCallingDemo() {
  const { messages, sendMessage } = useChat({
    transport: new StaticChatTransport({
      chunkDelayMs: (chunk) => {
        if (
          chunk.type === "tool-output-available" ||
          chunk.type === "tool-output-error"
        ) {
          return 1000;
        }
        return [20, 60];
      },
      async *mockResponse(context: StaticTransportContext<UIMessage>) {
        const userMessage = context.messages[context.messages.length - 1];
        const userText =
          userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        if (userText.toLowerCase().includes("weather")) {
          const locationMatch = /weather in (.+?)(?:[?]|$)/i.exec(userText);
          const location = locationMatch?.groups?.location?.trim() ?? "San Francisco";

          const toolCallId = \`call_\${Date.now()}\`;

          yield {
            type: "tool-weather",
            toolCallId,
            toolName: "weather",
            state: "input-available",
            input: { location },
          };

          yield {
            type: "tool-weather",
            toolCallId,
            toolName: "weather",
            state: "output-available",
            input: { location },
            output: {
              location,
              temperature: 72,
              condition: "sunny",
            },
          };

          yield {
            type: "text",
            text: \`The weather in \${location} is sunny.\`,
          };
        }
      },
    }),
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}
    </div>
  );
}`,
    description: "Simulates tool calls with progressive loading.",
    id: "transport-tool-calling",
    placeholder: "Try asking about the weather in a city.",
    section: "AI SDK Transport",
    title: "Tool Calling",
    transport: new StaticChatTransport({
      chunkDelayMs: (chunk) => {
        if (chunk.type === "tool-output-available" || chunk.type === "tool-output-error") {
          return 1000;
        }
        return [20, 60];
      },
      async *mockResponse(context: StaticTransportContext<UIMessage>) {
        const userMessage = context.messages.at(-1);
        const userText = userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        if (userText.toLowerCase().includes("weather")) {
          const locationMatch = /weather in (?<location>.+?)(?:\?|$)/iu.exec(userText);
          const location = locationMatch?.groups?.location?.trim() ?? "San Francisco";

          const toolCallId = `call_${Date.now()}`;

          yield {
            input: { location },
            state: "input-available",
            toolCallId,
            toolName: "weather",
            type: "tool-weather",
          };

          const temperature = 72 + Math.floor(Math.random() * 21) - 10;

          yield {
            input: { location },
            output: {
              condition: "sunny",
              location,
              temperature,
            },
            state: "output-available",
            toolCallId,
            toolName: "weather",
            type: "tool-weather",
          };

          yield {
            text: `The weather in ${location} is sunny with a temperature of ${temperature}°F.`,
            type: "text",
          };
        } else {
          yield {
            text: "Try asking about the weather in a city!",
            type: "text",
          };
        }
      },
    }),
  },
  {
    code: `import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "@ai-sdk/react";

export function ReasoningDemo() {
  const { messages, sendMessage } = useChat({
    transport: new StaticChatTransport({
      chunkDelayMs: 30,
      async *mockResponse(context) {
        const userMessage = context.messages[context.messages.length - 1];
        const userText =
          userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        yield {
          type: "reasoning",
          text: \`Let me think about "\${userText}"...\n\nI need to provide a helpful response.\`,
        };

        yield {
          type: "text",
          text: \`Based on your question about "\${userText}", here's my response.\`,
        };
      },
    }),
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}
    </div>
  );
}`,
    description: "Stream in reasoning parts.",
    id: "transport-reasoning",
    section: "AI SDK Transport",
    title: "Reasoning Stream",
    transport: new StaticChatTransport({
      chunkDelayMs: 30,
      async *mockResponse(context) {
        const userMessage = context.messages.at(-1);
        const userText = userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        yield {
          text: `Let me think about "${userText}"...\n\nI need to provide a helpful response.`,
          type: "reasoning",
        };

        yield {
          text: `Based on your question about "${userText}", here's my response with some reasoning that you can toggle above.`,
          type: "text",
        };
      },
    }),
  },
];

export const platformDemos: Demo[] = [
  {
    code: `import { useChat } from "@ai-sdk/react";

export function DefaultGenerator() {
  const { messages, sendMessage } = useChat({
    api: "/api/chat",
    body: {
      // Default lorem ipsum generator
      type: "lorem",
    },
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}
    </div>
  );
}`,
    description: "Generate dynamic lorem ipsum text with customizable parameters.",
    id: "lorem",
    section: "Platform API",
    title: "Default Generator",
  },
  {
    code: `import { useChat } from "@ai-sdk/react";

export function CollectionsDemo() {
  const { messages, sendMessage } = useChat({
    api: "/api/chat",
    body: {
      type: "chat",
      collectionId: "demo",
    },
  });

  const handleSubmit = (text: string) => {
    sendMessage({
      text,
    });
  };

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}
    </div>
  );
}`,
    description: "Define a collection of LLM interactions and query it with a specific input.",
    id: "demo",
    placeholder:
      'Try asking "What is Lorem Ipsum?" or "Faq", it will respond with the corresponding response from the collection.',
    section: "Platform API",
    title: "Collections",
  },
  {
    code: `import { useChat } from "@ai-sdk/react";

export function MarkdownStreamingDemo() {
  const { messages, sendMessage } = useChat({
    api: "/api/chat",
    body: {
      type: "markdown",
    },
  });

  const handleSubmit = (text: string) => {
    sendMessage({
      text,
    });
  };

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role}: {message.content}
        </div>
      ))}
    </div>
  );
}`,
    description: "Paste markdown to see it parsed and streamed back in real time.",
    id: "markdown",
    preset: `
# Release Highlights

- **Streaming markdown** with live updates
- Rendered exactly as you provide it
- Great for previewing documentation tweaks`.trim(),
    section: "Platform API",
    title: "Markdown Streaming",
  },
];

export const allDemos = [...transportDemos, ...platformDemos];
