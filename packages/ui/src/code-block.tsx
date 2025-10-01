"use client";

import * as React from "react";

type CodeBlockProps = {
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLPreElement>;

const CodeBlock = React.forwardRef<HTMLPreElement, CodeBlockProps>(
  ({ children, ...rest }, ref) => {
    return (
      <pre
        className="scrollbar-none block overflow-auto bg-[var(--theme-border-subdued)] [font-family:inherit] font-normal [&::-webkit-scrollbar]:hidden"
        ref={ref}
        {...rest}
      >
        {String(children)
          .split("\n")
          .map((line, index) => (
            <div key={index} className="flex items-start justify-between">
              <span className="inline-flex w-[3ch] bg-[var(--theme-background)] pr-[1ch] text-right opacity-50 select-none">
                {String(index + 1).padStart(3, "0")}
              </span>
              <span className="w-full min-w-[10%] bg-[var(--theme-border-subdued)] pl-[2ch] whitespace-pre">
                {line}
              </span>
            </div>
          ))}
      </pre>
    );
  },
);

CodeBlock.displayName = "CodeBlock";

export { CodeBlock };
