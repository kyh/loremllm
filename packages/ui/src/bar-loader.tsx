"use client";

import * as React from "react";

import { cn } from "./utils";

interface BarLoaderProps extends React.ComponentProps<"div"> {
  intervalRate?: number;
  progress?: number;
}

function BarLoader({
  className,
  intervalRate,
  progress,
  ...props
}: BarLoaderProps) {
  const [currentProgress, setCurrentProgress] = React.useState<number>(
    progress || 0,
  );

  React.useEffect(() => {
    if (progress !== undefined) {
      setCurrentProgress(progress);
      return;
    }

    if (!intervalRate) return;

    const interval = setInterval(() => {
      setCurrentProgress((prev) => (prev + 10) % 110);
    }, intervalRate);

    return () => clearInterval(interval);
  }, [intervalRate, progress]);

  return (
    <div
      data-slot="bar-loader"
      className={cn(
        "block h-[calc(var(--font-size)*var(--theme-line-height-base))] bg-[var(--theme-border)] text-left align-bottom whitespace-nowrap",
        className,
      )}
      {...props}
    >
      <div
        className="h-full w-0 bg-gradient-to-r from-transparent to-[var(--theme-text)] transition-[width] duration-100 ease-linear"
        style={{
          width: `${Math.min(currentProgress, 100)}%`,
        }}
      ></div>
    </div>
  );
}

export { BarLoader };
