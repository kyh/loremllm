import type { UIMessage } from "ai";
import { StaticChatTransport } from "@loremllm/transport";

import type { StaticTransportContext } from "@loremllm/transport";

export type Demo = {
  id: string;
  title: string;
  section: string;
  description: string;
  placeholder?: string;
  preset?: string;
  transport?: StaticChatTransport;
  code?: string;
};

export const transportDemos: Demo[] = [
  {
    id: "transport-text-response",
    title: "Simple Text Response",
    section: "AI SDK Transport",
    description: "A simple response that echoes lorem ipsum text.",
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
    transport: new StaticChatTransport({
      chunkDelayMs: [50, 120],
      async *mockResponse() {
        yield {
          type: "text",
          text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
        };
      },
    }),
  },
  {
    id: "transport-tool-calling",
    title: "Tool Calling",
    section: "AI SDK Transport",
    description: "Simulates tool calls with progressive loading.",
    placeholder: "Try asking about the weather in a city.",
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
          const location = locationMatch?.[1]?.trim() ?? "San Francisco";

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
          const locationMatch = /weather in (.+?)(?:\?|$)/i.exec(userText);
          const location = locationMatch?.[1]?.trim() ?? "San Francisco";

          const toolCallId = `call_${Date.now()}`;

          yield {
            type: "tool-weather",
            toolCallId,
            toolName: "weather",
            state: "input-available",
            input: { location },
          };

          const temperature = 72 + Math.floor(Math.random() * 21) - 10;

          yield {
            type: "tool-weather",
            toolCallId,
            toolName: "weather",
            state: "output-available",
            input: { location },
            output: {
              location,
              temperature,
              condition: "sunny",
            },
          };

          yield {
            type: "text",
            text: `The weather in ${location} is sunny with a temperature of ${temperature}°F.`,
          };
        } else {
          yield {
            type: "text",
            text: "Try asking about the weather in a city!",
          };
        }
      },
    }),
  },
  {
    id: "transport-reasoning",
    title: "Reasoning Stream",
    section: "AI SDK Transport",
    description: "Stream in reasoning parts.",
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
    transport: new StaticChatTransport({
      chunkDelayMs: 30,
      async *mockResponse(context) {
        const userMessage = context.messages[context.messages.length - 1];
        const userText =
          userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        yield {
          type: "reasoning",
          text: `Let me think about "${userText}"...\n\nI need to provide a helpful response.`,
        };

        yield {
          type: "text",
          text: `Based on your question about "${userText}", here's my response with some reasoning that you can toggle above.`,
        };
      },
    }),
  },
];

export const platformDemos: Demo[] = [
  {
    id: "lorem",
    title: "Default Generator",
    section: "Platform API",
    description:
      "Generate dynamic lorem ipsum text with customizable parameters.",
    code: `import { useChat } from "@ai-sdk/react";

export function DefaultGenerator() {
  const { messages, sendMessage } = useChat({
    api: "/api/chat",
    body: {
      // Default lorem ipsum generator
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
  },
  {
    id: "demo",
    title: "Collections",
    section: "Platform API",
    description:
      "Define a collection of LLM interactions and query it with a specific input.",
    placeholder:
      'Try asking "What is Lorem Ipsum?" or "Faq", it will respond with the corresponding response from the collection.',
    code: `import { useChat } from "@ai-sdk/react";

export function CollectionsDemo() {
  const { messages, sendMessage } = useChat({
    api: "/api/chat",
    body: {
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
  },
  {
    id: "markdown",
    title: "Markdown Streaming",
    section: "Platform API",
    description:
      "Paste markdown to see it parsed and streamed back in real time.",
    preset: `
# Release Highlights

- **Streaming markdown** with live updates
- Rendered exactly as you provide it
- Great for previewing documentation tweaks`.trim(),
    code: `import { useChat } from "@ai-sdk/react";

export function MarkdownStreamingDemo() {
  const { messages, sendMessage } = useChat({
    api: "/api/chat",
    body: {
      markdown: true,
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
  },
];

export const allDemos = [...transportDemos, ...platformDemos];
