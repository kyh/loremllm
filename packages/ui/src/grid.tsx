import * as React from "react";

import { cn } from "./utils";

const Grid = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="grid"
      className={cn(
        "block px-[2ch] py-[calc(var(--font-size)*var(--theme-line-height-base))]",
        className,
      )}
      {...props}
    />
  );
};

export { Grid };
