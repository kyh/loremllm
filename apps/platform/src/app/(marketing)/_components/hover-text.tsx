"use client";

import * as React from "react";
import { useTheme } from "@repo/ui/theme";
import { cn } from "@repo/ui/utils";
import { Slot } from "radix-ui";

import { TextAnimator } from "./text-animator";

type HoverTextVariant = "cursor-square" | "bg";

export type HoverTextHandle = {
  animate: () => void;
  animateBack: () => void;
};

type HoverTextProps = {
  children: React.ReactNode;
  asChild?: boolean; // Merge props with child element instead of wrapping
} & React.HTMLAttributes<HTMLSpanElement>;

const HoverText = React.forwardRef<HoverTextHandle, HoverTextProps>(
  (
    {
      children,
      className,
      asChild = false,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref,
  ) => {
    const { theme } = useTheme();
    // Light theme = cursor-square (V1), Dark theme = bg (V2)
    const effectiveVariant: HoverTextVariant =
      theme === "dark" ? "bg" : "cursor-square";
    const internalRef = React.useRef<HTMLSpanElement>(null);
    const animatorRef = React.useRef<TextAnimator | null>(null);

    // Expose animate methods via imperative handle
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

    // Set internal ref when element is available
    const setRef = React.useCallback((el: HTMLElement | null) => {
      internalRef.current = el as HTMLSpanElement | null;
    }, []);

    // Initialize TextAnimator when component mounts and element is available
    React.useEffect(() => {
      const element = internalRef.current;
      if (!element || animatorRef.current) return;

      // Use requestAnimationFrame to ensure DOM is fully ready (especially for Slot)
      const rafId = requestAnimationFrame(() => {
        const currentElement = internalRef.current;
        if (!currentElement || animatorRef.current) return;

        animatorRef.current = new TextAnimator(
          currentElement,
          effectiveVariant,
        );
      });

      return () => {
        cancelAnimationFrame(rafId);
        animatorRef.current?.reset();
        animatorRef.current = null;
      };
    }, [effectiveVariant]);

    // Handle mouse events
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
  },
);

HoverText.displayName = "HoverText";

export { HoverText, type HoverTextProps, type HoverTextVariant };
