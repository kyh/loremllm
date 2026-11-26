import Link from "next/link";
import { cn } from "cn";

import { siteConfig } from "@/lib/site-config";

import { FeatureCover } from "./feature-cover";
import { coreFeatures, footerSections } from "./landing-data";
import { BrandMark, buttonVariants, wrapperClass } from "./landing-sections";
import { Smoke } from "./smoke";

const coverMotifs = [
  ...coreFeatures.map((feature) => ({ motif: feature.motif, title: feature.title })),
  { motif: "loop" as const, title: "Scenarios" },
  { motif: "grid" as const, title: "Structured output" },
];

export const LandingFooter = () => (
  <footer className="pb-8">
    <div className={wrapperClass}>
      <div className="bg-muted relative overflow-hidden rounded-3xl">
        <Smoke ground="muted" />
        <div className="relative p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <h2 className="text-foreground text-lg font-medium tracking-tight sm:text-xl md:text-2xl lg:text-3xl">
                Stop paying for test tokens
              </h2>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                Mock the model, keep the stream. Free to start and open source all the way down.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/auth/register"
                  className={cn(buttonVariants.default, "h-9 px-6 text-sm")}
                >
                  Create an account
                </Link>
                <Link href="/docs" className={cn(buttonVariants.outline, "h-9 px-6 text-sm")}>
                  Docs
                </Link>
              </div>
              <BrandMark className="text-foreground mt-12 text-sm font-medium" />
              <p className="text-muted-foreground mt-2 text-xs">
                {`© 2026 ${siteConfig.author.name}`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-6">
              {footerSections.map((section) => (
                <div key={section.title}>
                  <p className="text-muted-foreground text-xs">{section.title}</p>
                  <ul className="mt-4 flex flex-col gap-1">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="text-foreground hover:text-muted-foreground text-sm font-medium duration-300"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <ul aria-hidden="true" className="mt-24 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {coverMotifs.map((cover) => (
              <li key={cover.title}>
                <FeatureCover motif={cover.motif} className="bg-background rounded-xl" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </footer>
);
