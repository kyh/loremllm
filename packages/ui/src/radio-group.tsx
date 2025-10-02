"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "./utils";

const RadioGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) => {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-0", className)}
      {...props}
    />
  );
};

const RadioGroupItem = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  children?: React.ReactNode;
}) => {
  return (
    <div className="relative flex items-start justify-between">
      <RadioGroupPrimitive.Item
        data-slot="radio-group-item"
        className={cn(
          "inline-flex h-[calc(var(--font-size)*var(--theme-line-height-base))] w-[3ch] flex-shrink-0 cursor-pointer items-center justify-center bg-[var(--theme-button-foreground)] text-[var(--theme-text)] transition-all duration-200 ease-in-out outline-none focus:bg-[var(--theme-focused-foreground)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--theme-text)]",
          className,
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator
          data-slot="radio-group-indicator"
          className="flex items-center justify-center"
        >
          <span
            aria-hidden="true"
            className="inline-block h-[1ch] w-[1ch] rotate-45 bg-[var(--theme-background)]"
          />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      <div className="w-full min-w-[10%] self-stretch bg-[var(--theme-button-background)] pb-[calc(8px*var(--theme-line-height-base))] shadow-[inset_0_1px_0_0_var(--theme-border-subdued)]">
        &nbsp;&nbsp;{children}
      </div>
    </div>
  );
};

export { RadioGroup, RadioGroupItem };
