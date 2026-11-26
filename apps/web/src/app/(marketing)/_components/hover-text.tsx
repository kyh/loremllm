"use client";

import { noop } from "@tanstack/react-query";
import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "cn";
import { Slot } from "radix-ui";

import { TextAnimator } from "./text-animator";

type HoverTextVariant = "cursor-square" | "bg";

export interface HoverTextHandle {
  animate: () => void;
  animateBack: () => void;
}

type HoverTextProps = {
  children: React.ReactNode;
  asChild?: boolean;
  ref?: React.Ref<HoverTextHandle>;
} & React.HTMLAttributes<HTMLSpanElement>;

const HoverText = ({
  children,
  className,
  asChild = false,
  onMouseEnter,
  onMouseLeave,
  ref,
  ...props
}: HoverTextProps) => {
  const { theme } = useTheme();
  const effectiveVariant: HoverTextVariant = theme === "dark" ? "bg" : "cursor-square";
  const internalRef = React.useRef<HTMLElement>(null);
  const animatorRef = React.useRef<TextAnimator | null>(null);

  React.useImperativeHandle(
    ref,
    () => ({
      animate: () => {
        animatorRef.current?.animate();
      },
      animateBack: () => {
        animatorRef.current?.animateBack();
      },
    }),
    [],
  );

  const setRef = React.useCallback((el: HTMLElement | null) => {
    internalRef.current = el;
  }, []);

  React.useEffect(() => {
    const element = internalRef.current;

    if (!element || animatorRef.current) {
      return noop;
    }

    const rafId = requestAnimationFrame(() => {
      const currentElement = internalRef.current;

      if (!currentElement || animatorRef.current) {
        return;
      }

      animatorRef.current = new TextAnimator(currentElement, effectiveVariant);
    });

    return () => {
      cancelAnimationFrame(rafId);
      animatorRef.current?.reset();
      animatorRef.current = null;
    };
  }, [effectiveVariant]);

  const handleMouseEnter = React.useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      animatorRef.current?.animate();
      onMouseEnter?.(e);
    },
    [onMouseEnter],
  );

  const handleMouseLeave = React.useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      animatorRef.current?.animateBack();
      onMouseLeave?.(e);
    },
    [onMouseLeave],
  );

  const baseClassName = cn(
    "hover-effect",
    "relative whitespace-nowrap [font-kerning:none]",
    effectiveVariant === "cursor-square" && "hover-effect--cursor-square",
    effectiveVariant === "bg" && "hover-effect--bg",
    className,
  );

  if (asChild) {
    return (
      <Slot.Root
        ref={setRef}
        className={baseClassName}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </Slot.Root>
    );
  }

  return (
    <span
      ref={setRef}
      className={baseClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </span>
  );
};

export { HoverText, type HoverTextProps, type HoverTextVariant };
