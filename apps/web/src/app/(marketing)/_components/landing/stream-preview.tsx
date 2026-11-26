"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

import { heroStream } from "./landing-data";

const lastAt = heroStream.at(-1)?.at ?? 0;
const loopMs = lastAt + 3000;
const tickMs = 60;

export const StreamPreview = ({ className }: { className?: string }) => {
  const [elapsed, setElapsed] = useState(loopMs);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timer = still
      ? null
      : window.setInterval(() => {
          setElapsed((value) => (value + tickMs) % loopMs);
        }, tickMs);

    return () => {
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "bg-background flex flex-col gap-3 overflow-hidden p-6 font-mono text-xs",
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center justify-between gap-4">
        <span>stream</span>
        <span className="tabular-nums">{`${Math.min(elapsed, lastAt)} ms`}</span>
      </div>
      <ol className="flex flex-col gap-2">
        {heroStream.map((event) => {
          const shown = elapsed >= event.at;

          return (
            <li
              key={`${event.at}-${event.kind}`}
              className={cn(
                "grid grid-cols-[5.5rem_1fr] gap-3 transition-opacity duration-300",
                shown ? "opacity-100" : "opacity-0",
              )}
            >
              <span className="text-muted-foreground">{event.kind}</span>
              <span className="text-foreground break-words">{event.body}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
