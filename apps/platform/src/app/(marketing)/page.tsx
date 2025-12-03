"use client";

import Link from "next/link";
import { Logo } from "@repo/ui/logo";
import { ExternalLinkIcon } from "lucide-react";

import { platformDemos, transportDemos } from "./_components/demo-data";
import { DemoList } from "./_components/demo-list";
import { HoverText } from "./_components/hover-text";
import { ThemeToggle } from "./_components/theme-toggle";

const Page = () => {
  return (
    <main className="flex min-h-dvh flex-col gap-10 px-8 pt-8">
      <header className="flex flex-col gap-5">
        <Logo />
        <p>
          LoremLLM is a collection of tools that help developers mock LLM
          responses.
        </p>
      </header>
      <section className="flex flex-col justify-center gap-10">
        <div className="flex flex-col gap-2">
          <Link
            href="https://github.com/kyh/loremllm/blob/main/packages/transport/README.md"
            target="_blank"
          >
            <h2 className="text-heading flex items-center gap-1 text-xs uppercase">
              AI SDK Transport <ExternalLinkIcon className="size-3" />
            </h2>
          </Link>
          <DemoList demos={transportDemos} />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-heading flex items-center gap-1 text-xs uppercase">
            Platform API [IN PROGRESS]
          </h2>
          <DemoList demos={platformDemos} />
        </div>
      </section>
      <footer className="mt-auto flex items-center justify-between gap-4 pb-5 text-sm">
        <div className="flex items-center gap-4">
          <span>©2025 Kaiyu Hsu</span>
        </div>
        <div className="flex items-center gap-4">
          <HoverText asChild>
            <Link href="https://twitter.com/kaiyuhsu" target="_blank">
              [X]
            </Link>
          </HoverText>
          <HoverText asChild>
            <Link href="https://github.com/kyh/loremllm" target="_blank">
              [GitHub]
            </Link>
          </HoverText>
          <ThemeToggle />
        </div>
      </footer>
    </main>
  );
};

export default Page;
