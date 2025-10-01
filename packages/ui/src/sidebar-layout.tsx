'use client';

import * as React from 'react';

interface SidebarLayoutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  children?: React.ReactNode;
  sidebar?: React.ReactNode;
  defaultSidebarWidth?: number;
  isShowingHandle?: boolean;
  isReversed?: boolean;
}

const LINE_HEIGHT = 20;
const CHARACTER_WIDTH = 9.6;

const SidebarLayout: React.FC<SidebarLayoutProps> = ({ defaultSidebarWidth = 20, children, sidebar, isShowingHandle = false, isReversed = false, ...rest }) => {
  const [sidebarWidth, setSidebarWidth] = React.useState(defaultSidebarWidth);
  const handleRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const increment = Math.round(deltaX / CHARACTER_WIDTH);
      setSidebarWidth(Math.max(CHARACTER_WIDTH, startWidth + increment));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (isReversed) {
    return (
      <div className="flex items-start justify-between whitespace-pre-wrap" {...rest}>
        <div className="min-w-[10%] w-full">{children}</div>
        &nbsp;
        <div
          className="self-stretch flex-shrink-0 w-[20ch] flex flex-col gap-2"
          style={{
            width: `${sidebarWidth}ch`,
          }}
        >
          {sidebar}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between whitespace-pre-wrap" {...rest}>
      <div
        className="self-stretch flex-shrink-0 w-[20ch] flex flex-col gap-2"
        style={{
          width: `${sidebarWidth}ch`,
        }}
      >
        {sidebar}
      </div>
      {isShowingHandle ? (
        <div className="self-stretch flex-shrink-0 flex items-center justify-center w-[3ch] outline-0 border-0 cursor-col-resize hover:[&_.line]:bg-[var(--theme-focused-foreground)] focus:outline-0 focus:border-0 focus:[&_.line]:bg-[var(--theme-focused-foreground)]" ref={handleRef} role="button" tabIndex={0} onMouseDown={handleMouseDown} style={isShowingHandle ? {} : { width: `0.5ch` }}>
          <>
            <div className="self-stretch w-[2px] bg-[var(--theme-text)] first:ml-[1px] first:mr-[2px]" />
            <div className="self-stretch w-[2px] bg-[var(--theme-text)] first:ml-[1px] first:mr-[2px]" />
          </>
        </div>
      ) : null}
      <div className="min-w-[10%] w-full">{children}</div>
    </div>
  );
};

export { SidebarLayout };
