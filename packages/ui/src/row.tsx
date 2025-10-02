"use client";

import * as React from "react";

import { cn } from "./utils";

const Row = ({ className, ...props }: React.ComponentProps<"section">) => {
  return (
    <section
      data-slot="row"
      className={cn(
        "block border-0 outline-0 transition-[background] duration-200 ease-in-out focus:bg-[var(--theme-focused-foreground)]",
        className,
      )}
      {...props}
    />
  );
};

Row.displayName = "Row";

export { Row };
