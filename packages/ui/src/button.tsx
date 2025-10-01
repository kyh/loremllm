import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "m-0 inline-block min-h-[calc(var(--theme-line-height-base)*(var(--font-size)*2))] w-full cursor-pointer border-0 px-[2ch] py-0 text-center text-base leading-[calc(var(--theme-line-height-base)*2em)] font-[var(--font-family-mono)] font-normal tracking-[1px] uppercase outline-0 transition-all duration-200 ease-in-out disabled:cursor-not-allowed disabled:bg-[var(--theme-button-background)] disabled:text-[var(--theme-button-foreground)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--theme-button)] text-[var(--theme-button-text)] hover:bg-[var(--theme-focused-foreground)] focus:bg-[var(--theme-focused-foreground)]",
        secondary:
          "border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-text)] hover:border-transparent hover:bg-[var(--theme-focused-foreground)] focus:border-transparent focus:bg-[var(--theme-focused-foreground)]",
        destructive:
          "bg-[var(--theme-button)] text-[var(--theme-button-text)] hover:bg-[var(--theme-focused-foreground)] focus:bg-[var(--theme-focused-foreground)]",
        outline:
          "border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-text)] hover:border-transparent hover:bg-[var(--theme-focused-foreground)] focus:border-transparent focus:bg-[var(--theme-focused-foreground)]",
        ghost:
          "bg-transparent text-[var(--theme-text)] hover:bg-[var(--theme-focused-foreground)] focus:bg-[var(--theme-focused-foreground)]",
        link: "bg-transparent text-[var(--theme-text)] underline underline-offset-4 hover:bg-[var(--theme-focused-foreground)]",
      },
      size: {
        default:
          "min-h-[calc(var(--theme-line-height-base)*(var(--font-size)*2))] px-[2ch]",
        sm: "min-h-[calc(var(--theme-line-height-base)*(var(--font-size)*1.5))] px-[1.5ch]",
        lg: "min-h-[calc(var(--theme-line-height-base)*(var(--font-size)*2.5))] px-[3ch]",
        icon: "w-[calc(var(--theme-line-height-base)*(var(--font-size)*2))] min-w-[calc(var(--theme-line-height-base)*(var(--font-size)*2))]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
