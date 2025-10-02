import * as React from "react";

import { cn } from "./utils";

const Card = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="card"
      className={cn("relative block p-0 whitespace-pre-wrap", className)}
      {...props}
    />
  );
};

const CardHeader = ({
  className,
  mode,
  ...props
}: React.ComponentProps<"div"> & { mode?: "left" | "right" | "center" }) => {
  const actionClasses = "flex items-end justify-between";
  const leftClasses =
    mode === "left"
      ? "flex-shrink-0 shadow-[inset_2px_0_0_0_var(--theme-text),inset_0_2px_0_0_var(--theme-text)] pt-[calc((var(--font-size)*0.5)*var(--theme-line-height-base))] px-[1ch]"
      : "min-w-[10%] w-full shadow-[inset_2px_0_0_0_var(--theme-text),inset_0_2px_0_0_var(--theme-text)] pt-[calc((var(--font-size)*0.5)*var(--theme-line-height-base))] pr-[2ch] pl-[1ch]";
  const rightClasses =
    mode === "right"
      ? "flex-shrink-0 shadow-[inset_-2px_0_0_0_var(--theme-text),inset_0_2px_0_0_var(--theme-text)] pt-[calc((var(--font-size)*0.5)*var(--theme-line-height-base))] px-[1ch]"
      : "min-w-[10%] w-full shadow-[inset_-2px_0_0_0_var(--theme-text),inset_0_2px_0_0_var(--theme-text)] pt-[calc((var(--font-size)*0.5)*var(--theme-line-height-base))] pr-[2ch] pl-[1ch]";

  return (
    <div
      data-slot="card-header"
      className={cn(actionClasses, className)}
      {...props}
    >
      <div className={leftClasses} aria-hidden="true"></div>
      <div className="flex-shrink-0 px-[1ch] font-normal text-[var(--font-size)]">
        {props.children}
      </div>
      <div className={rightClasses} aria-hidden="true"></div>
    </div>
  );
};

const CardTitle = ({ className, ...props }: React.ComponentProps<"h2">) => {
  return (
    <h2
      data-slot="card-title"
      className={cn(
        "flex-shrink-0 px-[1ch] font-normal text-[var(--font-size)]",
        className,
      )}
      {...props}
    />
  );
};

const CardDescription = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-[var(--theme-text)]", className)}
      {...props}
    />
  );
};

const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "scrollbar-none block overflow-x-auto overflow-y-hidden px-[2ch] pt-[calc(var(--theme-line-height-base)*0.5rem)] pb-[calc(var(--theme-line-height-base)*1rem)] shadow-[inset_2px_0_0_0_var(--theme-text),inset_-2px_0_0_0_var(--theme-text),inset_0_-2px_0_0_var(--theme-text)]",
        className,
      )}
      {...props}
    />
  );
};

const CardFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-[2ch] pb-[calc(var(--theme-line-height-base)*0.5rem)]",
        className,
      )}
      {...props}
    />
  );
};

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
