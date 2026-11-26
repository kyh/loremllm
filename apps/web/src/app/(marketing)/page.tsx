import localFont from "next/font/local";
import { cn } from "cn";

import { JsonLd } from "@/components/json-ld";
import {
  canonicalAlternates,
  homeOpenGraphVideos,
  pageOpenGraph,
  pageTwitter,
} from "@/lib/agent/page-metadata";
import { buildHomeGraph } from "@/lib/agent/structured-data";
import { siteConfig } from "@/lib/site-config";

import type { Metadata } from "next";

import { HomeOutline } from "./_components/home-outline";
import { LandingFooter } from "./_components/landing/landing-footer";
import {
  AgentTests,
  Capabilities,
  Faq,
  Features,
  Hero,
  LandingNav,
  Packages,
  Scenarios,
  Steps,
} from "./_components/landing/landing-sections";

const inter = localFont({
  src: [
    { path: "./_components/landing/fonts/Inter-Regular.woff2", style: "normal", weight: "400" },
    { path: "./_components/landing/fonts/Inter-Medium.woff2", style: "normal", weight: "500" },
  ],
  variable: "--font-landing",
});

export const metadata: Metadata = {
  alternates: canonicalAlternates("/"),
  openGraph: { ...pageOpenGraph("/"), videos: homeOpenGraphVideos },
  title: { absolute: `${siteConfig.name} — ${siteConfig.description}` },
  twitter: pageTwitter(),
};

const Page = () => (
  <div className={cn(inter.variable, "landing flex min-h-dvh flex-col")}>
    <JsonLd node={buildHomeGraph()} />
    <LandingNav />
    <main className="grow">
      <HomeOutline />
      <Hero />
      <Scenarios />
      <Steps />
      <Features />
      <AgentTests />
      <Capabilities />
      <Packages />
      <Faq />
    </main>
    <LandingFooter />
  </div>
);

export default Page;
