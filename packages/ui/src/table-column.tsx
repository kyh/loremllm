'use client';

import * as React from 'react';

type TableColumnProps = React.HTMLAttributes<HTMLTableCellElement> & {
  children?: React.ReactNode;
};

const TableColumn: React.FC<TableColumnProps> = ({ children, ...rest }) => {
  return (
    <td className="border-0 outline-0 m-0 p-0 transition-[background-color] duration-500 ease-in-out pl-[1ch] text-[var(--font-size)] flex-shrink-0 text-[100%] first:pl-0" {...rest}>
      {children}
    </td>
  );
};

TableColumn.displayName = 'TableColumn';

export { TableColumn };
