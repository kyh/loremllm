import type { ReactNode } from "react";
import { Logo } from "@repo/ui/logo";
import { DocsLayout } from "fumadocs-ui/layouts/docs";

import { source } from "@/lib/source";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <DocsLayout
      tree={source.pageTree}
      githubUrl="https://github.com/kyh/init"
      nav={{ title: <Logo /> }}
    >
      {children}
    </DocsLayout>
  );
};

export default Layout;
