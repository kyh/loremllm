"use client";

import * as React from "react";

import { cn } from "./utils";

const RowSpaceBetween = ({
  className,
  ...props
}: React.ComponentProps<"section">) => {
  return (
    <section
      data-slot="row-space-between"
      className={cn(
        "flex justify-between border-0 outline-0 transition-[background] duration-200 ease-in-out focus:bg-[var(--theme-focused-foreground)]",
        className,
      )}
      {...props}
    />
  );
};

RowSpaceBetween.displayName = "RowSpaceBetween";

export { RowSpaceBetween };
