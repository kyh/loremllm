import { Logo } from "@repo/ui/components/logo";

import { JsonLd } from "@/components/json-ld";
import { canonicalAlternates, pageOpenGraph, pageTwitter } from "@/lib/agent/page-metadata";
import { buildHomeGraph } from "@/lib/agent/structured-data";
import { siteConfig } from "@/lib/site-config";

import type { Metadata } from "next";

import { DemoSections } from "./_components/demo-sections";
import { HomeOutline } from "./_components/home-outline";
import { SiteFooter } from "./_components/site-footer";

export const metadata: Metadata = {
  alternates: canonicalAlternates("/"),
  openGraph: pageOpenGraph("/"),
  title: { absolute: `${siteConfig.name} — ${siteConfig.description}` },
  twitter: pageTwitter(),
};

const Page = () => (
  <main className="flex min-h-dvh flex-col gap-10 px-8 pt-8">
    <JsonLd node={buildHomeGraph()} />
    <header className="flex flex-col gap-5">
      <Logo />
      <p>LoremLLM is a collection of tools that help developers mock LLM responses.</p>
    </header>
    <HomeOutline />
    <DemoSections />
    <SiteFooter />
  </main>
);

export default Page;
