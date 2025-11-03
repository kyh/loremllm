"use client";

import type { UIMessage } from "ai";
import { useState } from "react";
import { StaticChatTransport } from "@loremllm/transport";
import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Divider } from "@repo/ui/divider";
import { SidebarLayout } from "@repo/ui/sidebar-layout";
import { cn } from "@repo/ui/utils";

import type { StaticTransportContext } from "@loremllm/transport";
import { ChatBotDemo } from "../_components/chatbot-demo";

type Demo = {
  id: string;
  title: string;
  description: string;
  preset?: string;
  transport?: StaticChatTransport;
};

const platformDemos: Demo[] = [
  {
    id: "demo",
    title: "Demo Collection Chat",
    description:
      'This demo queries the "demo" collection for responses. Try asking "What is Lorem Ipsum?" or "Faq", it will respond with the corresponding response from the collection.',
  },
  {
    id: "lorem",
    title: "Lorem Ipsum Generator",
    description:
      "Generate dynamic lorem ipsum text with customizable parameters.",
  },
  {
    id: "markdown",
    title: "Markdown Streaming",
    description:
      "Paste markdown to see it parsed and streamed back in real time.",
    preset: `# Release Highlights

- **Streaming markdown** with live updates
- Rendered exactly as you provide it
- Great for previewing documentation tweaks`,
  },
];

const transportDemos: Demo[] = [
  {
    id: "transport-echo",
    title: "Echo Transport",
    description: "A simple transport that echoes lorem ipsum text.",
    transport: new StaticChatTransport({
      chunkDelayMs: 50,
      async *mockResponse() {
        yield {
          type: "text",
          text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
        };
      },
    }),
  },
  {
    id: "transport-weather",
    title: "Weather Tool",
    description:
      "Simulates a weather tool call with progressive loading. Try asking about the weather in a city.",
    transport: new StaticChatTransport({
      chunkDelayMs: (chunk) => {
        // Add delay for tool output chunks to show progressive loading
        if (
          chunk.type === "tool-output-available" ||
          chunk.type === "tool-output-error"
        ) {
          return 1000; // 1 second delay to show tool running
        }
        return [20, 60]; // Random delay for other chunks
      },
      async *mockResponse(context: StaticTransportContext<UIMessage>) {
        const userMessage = context.messages[context.messages.length - 1];
        const userText =
          userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        // Check if user asked about weather
        if (userText.toLowerCase().includes("weather")) {
          const locationMatch = /weather in (.+?)(?:\?|$)/i.exec(userText);
          const location = locationMatch?.[1]?.trim() ?? "San Francisco";

          const toolCallId = `call_${Date.now()}`;

          // Yield tool call in "input-available" state (shows as "Running")
          yield {
            type: "tool-weather",
            toolCallId,
            toolName: "weather",
            state: "input-available",
            input: { location },
          };

          // Simulate tool execution delay
          await new Promise((resolve) => setTimeout(resolve, 800));

          const temperature = 72 + Math.floor(Math.random() * 21) - 10;

          // Yield tool call with "output-available" state (shows as "Completed")
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

          // Yield a text response with the tool result
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
    description:
      "Demonstrates reasoning parts that can be toggled to view the AI's thought process.",
    transport: new StaticChatTransport({
      chunkDelayMs: 30,
      async *mockResponse(context: StaticTransportContext<UIMessage>) {
        const userMessage = context.messages[context.messages.length - 1];
        const userText =
          userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        // Yield reasoning first
        yield {
          type: "reasoning",
          text: `Let me think about "${userText}"...\n\nI need to provide a helpful response.`,
        };

        // Then yield the response
        yield {
          type: "text",
          text: `Based on your question about "${userText}", here's my response with some reasoning that you can toggle above.`,
        };
      },
    }),
  },
  {
    id: "transport-progressive",
    title: "Progressive Tool Loading",
    description:
      "Demonstrates a tool call with multiple loading steps. Shows input-streaming → input-available → output-available states.",
    transport: new StaticChatTransport({
      chunkDelayMs: (chunk) => {
        // Add delays to show progressive loading
        if (chunk.type === "tool-output-available") {
          return 1500; // 1.5s delay before showing output
        }
        return 50; // Small delay for other chunks
      },
      async *mockResponse(context: StaticTransportContext<UIMessage>) {
        const userMessage = context.messages[context.messages.length - 1];
        const userText =
          userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        const toolCallId = `call_${Date.now()}`;

        // Step 1: Tool input streaming (shows as "Pending")
        yield {
          type: "tool-search",
          toolCallId,
          toolName: "search",
          state: "input-streaming",
          input: { query: userText || "example query" },
        };

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Step 2: Tool input available (shows as "Running")
        yield {
          type: "tool-search",
          toolCallId,
          toolName: "search",
          state: "input-available",
          input: { query: userText || "example query" },
        };

        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 3: Tool output available (shows as "Completed")
        yield {
          type: "tool-search",
          toolCallId,
          toolName: "search",
          state: "output-available",
          input: { query: userText || "example query" },
          output: {
            results: [
              { title: "Result 1", url: "https://example.com/1" },
              { title: "Result 2", url: "https://example.com/2" },
            ],
          },
        };

        // Yield a text response
        yield {
          type: "text",
          text: `I found ${2} results for "${userText || "your query"}".`,
        };
      },
    }),
  },
];

const Page = () => {
  const [activeDemo, setActiveDemo] = useState<Demo | undefined>(
    platformDemos[0],
  );

  return (
    <main className="my-2 flex flex-1 flex-col">
      <Divider type="double" />
      <SidebarLayout
        defaultSidebarWidth={32}
        isShowingHandle
        sidebar={
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Platform</h2>
            {platformDemos.map((demo) => (
              <div key={demo.id}>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 border-0 bg-transparent px-2 py-2 text-left text-sm transition outline-none",
                    "hover:bg-[var(--theme-focused-foreground)] focus:bg-[var(--theme-focused-foreground)]",
                    activeDemo?.id === demo.id &&
                      "bg-[var(--theme-focused-foreground)]",
                  )}
                  onClick={() => setActiveDemo(demo)}
                  type="button"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {demo.title
                        .split(" ")
                        .map((word) => word[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold uppercase">
                      {demo.title}
                    </span>
                  </div>
                </button>
              </div>
            ))}
            <h2 className="text-lg font-semibold">AI SDK Transport</h2>
            {transportDemos.map((demo) => (
              <div key={demo.id}>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 border-0 bg-transparent px-2 py-2 text-left text-sm transition outline-none",
                    "hover:bg-[var(--theme-focused-foreground)] focus:bg-[var(--theme-focused-foreground)]",
                    activeDemo?.id === demo.id &&
                      "bg-[var(--theme-focused-foreground)]",
                  )}
                  onClick={() => setActiveDemo(demo)}
                  type="button"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {demo.title
                        .split(" ")
                        .map((word) => word[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold uppercase">
                      {demo.title}
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {activeDemo && (
            <ChatBotDemo
              key={activeDemo.id}
              mode={activeDemo.id}
              preset={activeDemo.preset}
              transport={activeDemo.transport}
            />
          )}
        </div>
      </SidebarLayout>
    </main>
  );
};

export default Page;
