import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";

import { BrandMark } from "@/components/marketing/landing-sections";
import { siteConfig } from "@/lib/site-config";
import { source } from "@/lib/source";

const Layout = ({ children }: { children: ReactNode }) => (
  <DocsLayout
    tree={source.getPageTree()}
    githubUrl={siteConfig.repository}
    nav={{ title: <BrandMark className="text-sm font-medium" /> }}
    links={[
      { text: "Home", url: "/" },
      { text: "Dashboard", url: "/dashboard" },
    ]}
    themeSwitch={{ enabled: false }}
  >
    {children}
  </DocsLayout>
);

export default Layout;
