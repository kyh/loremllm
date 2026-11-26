import Image from "next/image";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { cn } from "cn";

import { siteConfig } from "@/lib/site-config";

import type { Feature } from "./landing-data";
import { FeatureCover } from "./feature-cover";
import {
  agentTestCode,
  capabilities,
  coreFeatures,
  packages,
  questions,
  scenarioRows,
  steps,
} from "./landing-data";
import { Smoke } from "./smoke";
import { StreamPreview } from "./stream-preview";

export const wrapperClass = "mx-auto w-full max-w-340 px-4 lg:px-24 2xl:max-w-380";

const buttonBase =
  "inline-flex w-fit shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export const buttonVariants = {
  default: cn(buttonBase, "bg-foreground text-background hover:bg-foreground/90"),
  muted: cn(buttonBase, "bg-muted text-foreground hover:bg-muted/70"),
  outline: cn(buttonBase, "text-foreground outline -outline-offset-1 outline-muted hover:bg-muted"),
};

const linkClass = "text-foreground hover:text-muted-foreground duration-300";

export const BrandMark = ({ className }: { className?: string }) => (
  <span className={cn("flex items-center gap-2", className)}>
    <Image
      src="/favicon/favicon-96x96.png"
      alt=""
      width={28}
      height={28}
      className="rounded-md"
      priority
    />
    {siteConfig.name}
  </span>
);

const SectionHeading = ({
  title,
  subtitle,
  link,
}: {
  title: string;
  subtitle?: string;
  link?: { label: string; href: string };
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between lg:items-end">
    <div>
      <h2 className="text-foreground text-lg font-medium tracking-tight sm:text-xl md:text-2xl lg:text-3xl">
        {title}
      </h2>
      {subtitle === undefined ? null : (
        <p className="text-muted-foreground mt-1 text-sm text-pretty">{subtitle}</p>
      )}
    </div>
    {link === undefined ? null : (
      <Link href={link.href} className={cn("text-sm font-medium", linkClass)}>
        {link.label}
      </Link>
    )}
  </div>
);

export const LandingNav = () => (
  <header className="bg-background sticky top-0 z-50">
    <div className={wrapperClass}>
      <nav className="text-foreground flex h-16 items-center justify-between gap-8">
        <Link href="/" className={cn("text-base font-medium", linkClass)}>
          <BrandMark />
        </Link>
        <div className="hidden items-center gap-6 text-sm lg:flex">
          <a href="#features" className={linkClass}>
            Features
          </a>
          <a href="#packages" className={linkClass}>
            Packages
          </a>
          <Link href="/docs" className={linkClass}>
            Docs
          </Link>
          <Link href={siteConfig.repository} target="_blank" className={linkClass}>
            GitHub
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/auth/login" className={linkClass}>
            Sign in
          </Link>
          <Link href="/auth/register" className={cn(buttonVariants.default, "h-8 px-4 text-xs")}>
            Start free
          </Link>
        </div>
      </nav>
    </div>
  </header>
);

export const Hero = () => (
  <section className="relative overflow-hidden">
    <Smoke fadeEdges />
    <div className={cn(wrapperClass, "relative pt-12 pb-2")}>
      <div className="bg-muted grid grid-cols-1 gap-2 rounded-3xl p-2 md:grid-cols-12">
        <StreamPreview className="min-h-80 rounded-2xl md:col-span-5" />
        <div className="flex flex-col justify-between gap-12 p-6 md:col-span-7">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-foreground">Mock LLM API</span>
            <span className="text-muted-foreground">OpenAI, Anthropic, AI SDK, MCP</span>
          </div>
          <div>
            <h1 className="text-foreground text-4xl font-medium tracking-tight text-balance md:text-5xl lg:text-6xl">
              Mock any LLM in seconds
            </h1>
            <p className="text-muted-foreground mt-4 max-w-md text-base text-pretty">
              Streaming completions, tool calls and MCP servers behind one base URL. Build and test
              AI features without a model, a key or a bill.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link
                href="/auth/register"
                className={cn(buttonVariants.default, "h-12 px-8 text-base")}
              >
                Start for free
              </Link>
              <Link href="/docs" className={cn(buttonVariants.outline, "h-12 px-6 text-base")}>
                Read the docs
              </Link>
            </div>
            <div className="flex flex-col text-sm">
              <span className="text-foreground font-medium">No model, no key</span>
              <span className="text-muted-foreground">Same answer every run</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const Scenarios = () => (
  <section>
    <div className={cn(wrapperClass, "pb-24")}>
      <div className="bg-muted flex flex-col overflow-hidden rounded-3xl">
        <div className="border-background flex items-baseline justify-between gap-4 border-b px-6 py-4">
          <h2 className="text-foreground text-base font-medium">One endpoint, every scenario</h2>
          <p className="text-muted-foreground text-xs">First match wins</p>
        </div>
        <ul className="divide-background flex flex-col divide-y">
          {scenarioRows.map((row) => (
            <li key={row.trigger} className="grid grid-cols-12 gap-4 px-6 py-3 text-sm">
              <span className="text-muted-foreground col-span-12 font-mono text-xs sm:col-span-5 sm:text-sm">
                {row.trigger}
              </span>
              <span className="text-foreground col-span-12 font-medium sm:col-span-7">
                {row.reply}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export const Steps = () => (
  <section>
    <div className={cn(wrapperClass, "py-24")}>
      <SectionHeading
        title="Up and running in three steps"
        subtitle="No SDK to learn. No code to change."
      />
      <ol className="border-muted mt-12 grid grid-cols-1 gap-8 border-t pt-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title}>
            <p className="text-muted-foreground text-sm tabular-nums">{`0${index + 1}`}</p>
            <h3 className="text-foreground mt-4 text-xl font-medium tracking-tight">
              {step.title}
            </h3>
            <p className="text-muted-foreground mt-1 max-w-xs text-sm text-pretty">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const FeatureRow = ({ feature }: { feature: Feature }) => (
  <li className="flex flex-col gap-6 py-6 md:flex-row md:items-center">
    <div className="w-24 shrink-0 md:w-32">
      <FeatureCover motif={feature.motif} className="bg-muted rounded-2xl" />
    </div>
    <div className="flex-1">
      <h3 className="text-foreground text-xl font-medium tracking-tight">{feature.title}</h3>
      <p className="text-muted-foreground mt-1 max-w-md text-sm text-pretty">
        {feature.description}
      </p>
    </div>
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-3 md:w-1/2">
      {feature.facts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="text-foreground mt-1">{fact.value}</dd>
        </div>
      ))}
    </dl>
  </li>
);

export const Features = () => (
  <section id="features" className="scroll-mt-16">
    <div className={cn(wrapperClass, "py-24")}>
      <SectionHeading
        title="Everything an LLM client expects"
        subtitle="Minus the model, the latency and the invoice."
        link={{ href: "/docs", label: "Read the docs" }}
      />
      <ul className="divide-muted border-muted mt-12 divide-y border-y">
        {coreFeatures.map((feature) => (
          <FeatureRow key={feature.id} feature={feature} />
        ))}
      </ul>
    </div>
  </section>
);

export const AgentTests = () => (
  <section>
    <div className={cn(wrapperClass, "py-24")}>
      <div className="bg-muted grid grid-cols-1 gap-2 rounded-3xl p-2 md:grid-cols-12">
        <pre className="bg-background text-foreground overflow-x-auto rounded-2xl p-6 font-mono text-xs leading-relaxed md:order-last md:col-span-7">
          <code>{agentTestCode}</code>
        </pre>
        <div className="flex flex-col justify-between gap-12 p-6 md:col-span-5">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-foreground">Made for agent tests</span>
            <span className="text-muted-foreground">@loremllm/test</span>
          </div>
          <div>
            <h2 className="text-foreground text-4xl font-medium tracking-tight text-balance md:text-5xl">
              Test the agent, not the model
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md text-base text-pretty">
              Script the exact tool calls your code should handle, then assert on what it does with
              them. No flaky outputs. No tokens burned in CI.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <Link href="/docs" className={cn(buttonVariants.default, "h-11 px-8 text-base")}>
              Write your first test
            </Link>
            <div className="flex flex-col text-sm">
              <span className="text-foreground font-medium">Runs offline</span>
              <span className="text-muted-foreground">Vitest and Jest</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const Capabilities = () => (
  <section>
    <div className={cn(wrapperClass, "py-24")}>
      <SectionHeading
        title="Built for real AI apps"
        subtitle="The parts of a model you can never get on demand. Now you can."
      />
      <ul className="border-muted mt-12 grid grid-cols-1 gap-8 border-t pt-8 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((item) => (
          <li key={item.title}>
            <h3 className="text-foreground text-base font-medium">{item.title}</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm text-pretty">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export const Packages = () => (
  <section id="packages" className="scroll-mt-16">
    <div className={cn(wrapperClass, "py-24")}>
      <SectionHeading
        title="Packages"
        subtitle="Mock and record from wherever your code runs."
        link={{ href: siteConfig.npmPackage, label: "View on npm" }}
      />
      <ul className="divide-muted border-muted mt-12 divide-y border-y">
        {packages.map((item) => (
          <li key={item.name} className="grid grid-cols-1 gap-2 py-4 md:grid-cols-12 md:gap-6">
            <span className="text-foreground font-mono text-sm md:col-span-4">{item.name}</span>
            <span className="text-muted-foreground text-sm text-pretty md:col-span-8">
              {item.description}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export const Faq = () => (
  <section>
    <div className={cn(wrapperClass, "py-24")}>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <SectionHeading title="Questions" subtitle="The short answers." />
        <div className="divide-muted border-muted divide-y border-y lg:col-span-2">
          {questions.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium">
                {item.question}
                <PlusIcon className="size-4 shrink-0 duration-300 group-open:rotate-45" />
              </summary>
              <p className="text-muted-foreground mt-3 max-w-xl text-sm">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  </section>
);
