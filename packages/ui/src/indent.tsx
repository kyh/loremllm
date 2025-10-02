import * as React from "react";

import { cn } from "./utils";

const Indent = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="indent"
      className={cn("block pl-[1ch]", className)}
      {...props}
    />
  );
};

export { Indent };
