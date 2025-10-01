'use client';

import * as React from 'react';

type RowEllipsisProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

const RowEllipsis = React.forwardRef<HTMLElement, RowEllipsisProps>(({ children, ...rest }, ref) => {
  return (
    <section className="block outline-0 border-0 transition-[background] duration-200 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis focus:bg-[var(--theme-focused-foreground)]" ref={ref} {...rest}>
      {children}
    </section>
  );
});

RowEllipsis.displayName = 'RowEllipsis';

export { RowEllipsis };
