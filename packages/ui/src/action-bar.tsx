import * as React from "react";

import { ButtonGroup } from "./button-group";
import { cn } from "./utils";

type ActionBarProps = {
  children?: React.ReactNode;
} & React.ComponentProps<"div">;

const ActionBar = ({ className, children, ...props }: ActionBarProps) => {
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
};

export { ActionBar };
