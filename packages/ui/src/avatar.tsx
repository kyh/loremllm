"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "./utils";

const Avatar = ({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) => {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative inline-block h-[calc(var(--font-size)*var(--theme-line-height-base)*2)] w-[4ch] flex-shrink-0 bg-[var(--theme-border)] bg-cover bg-center bg-no-repeat align-bottom hover:before:pointer-events-none hover:before:absolute hover:before:top-0 hover:before:right-0 hover:before:bottom-0 hover:before:left-0 hover:before:bg-[var(--theme-focused-foreground)] hover:before:opacity-50 hover:before:content-['']",
        className,
      )}
      {...props}
    />
  );
};

const AvatarImage = ({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) => {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("h-full w-full object-cover", className)}
      {...props}
    />
  );
};

const AvatarFallback = ({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center bg-[var(--theme-border)]",
        className,
      )}
      {...props}
    />
  );
};

export { Avatar, AvatarImage, AvatarFallback };
