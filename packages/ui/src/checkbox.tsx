"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const [isChecked, setIsChecked] = React.useState(
    props.defaultChecked || false,
  );

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "inline-block cursor-pointer bg-[var(--theme-button-foreground)] px-[1ch] text-[var(--theme-text)] transition-all duration-200 ease-in-out outline-none focus:bg-[var(--theme-focused-foreground)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onCheckedChange={(checked) => setIsChecked(!!checked)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {isChecked ? "╳" : "\u00A0"}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
