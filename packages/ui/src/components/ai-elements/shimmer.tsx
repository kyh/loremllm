"use client";

import { cn } from "cn";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { memo, useMemo } from "react";
import type { CSSProperties } from "react";

const MOTION_TEXT_ELEMENTS = {
  div: m.div,
  h1: m.h1,
  h2: m.h2,
  h3: m.h3,
  h4: m.h4,
  h5: m.h5,
  h6: m.h6,
  p: m.p,
  span: m.span,
};

export interface TextShimmerProps {
  children: string;
  as?: keyof typeof MOTION_TEXT_ELEMENTS;
  className?: string;
  duration?: number;
  spread?: number;
}

type ShimmerStyle = CSSProperties & {
  "--spread": string;
};

const ShimmerComponent = ({
  children,
  as = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = MOTION_TEXT_ELEMENTS[as];

  const dynamicSpread = useMemo(() => (children?.length ?? 0) * spread, [children, spread]);

  const style: ShimmerStyle = {
    "--spread": `${dynamicSpread}px`,
    backgroundImage:
      "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionComponent
        animate={shouldReduceMotion === true ? undefined : { backgroundPosition: "0% center" }}
        className={cn(
          "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
          "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
          className,
        )}
        initial={shouldReduceMotion === true ? false : { backgroundPosition: "100% center" }}
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
};

export const Shimmer = memo(ShimmerComponent);
