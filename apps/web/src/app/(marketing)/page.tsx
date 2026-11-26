import { JsonLd } from "@/components/json-ld";
import { HomeOutline } from "@/components/marketing/home-outline";
import {
  AgentTests,
  Capabilities,
  Faq,
  Features,
  Hero,
  Packages,
  Scenarios,
  Steps,
} from "@/components/marketing/landing-sections";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import {
  canonicalAlternates,
  homeOpenGraphVideos,
  pageOpenGraph,
  pageTwitter,
} from "@/lib/agent/page-metadata";
import { buildHomeGraph } from "@/lib/agent/structured-data";
import { siteConfig } from "@/lib/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: canonicalAlternates("/"),
  openGraph: { ...pageOpenGraph("/"), videos: homeOpenGraphVideos },
  title: { absolute: `${siteConfig.name} — ${siteConfig.description}` },
  twitter: pageTwitter(),
};

const Page = () => (
  <MarketingShell>
    <JsonLd node={buildHomeGraph()} />
    <HomeOutline />
    <Hero />
    <Scenarios />
    <Steps />
    <Features />
    <AgentTests />
    <Capabilities />
    <Packages />
    <Faq />
  </MarketingShell>
);

export default Page;
