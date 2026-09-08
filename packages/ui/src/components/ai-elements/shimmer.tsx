"use client";

import { cn } from "cn";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { memo, useMemo } from "react";
import type { CSSProperties, ElementType } from "react";

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

type ShimmerStyle = CSSProperties & {
  "--spread": string;
};

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = useMemo(() => m.create(Component), [Component]);

  const dynamicSpread = useMemo(() => (children?.length ?? 0) * spread, [children, spread]);
  const style: ShimmerStyle = {
    "--spread": `${dynamicSpread}px`,
    backgroundImage:
      "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
  };

  /* oxlint-disable react/static-components -- built from the `as` prop, memoized on it */
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionComponent
        animate={shouldReduceMotion ? undefined : { backgroundPosition: "0% center" }}
        className={cn(
          "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
          "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
          className,
        )}
        initial={shouldReduceMotion ? false : { backgroundPosition: "100% center" }}
        style={style}
        transition={{
          duration,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {children}
      </MotionComponent>
    </LazyMotion>
  );
  /* oxlint-enable react/static-components */
};

export const Shimmer = memo(ShimmerComponent);
