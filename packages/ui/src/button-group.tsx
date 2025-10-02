"use client";

import * as React from "react";

import { cn } from "./utils";

type ButtonGroupProps = {
  children?: React.ReactNode;
  isFull?: boolean;
} & React.ComponentProps<"div">;

const ButtonGroup = ({
  className,
  children,
  isFull,
  ...props
}: ButtonGroupProps) => {
  return (
    <div
      data-slot="button-group"
      className={cn(
        "",
        isFull &&
          "grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] whitespace-nowrap [&>*>*]:w-full",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { ButtonGroup };
