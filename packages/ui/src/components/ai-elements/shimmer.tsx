"use client";

import { cn } from "@repo/ui/lib/utils";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { type CSSProperties, type ElementType, memo, useMemo } from "react";

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

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
          repeat: Number.POSITIVE_INFINITY,
          duration,
          ease: "linear",
        }}
      >
        {children}
      </MotionComponent>
    </LazyMotion>
  );
};

export const Shimmer = memo(ShimmerComponent);
