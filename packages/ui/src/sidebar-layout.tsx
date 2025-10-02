"use client";

import * as React from "react";

interface SidebarLayoutProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  children?: React.ReactNode;
  sidebar?: React.ReactNode;
  defaultSidebarWidth?: number;
  isShowingHandle?: boolean;
  isReversed?: boolean;
}

const LINE_HEIGHT = 20;
const CHARACTER_WIDTH = 9.6;

const SidebarLayout = ({
  defaultSidebarWidth = 20,
  children,
  sidebar,
  isShowingHandle = false,
  isReversed = false,
  ...rest
}: SidebarLayoutProps) => {
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
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  if (isReversed) {
    return (
      <div
        className="flex items-start justify-between whitespace-pre-wrap"
        {...rest}
      >
        <div className="w-full min-w-[10%]">{children}</div>
        &nbsp;
        <div
          className="flex w-[20ch] flex-shrink-0 flex-col gap-2 self-stretch"
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
    <div
      className="flex items-start justify-between whitespace-pre-wrap"
      {...rest}
    >
      <div
        className="flex w-[20ch] flex-shrink-0 flex-col gap-2 self-stretch"
        style={{
          width: `${sidebarWidth}ch`,
        }}
      >
        {sidebar}
      </div>
      {isShowingHandle ? (
        <div
          className="flex w-[3ch] flex-shrink-0 cursor-col-resize items-center justify-center self-stretch border-0 outline-0 focus:border-0 focus:outline-0 hover:[&_.line]:bg-[var(--theme-focused-foreground)] focus:[&_.line]:bg-[var(--theme-focused-foreground)]"
          ref={handleRef}
          role="button"
          tabIndex={0}
          onMouseDown={handleMouseDown}
          style={isShowingHandle ? {} : { width: `0.5ch` }}
        >
          <>
            <div className="w-[2px] self-stretch bg-[var(--theme-text)] first:mr-[2px] first:ml-[1px]" />
            <div className="w-[2px] self-stretch bg-[var(--theme-text)] first:mr-[2px] first:ml-[1px]" />
          </>
        </div>
      ) : null}
      <div className="w-full min-w-[10%]">{children}</div>
    </div>
  );
};

export { SidebarLayout };
