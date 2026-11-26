import type { ReactNode } from "react";

import { LandingFooter } from "./landing-footer";
import { LandingNav } from "./landing-sections";

export const MarketingShell = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-dvh flex-col">
    <LandingNav />
    <main className="grow">{children}</main>
    <LandingFooter />
  </div>
);
