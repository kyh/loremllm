"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { allDemos, platformDemos, transportDemos } from "./demo-data";
import { DemoList } from "./demo-list";
import { DemoNavigationProvider } from "./demo-navigation-context";

/** Client-only because each demo carries a live `StaticChatTransport`, which cannot cross the RSC boundary. */
export const DemoSections = () => (
  <DemoNavigationProvider demos={allDemos}>
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
  </DemoNavigationProvider>
);
