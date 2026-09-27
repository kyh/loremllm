import Link from "next/link";
import { Button } from "@repo/ui/components/button";

import { ProseLink } from "@/components/prose-link";
import { notFoundRecoveryLinks } from "@/lib/agent/markdown";

/** Lists the same `notFoundRecoveryLinks` the Markdown 404 renders, so people and agents get the same way out. */
const NotFound = () => (
  <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 p-8 text-center">
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
    </div>
    <nav aria-label="Where to look next" className="w-full border-t pt-6">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium">Try one of these</h2>
      <ul className="text-muted-foreground flex flex-col gap-2 text-left text-sm">
        {notFoundRecoveryLinks.map((item) => (
          <li key={item.label}>
            <ProseLink
              className="text-foreground underline underline-offset-4"
              href={item.href ?? "/"}
            >
              {item.label}
            </ProseLink>
            {item.text ? ` — ${item.text}` : null}
          </li>
        ))}
      </ul>
    </nav>
    <Button render={<Link href="/" />}>Back home</Button>
  </main>
);

export default NotFound;
