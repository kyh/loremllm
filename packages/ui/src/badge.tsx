import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "m-0 inline-flex min-h-[calc(var(--theme-line-height-base)*var(--font-size))] border-0 bg-[var(--theme-border)] px-[1ch] text-center align-top font-[var(--font-family-mono)] font-normal uppercase outline-0 transition-all duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Badge = ({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) => {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
};

export { Badge, badgeVariants };
