"use client";

import * as React from "react";

import { cn } from "./utils";

const SEQUENCES = [
  ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
  ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  ["▖", "▘", "▝", "▗"],
  ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▁"],
  ["▉", "▊", "▋", "▌", "▍", "▎", "▏", "▎", "▍", "▌", "▋", "▊", "▉"],
  ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
  ["┤", "┘", "┴", "└", "├", "┌", "┬", "┐"],
  ["◢", "◣", "◤", "◥"],
  ["◰", "◳", "◲", "◱"],
  ["◴", "◷", "◶", "◵"],
  ["◐", "◓", "◑", "◒"],
  ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
];

type BlockLoaderProps = {
  mode?: number;
} & Omit<React.ComponentProps<"span">, "children">;

const BlockLoader = ({ className, mode = 0, ...props }: BlockLoaderProps) => {
  const [index, setIndex] = React.useState(0);
  const intervalRef = React.useRef<number | null>(null);

  const sequence = SEQUENCES[mode] || ["�"];
  const indexLength = sequence.length;

  React.useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % indexLength);
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [indexLength]);

  return (
    <span
      data-slot="block-loader"
      className={cn(
        "inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] w-[1ch] align-bottom text-inherit",
        className,
      )}
      {...props}
    >
      {sequence[index]}
    </span>
  );
};

export { BlockLoader };
