"use client";

import type { UIMessage } from "ai";
import { useState } from "react";
import { createStaticChatTransport } from "@loremllm/transport";
import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Divider } from "@repo/ui/divider";
import { SidebarLayout } from "@repo/ui/sidebar-layout";
import { cn } from "@repo/ui/utils";

import type { StaticTransportContext } from "@loremllm/transport";
import { ChatBotDemo } from "./_components/chatbot-demo";

type Demo = {
  id: string;
  title: string;
  description: string;
  preset?: string;
  transport?: ReturnType<typeof createStaticChatTransport>;
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
    transport: createStaticChatTransport({
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
      "Simulates a weather tool call. Try asking about the weather in a city.",
    transport: createStaticChatTransport({
      chunkDelayMs: [20, 60],
      async *mockResponse(context: StaticTransportContext<UIMessage>) {
        const userMessage = context.messages[context.messages.length - 1];
        const userText =
          userMessage?.parts.find((p) => p.type === "text")?.text ?? "";

        // Check if user asked about weather
        if (userText.toLowerCase().includes("weather")) {
          const locationMatch = /weather in (.+?)(?:\?|$)/i.exec(userText);
          const location = locationMatch?.[1]?.trim() ?? "San Francisco";

          // Yield a tool call
          yield {
            type: "tool-weather",
            toolCallId: `call_${Date.now()}`,
            toolName: "weather",
            state: "output-available",
            input: { location },
            output: {
              location,
              temperature: 72 + Math.floor(Math.random() * 21) - 10,
              condition: "sunny",
            },
          };

          // Yield a text response with the tool result
          const temp = 72 + Math.floor(Math.random() * 21) - 10;
          yield {
            type: "text",
            text: `The weather in ${location} is sunny with a temperature of ${temp}°F.`,
          };
        } else {
          yield {
            type: "text",
            text: "Try asking about the weather!",
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
    transport: createStaticChatTransport({
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
