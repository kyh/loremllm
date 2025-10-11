"use client";

import { useMemo, useState } from "react";

import { ActionButton } from "@repo/ui/action-button";
import { Avatar, AvatarFallback } from "@repo/ui/avatar";
import { Divider } from "@repo/ui/divider";
import { Logo } from "@repo/ui/logo";
import { Navigation } from "@repo/ui/navigation";
import { RowEllipsis } from "@repo/ui/row-ellipsis";
import { SidebarLayout } from "@repo/ui/sidebar-layout";
import { cn } from "@repo/ui/utils";

import { ChatBotDemo } from "./_components/chatbot-demo";

type DemoConfig = {
  id: "demo" | "lorem" | "markdown";
  title: string;
  description: string;
  preset?: string;
};

const demos: DemoConfig[] = [
  {
    id: "demo",
    title: "Demo Collection Chat",
    description: "This demo queries the \"demo\" collection for responses.",
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
    description: "Paste markdown to see it parsed and streamed back in real time.",
    preset: `# Release Highlights

- **Streaming markdown** with live updates
- Rendered exactly as you provide it
- Great for previewing documentation tweaks`,
  },
];

const Page = () => {
  const [activeDemoId, setActiveDemoId] = useState<DemoConfig["id"]>("demo");

  const activeDemo = useMemo(
    () => demos.find((demo) => demo.id === activeDemoId) ?? demos[0],
    [activeDemoId],
  );

  return (
    <main className="mt-8 flex flex-col gap-6">
      <Navigation
        logo="✶"
        left={
          <div className="flex gap-2">
            <ActionButton onClick={() => setActiveDemoId("demo")}>
              DEMO CHAT
            </ActionButton>
            <ActionButton onClick={() => setActiveDemoId("lorem")}>
              LOREM IPSUM
            </ActionButton>
            <ActionButton onClick={() => setActiveDemoId("markdown")}>
              MARKDOWN
            </ActionButton>
          </div>
        }
      />
      <Divider type="double" />
      <SidebarLayout
        defaultSidebarWidth={32}
        isShowingHandle
        sidebar={
          <ul className="flex flex-col gap-2">
            {demos.map((demo) => (
              <li key={demo.id}>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 border-0 bg-transparent px-2 py-2 text-left text-sm outline-none transition",
                    "hover:bg-[var(--theme-focused-foreground)] focus:bg-[var(--theme-focused-foreground)]",
                    activeDemoId === demo.id &&
                      "bg-[var(--theme-focused-foreground)]",
                  )}
                  onClick={() => setActiveDemoId(demo.id)}
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
                  <div className="flex flex-col gap-1">
                    <RowEllipsis>
                      <span className="font-semibold uppercase">
                        {demo.title}
                      </span>
                    </RowEllipsis>
                    <RowEllipsis>
                      <span className="text-xs text-muted-foreground">
                        {demo.description}
                      </span>
                    </RowEllipsis>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        }
      >
        <div className="flex flex-col gap-6">
          <Logo />
          <header className="flex flex-col gap-2">
            <span className="text-xs uppercase text-muted-foreground">
              {activeDemo.id === "demo"
                ? "Collection"
                : activeDemo.id === "lorem"
                  ? "Generator"
                  : "Streaming"}
            </span>
            <h1 className="text-xl font-semibold">{activeDemo.title}</h1>
            <p className="text-sm text-muted-foreground">
              {activeDemo.description}
            </p>
          </header>
          <ChatBotDemo mode={activeDemo.id} preset={activeDemo.preset} />
        </div>
      </SidebarLayout>
    </main>
  );
};

export default Page;
