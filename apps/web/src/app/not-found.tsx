import Link from "next/link";

import { MarketingShell } from "@/components/marketing/marketing-shell";
import { buttonVariants, wrapperClass } from "@/components/marketing/landing-sections";
import { ProseLink } from "@/components/prose-link";
import { notFoundRecoveryLinks } from "@/lib/agent/markdown";
import { cn } from "cn";

const NotFound = () => (
  <MarketingShell>
    <div className={cn(wrapperClass, "pt-32 pb-24")}>
      <p className="text-muted-foreground text-sm">404</p>
      <h1 className="text-foreground mt-2 text-4xl font-medium tracking-tight md:text-5xl lg:text-6xl">
        No scenario matched
      </h1>
      <p className="text-muted-foreground mt-4 max-w-md text-base text-pretty">
        This page doesn&apos;t exist or has moved. Try one of these instead.
      </p>
      <nav aria-label="Where to look next" className="border-muted mt-12 max-w-2xl border-t">
        <ul className="divide-muted divide-y">
          {notFoundRecoveryLinks.map((item) => (
            <li key={item.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
              <ProseLink
                className="text-foreground hover:text-muted-foreground w-40 shrink-0 text-sm font-medium duration-300"
                href={item.href ?? "/"}
              >
                {item.label}
              </ProseLink>
              <span className="text-muted-foreground text-sm">{item.text}</span>
            </li>
          ))}
        </ul>
      </nav>
      <Link href="/" className={cn(buttonVariants.default, "mt-12 h-11 px-8 text-base")}>
        Back home
      </Link>
    </div>
  </MarketingShell>
);

export default NotFound;
