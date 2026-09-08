"use client";

import * as React from "react";

import { cn } from "cn";

/* oxlint-disable jsx-a11y/label-has-associated-control -- primitive: htmlFor or the wrapped control arrive through props */
const Label = ({ className, ...props }: React.ComponentProps<"label">) => (
  <label
    data-slot="label"
    className={cn(
      "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className,
    )}
    {...props}
  />
);
/* oxlint-enable jsx-a11y/label-has-associated-control */

export { Label };
