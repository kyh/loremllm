import * as React from "react";

import { cn } from "./utils";

type CardDoubleProps = {
  title?: React.ReactNode;
  mode?: "left" | "right";
} & React.ComponentProps<"article">;

const actionClasses = "flex items-end justify-between";

const leftClasses =
  "min-w-[10%] w-full border-t-[6px] border-l-[6px] border-[var(--theme-text)] [border-top-style:double] [border-left-style:double] pt-[calc(6px*var(--theme-line-height-base))] pr-[2ch] pl-[1ch]";

const leftCornerClasses =
  "flex-shrink-0 border-t-[6px] border-l-[6px] border-[var(--theme-text)] [border-top-style:double] [border-left-style:double] pt-[calc(6px*var(--theme-line-height-base))] pr-[calc(1ch-6px)] pl-[1ch]";

const rightClasses =
  "min-w-[10%] w-full border-t-[6px] border-r-[6px] border-[var(--theme-text)] [border-top-style:double] [border-right-style:double] pt-[calc(6px*var(--theme-line-height-base))] pr-[2ch] pl-[1ch]";

const rightCornerClasses =
  "flex-shrink-0 border-t-[6px] border-r-[6px] border-[var(--theme-text)] [border-top-style:double] [border-right-style:double] pt-[calc(6px*var(--theme-line-height-base))] pr-[1ch] pl-[calc(1ch-6px)]";

const titleClasses =
  "flex-shrink-0 px-[1ch] text-[var(--font-size)] font-normal";

const CardDouble = ({
  className,
  title,
  mode,
  children,
  style,
  ...props
}: CardDoubleProps) => {
  let titleElement = (
    <header className={actionClasses}>
      <div className={leftClasses} aria-hidden="true"></div>
      <h2 className={titleClasses}>{title}</h2>
      <div className={rightClasses} aria-hidden="true"></div>
    </header>
  );

  if (mode === "left") {
    titleElement = (
      <header className={actionClasses}>
        <div className={leftCornerClasses} aria-hidden="true"></div>
        <h2 className={titleClasses}>{title}</h2>
        <div className={rightClasses} aria-hidden="true"></div>
      </header>
    );
  }

  if (mode === "right") {
    titleElement = (
      <header className={actionClasses}>
        <div className={leftClasses} aria-hidden="true"></div>
        <h2 className={titleClasses}>{title}</h2>
        <div className={rightCornerClasses} aria-hidden="true"></div>
      </header>
    );
  }

  return (
    <article
      data-slot="card-double"
      className={cn("relative block p-0", className)}
      {...props}
    >
      {titleElement}
      <section className="scrollbar-none block overflow-x-auto overflow-y-hidden border-r-[6px] border-b-[6px] border-l-[6px] [border-right-style:double] [border-bottom-style:double] [border-left-style:double] border-[var(--theme-text)] pt-[calc(var(--theme-line-height-base)*0.5rem)] pr-[calc(2ch-6px)] pb-[calc(var(--theme-line-height-base)*1rem-6px)] pl-[calc(2ch-6px)]">
        <section style={style}>{children}</section>
      </section>
    </article>
  );
};

export { CardDouble };
