import Link from "next/link";

import { pageLinks } from "@/lib/agent/markdown";
import { siteConfig } from "@/lib/site-config";

import { HoverText } from "./hover-text";
import { ThemeToggle } from "./theme-toggle";

/**
 * `crawler-only` keeps the page links in the HTML for crawlers and agents but
 * off the visible footer, so the home page keeps its original one-line footer.
 */
export const SiteFooter = ({
  pageLinkDisplay,
}: {
  pageLinkDisplay: "visible" | "crawler-only";
}) => (
  <footer
    className={
      pageLinkDisplay === "visible"
        ? "mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-5 text-sm"
        : "mt-auto flex items-center justify-between gap-4 pb-5 text-sm"
    }
  >
    <div
      className={
        pageLinkDisplay === "visible"
          ? "flex flex-wrap items-center gap-x-4 gap-y-2"
          : "flex items-center gap-4"
      }
    >
      <span>{`©2026 ${siteConfig.author.name}`}</span>
      {pageLinkDisplay === "visible" ? (
        pageLinks.map((page) => (
          <HoverText key={page.label} asChild>
            <Link href={page.href ?? "/"}>{`[${page.label}]`}</Link>
          </HoverText>
        ))
      ) : (
        <ul className="sr-only">
          {pageLinks.map((page) => (
            <li key={page.label}>
              <Link href={page.href ?? "/"} prefetch={false} tabIndex={-1}>
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
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
