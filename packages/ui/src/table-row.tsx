'use client';

import * as React from 'react';

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  children?: React.ReactNode;
};

const TableRow: React.FC<TableRowProps> = ({ children, ...rest }) => {
  return (
    <tr className="border-0 outline-0 m-0 p-0 transition-transform duration-500 ease-in-out border-spacing-0 text-[100%] focus:bg-[var(--theme-focused-foreground)] focus:outline-0" tabIndex={0} {...rest}>
      {children}
    </tr>
  );
};

TableRow.displayName = 'TableRow';

export { TableRow };
