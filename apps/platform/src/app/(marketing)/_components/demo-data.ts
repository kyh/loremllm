import type { UIMessage } from "ai";
import { StaticChatTransport } from "@loremllm/transport";

import type { StaticTransportContext } from "@loremllm/transport";

export type Demo = {
  id: string;
  title: string;
  description: string;
  placeholder?: string;
  preset?: string;
  transport?: StaticChatTransport;
};

export const transportDemos: Demo[] = [
  {
    id: "transport-text-response",
    title: "Simple Text Response",
    description: "A simple response that echoes lorem ipsum text.",
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
    description: "Simulates tool calls with progressive loading.",
    placeholder: "Try asking about the weather in a city.",
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
    description: "Stream in reasoning parts.",
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
    description:
      "Generate dynamic lorem ipsum text with customizable parameters.",
  },
  {
    id: "demo",
    title: "Collections",
    description:
      "Define a collection of LLM interactions and query it with a specific input.",
    placeholder:
      'Try asking "What is Lorem Ipsum?" or "Faq", it will respond with the corresponding response from the collection.',
  },
  {
    id: "markdown",
    title: "Markdown Streaming",
    description:
      "Paste markdown to see it parsed and streamed back in real time.",
    preset: `
# Release Highlights

- **Streaming markdown** with live updates
- Rendered exactly as you provide it
- Great for previewing documentation tweaks`.trim(),
  },
];

export const allDemos = [...transportDemos, ...platformDemos];
