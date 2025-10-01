import * as React from "react";

import { ButtonGroup } from "./button-group";
import { cn } from "./utils";

interface ActionBarProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode;
}

function ActionBar({ className, children, ...props }: ActionBarProps) {
  return (
    <div
      data-slot="action-bar"
      className={cn(
        "bg-[var(--theme-background)] shadow-[inset_0_0_0_1px_var(--theme-border)]",
        className,
      )}
      {...props}
    >
      <ButtonGroup>{children}</ButtonGroup>
    </div>
  );
}

export { ActionBar };
