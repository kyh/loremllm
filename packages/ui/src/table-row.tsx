"use client";

import * as React from "react";

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  children?: React.ReactNode;
};

const TableRow = ({ children, ...rest }: TableRowProps) => {
  return (
    <tr
      className="m-0 border-spacing-0 border-0 p-0 text-[100%] outline-0 transition-transform duration-500 ease-in-out focus:bg-[var(--theme-focused-foreground)] focus:outline-0"
      tabIndex={0}
      {...rest}
    >
      {children}
    </tr>
  );
};

TableRow.displayName = "TableRow";

export { TableRow };
