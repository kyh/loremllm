import Link from "next/link";
import type { ReactNode } from "react";

import { rendersOutsideRouter } from "@/lib/agent/site-pages";

const isOffSite = (href: string) => href.startsWith("http") || href.startsWith("mailto:");

/**
 * A link that picks `next/link` for pages and a plain `<a>` for route handlers
 * (`/llms.txt`, `/openapi.json`) and off-site URLs. Only off-site links open in
 * a new tab.
 */
export const ProseLink = ({
  href,
  children,
  className,
  tabIndex,
  prefetch,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  tabIndex?: number;
  prefetch?: boolean;
}) => {
  if (rendersOutsideRouter(href)) {
    const offSite = isOffSite(href);
    return (
      <a
        className={className}
        href={href}
        rel={offSite ? "noreferrer" : undefined}
        tabIndex={tabIndex}
        target={offSite ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href} prefetch={prefetch} tabIndex={tabIndex}>
      {children}
    </Link>
  );
};
