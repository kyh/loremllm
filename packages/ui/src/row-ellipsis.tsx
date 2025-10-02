"use client";

import * as React from "react";

type RowEllipsisProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

const RowEllipsis = ({ children, ...rest }: RowEllipsisProps) => {
  return (
    <section
      className="block overflow-hidden border-0 text-ellipsis whitespace-nowrap outline-0 transition-[background] duration-200 ease-in-out focus:bg-[var(--theme-focused-foreground)]"
      {...rest}
    >
      {children}
    </section>
  );
};

RowEllipsis.displayName = "RowEllipsis";

export { RowEllipsis };
