import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "./utils";

interface ActionListItemProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  href?: string;
  target?: string;
  asChild?: boolean;
}

function ActionListItem({
  className,
  icon,
  href,
  target,
  asChild = false,
  children,
  onClick,
  ...props
}: ActionListItemProps) {
  const Comp = asChild ? Slot : href ? "a" : "div";

  const linkProps = href
    ? {
        href,
        target,
        role: "link" as const,
      }
    : {
        role: "button" as const,
      };

  return (
    <Comp
      className={cn(
        "flex cursor-pointer items-start justify-between border-0 bg-transparent text-[var(--theme-text)] no-underline outline-0 visited:bg-transparent visited:text-[var(--theme-text)] hover:bg-transparent hover:text-[var(--theme-text)] hover:[&_.icon]:bg-[var(--theme-focused-foreground)] focus:[&_.icon]:bg-[var(--theme-focused-foreground)]",
        className,
      )}
      onClick={onClick as any}
      tabIndex={0}
      {...linkProps}
      {...props}
    >
      <figure className="icon inline-flex h-[calc(var(--font-size)*var(--theme-line-height-base))] w-[3ch] flex-shrink-0 items-center justify-center bg-[var(--theme-button-foreground)] select-none">
        {icon}
      </figure>
      <span className="inline-flex w-full min-w-[10%] items-center justify-start self-stretch bg-[var(--theme-button-background)] px-[1ch] select-none">
        {children}
      </span>
    </Comp>
  );
}

export { ActionListItem };
