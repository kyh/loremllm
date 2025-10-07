import type { UIMessage } from "ai";
import type { ComponentProps, HTMLAttributes } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { cn } from "../utils";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({
  className,
  from,
  children,
  ...props
}: MessageProps) =>
  from === "user" ? (
    <div
      className={cn("flex items-start justify-between", className)}
      {...props}
    >
      <div className="w-full min-w-[10%] text-right">
        <div className="inline-block bg-[var(--theme-focused-foreground)] px-[1ch] py-[calc(8px*var(--theme-line-height-base))]">
          {children}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-end self-stretch">
        <figure className="mb-[calc((var(--font-size)*var(--theme-line-height-base))/2)] inline-block h-0 w-0 border-t-[calc((var(--font-size)*var(--theme-line-height-base))/2)] border-b-[calc((var(--font-size)*var(--theme-line-height-base))/2)] border-l-[1ch] border-t-transparent border-b-transparent border-l-[var(--theme-focused-foreground)]" />
      </div>
    </div>
  ) : (
    <div
      className={cn("flex items-start justify-between last:mb-0", className)}
      {...props}
    >
      <div className="relative flex flex-shrink-0 items-end self-stretch">
        <figure className="mb-[calc((var(--font-size)*var(--theme-line-height-base))/2)] inline-block h-0 w-0 border-t-[calc((var(--font-size)*var(--theme-line-height-base))/2)] border-r-[1ch] border-b-[calc((var(--font-size)*var(--theme-line-height-base))/2)] border-t-transparent border-r-[var(--theme-border)] border-b-transparent" />
      </div>
      <div className="w-full min-w-[10%] text-left">
        <div className="inline-block bg-[var(--theme-border)] px-[1ch] py-[calc(8px*var(--theme-line-height-base))] shadow-[1ch_1ch_0_0_var(--theme-border-subdued)]">
          {children}
        </div>
      </div>
    </div>
  );

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn("ring-border size-8 ring-1", className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || "ME"}</AvatarFallback>
  </Avatar>
);
