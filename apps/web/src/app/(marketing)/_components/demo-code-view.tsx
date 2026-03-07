"use client";

import { CodeBlock } from "@repo/ui/ai-elements/code-block";

import type { Demo } from "./demo-data";

type DemoCodeViewProps = {
  demo: Demo;
};

export const DemoCodeView = ({ demo }: DemoCodeViewProps) => {
  if (!demo.code) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        No code example available
      </div>
    );
  }

  return <CodeBlock code={demo.code} language="typescript" showLineNumbers />;
};
