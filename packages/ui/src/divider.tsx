import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "./utils";

const dividerVariants = cva("w-full", {
  variants: {
    type: {
      default:
        "flex h-[calc(var(--font-size)*var(--theme-line-height-base))] flex-shrink-0 flex-col items-center justify-center border-0 outline-0",
      double:
        "flex h-[calc(var(--font-size)*var(--theme-line-height-base))] flex-shrink-0 flex-col items-center justify-center border-0 outline-0",
      gradient:
        "h-[calc(var(--font-size)*var(--theme-line-height-base))] bg-gradient-to-r from-transparent via-[var(--theme-border)] to-transparent",
    },
  },
  defaultVariants: {
    type: "default",
  },
});

interface DividerProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof dividerVariants> {}

function Divider({ className, type, ...props }: DividerProps) {
  if (type === "gradient") {
    return (
      <div
        data-slot="divider"
        className={cn(dividerVariants({ type }), className)}
        {...props}
      />
    );
  }

  if (type === "double") {
    return (
      <div
        data-slot="divider"
        className={cn(dividerVariants({ type }), className)}
        {...props}
      >
        <div
          className="block h-[2px] w-full flex-shrink-0 bg-[var(--theme-text)]"
          style={{ marginBottom: `2px` }}
        />
        <div className="block h-[2px] w-full flex-shrink-0 bg-[var(--theme-text)]" />
      </div>
    );
  }

  return (
    <div
      data-slot="divider"
      className={cn(dividerVariants({ type }), className)}
      {...props}
    >
      <div className="block h-[2px] w-full flex-shrink-0 bg-[var(--theme-text)]" />
    </div>
  );
}

export { Divider, dividerVariants };
