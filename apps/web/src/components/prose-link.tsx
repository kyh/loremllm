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
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) => {
  if (rendersOutsideRouter(href)) {
    const offSite = isOffSite(href);
    return (
      <a
        className={className}
        href={href}
        rel={offSite ? "noreferrer" : undefined}
        target={offSite ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
};
