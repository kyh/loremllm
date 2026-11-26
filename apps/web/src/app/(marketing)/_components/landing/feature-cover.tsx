import { cn } from "cn";

import type { CoverMotif } from "./landing-data";

const Motif = ({ motif }: { motif: CoverMotif }) => {
  switch (motif) {
    case "stack": {
      return [30, 40, 50, 60, 70].map((y, index) => (
        <path
          key={y}
          d={`M26 ${y} H${index % 2 === 0 ? 74 : 60}`}
          vectorEffect="non-scaling-stroke"
        />
      ));
    }

    case "wave": {
      return [36, 46, 56, 66].map((y) => (
        <path
          key={y}
          d={`M22 ${y} Q36 ${y - 10} 50 ${y} T78 ${y}`}
          vectorEffect="non-scaling-stroke"
        />
      ));
    }

    case "branch": {
      return (
        <>
          <circle cx="30" cy="50" r="6" vectorEffect="non-scaling-stroke" />
          <path d="M36 50 C50 50 52 32 64 32" vectorEffect="non-scaling-stroke" />
          <path d="M36 50 C50 50 52 68 64 68" vectorEffect="non-scaling-stroke" />
          <circle cx="70" cy="32" r="6" vectorEffect="non-scaling-stroke" />
          <circle cx="70" cy="68" r="6" fill="currentColor" vectorEffect="non-scaling-stroke" />
        </>
      );
    }

    case "loop": {
      return [24, 18, 12, 6].map((radius) => (
        <circle key={radius} cx="50" cy="50" r={radius} vectorEffect="non-scaling-stroke" />
      ));
    }

    case "grid": {
      return [0, 1, 2, 3].flatMap((row) =>
        [0, 1, 2, 3].map((column) => (
          <rect
            key={`${row}-${column}`}
            x={27 + column * 12}
            y={27 + row * 12}
            width="10"
            height="10"
            fill={row === 2 && column === 1 ? "currentColor" : "none"}
            vectorEffect="non-scaling-stroke"
          />
        )),
      );
    }

    case "split": {
      return (
        <>
          <rect x="26" y="30" width="20" height="40" vectorEffect="non-scaling-stroke" />
          <rect x="54" y="30" width="20" height="40" vectorEffect="non-scaling-stroke" />
          <path d="M46 50 H54" vectorEffect="non-scaling-stroke" />
        </>
      );
    }

    default: {
      return null;
    }
  }
};

export const FeatureCover = ({ motif, className }: { motif: CoverMotif; className?: string }) => (
  <div
    aria-hidden="true"
    className={cn("text-foreground relative aspect-square w-full overflow-hidden", className)}
  >
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <Motif motif={motif} />
    </svg>
  </div>
);
