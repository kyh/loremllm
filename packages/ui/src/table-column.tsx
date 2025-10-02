"use client";

import * as React from "react";

type TableColumnProps = React.HTMLAttributes<HTMLTableCellElement> & {
  children?: React.ReactNode;
};

const TableColumn = ({ children, ...rest }: TableColumnProps) => {
  return (
    <td
      className="m-0 flex-shrink-0 border-0 p-0 pl-[1ch] text-[100%] text-[var(--font-size)] outline-0 transition-[background-color] duration-500 ease-in-out first:pl-0"
      {...rest}
    >
      {children}
    </td>
  );
};

TableColumn.displayName = "TableColumn";

export { TableColumn };
