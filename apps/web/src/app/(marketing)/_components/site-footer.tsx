import Link from "next/link";

import { pageLinks } from "@/lib/agent/markdown";
import { siteConfig } from "@/lib/site-config";

import { HoverText } from "./hover-text";
import { ThemeToggle } from "./theme-toggle";

export const SiteFooter = () => (
  <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-5 text-sm">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span>{`©2026 ${siteConfig.author.name}`}</span>
      {pageLinks.map((page) => (
        <HoverText key={page.label} asChild>
          <Link href={page.href ?? "/"}>{`[${page.label}]`}</Link>
        </HoverText>
      ))}
    </div>
    <div className="flex items-center gap-4">
      <HoverText asChild>
        <Link href="https://twitter.com/kaiyuhsu" target="_blank">
          [X]
        </Link>
      </HoverText>
      <HoverText asChild>
        <Link href={siteConfig.repository} target="_blank">
          [GitHub]
        </Link>
      </HoverText>
      <ThemeToggle />
    </div>
  </footer>
);
