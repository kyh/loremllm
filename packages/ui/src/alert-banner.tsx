import * as React from "react";

import { cn } from "./utils";

function AlertBanner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-banner"
      className={cn(
        "block bg-[var(--theme-border)] px-[2ch] py-[calc(var(--font-size)*var(--theme-line-height-base))] font-normal shadow-[1ch_1ch_0_0_var(--theme-border-subdued)]",
        className,
      )}
      {...props}
    />
  );
}

export { AlertBanner };
