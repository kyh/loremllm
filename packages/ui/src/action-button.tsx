import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "./utils";

const actionButtonVariants = cva(
  "m-0 box-border inline-flex flex-shrink-0 cursor-pointer items-center justify-between border-0 p-0 font-[var(--font-family-mono)] text-[var(--font-size)] outline-0",
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

interface ActionButtonProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof actionButtonVariants> {
  hotkey?: React.ReactNode;
  isSelected?: boolean;
}

const ActionButton = ({
  className,
  variant,
  onClick,
  hotkey,
  children,
  isSelected,
  ...props
}: ActionButtonProps) => {
  return (
    <div
      className={cn(actionButtonVariants({ variant }), className)}
      onClick={onClick}
      tabIndex={0}
      role="button"
      {...props}
    >
      {hotkey && (
        <span className="flex-shrink-0 cursor-pointer bg-[var(--theme-button-foreground)] px-[1ch] indent-0 font-normal text-[var(--theme-text)] select-none hover:bg-[var(--theme-focused-foreground)] focus:bg-[var(--theme-focused-foreground)]">
          {hotkey}
        </span>
      )}
      <span
        className={cn(
          "flex-shrink-0 cursor-pointer bg-[var(--theme-button-background)] px-[1ch] indent-0 font-normal uppercase shadow-[inset_0_0_0_2px_var(--theme-button-foreground)] select-none hover:shadow-[inset_0_0_0_2px_var(--theme-focused-foreground)] focus:shadow-[inset_0_0_0_2px_var(--theme-focused-foreground)]",
          {
            "bg-[var(--theme-focused-foreground)]": isSelected,
          },
        )}
      >
        {children}
      </span>
    </div>
  );
};

ActionButton.displayName = "ActionButton";

export { ActionButton, actionButtonVariants };
