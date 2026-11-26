import type { Metadata } from "next";
import Link from "next/link";

import { StreamPreview } from "@/components/marketing/stream-preview";
import { BrandMark } from "@/components/marketing/landing-sections";
import { Smoke } from "@/components/marketing/smoke";

export const metadata: Metadata = {
  description: "Sign in to or create a LoremLLM account.",
  robots: { follow: true, index: false },
  title: "Authentication",
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = (props: LayoutProps) => (
  <div className="grid min-h-dvh grid-cols-1 gap-2 p-2 lg:grid-cols-2">
    <div className="bg-muted relative hidden flex-col justify-between overflow-hidden rounded-3xl p-8 lg:flex">
      <Smoke ground="muted" />
      <Link href="/" className="text-foreground relative text-base font-medium">
        <BrandMark />
      </Link>
      <div className="relative flex flex-col gap-6">
        <StreamPreview className="rounded-2xl" />
        <div>
          <p className="text-foreground text-2xl font-medium tracking-tight">
            Mock any LLM in seconds
          </p>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            Scripted streams, tool calls and failures behind one base URL.
          </p>
        </div>
      </div>
    </div>
    <div className="flex flex-col items-center justify-center p-6 lg:p-8">
      <Link href="/" className="text-foreground mb-10 text-base font-medium lg:hidden">
        <BrandMark />
      </Link>
      {props.children}
    </div>
  </div>
);

export default Layout;
