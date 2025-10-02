import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};

export { Button, buttonVariants };
