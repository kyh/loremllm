"use client";

import * as React from "react";

import { cn } from "./utils";

const Row = React.forwardRef<HTMLElement, React.ComponentProps<"section">>(
  ({ className, ...props }, ref) => {
    return (
      <section
        data-slot="row"
        className={cn(
          "block border-0 outline-0 transition-[background] duration-200 ease-in-out focus:bg-[var(--theme-focused-foreground)]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Row.displayName = "Row";

export { Row };
