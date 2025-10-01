"use client";

import * as React from "react";

import { cn } from "./utils";

const ListItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => {
    return (
      <li
        data-slot="list-item"
        className={cn(
          "pl-[1ch] focus:bg-[var(--theme-focused-foreground)] focus:outline-0",
          className,
        )}
        tabIndex={0}
        ref={ref}
        {...props}
      />
    );
  },
);

ListItem.displayName = "ListItem";

export { ListItem };
