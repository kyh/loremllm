import * as React from "react";

import { cn } from "./utils";

const Block = ({ className, ...props }: React.ComponentProps<"span">) => {
  return (
    <span
      data-slot="block"
      className={cn(
        "inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] w-[1ch] flex-shrink-0 bg-[var(--theme-text)] align-bottom",
        className,
      )}
      {...props}
    />
  );
};

export { Block };
