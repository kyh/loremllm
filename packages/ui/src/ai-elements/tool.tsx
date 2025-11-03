"use client";

import type { ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";

import { Badge } from "../badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import { cn } from "../utils";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-4 w-full border border-[var(--theme-border)] bg-[var(--theme-border)] shadow-[1ch_1ch_0_0_var(--theme-border-subdued)]",
      className,
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "output-available": "Completed",
    "output-error": "Error",
  } as const;

  const icons = {
    "input-streaming": (
      <CircleIcon className="size-4 text-[var(--theme-text)]" />
    ),
    "input-available": (
      <ClockIcon className="size-4 animate-pulse text-[var(--theme-text)]" />
    ),
    "output-available": (
      <CheckCircleIcon className="size-4 text-[var(--theme-text)]" />
    ),
    "output-error": <XCircleIcon className="size-4 text-[var(--theme-text)]" />,
  } as const;

  return (
    <Badge className="gap-1.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-focused-foreground)] text-xs text-[var(--theme-text)]">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full items-center justify-between gap-4 px-[1ch] py-[calc(var(--theme-line-height-base)*0.5rem)] transition-colors hover:bg-[var(--theme-focused-foreground)]",
      className,
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-4 text-[var(--theme-text)]" />
      <span className="text-sm font-medium text-[var(--theme-text)]">
        {title ?? type.split("-").slice(1).join("-")}
      </span>
      {getStatusBadge(state)}
    </div>
    <ChevronDownIcon className="size-4 text-[var(--theme-text)] transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=open]:animate-in text-[var(--theme-text)] outline-none",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div
    className={cn(
      "space-y-2 overflow-hidden px-[1ch] py-[calc(var(--theme-line-height-base)*0.5rem)]",
      className,
    )}
    {...props}
  >
    <h4 className="text-xs font-medium tracking-wide text-[var(--theme-text)] uppercase opacity-70">
      Parameters
    </h4>
    <div className="bg-[var(--theme-focused-foreground)] shadow-[inset_2px_0_0_0_var(--theme-text),inset_-2px_0_0_0_var(--theme-text),inset_0_2px_0_0_var(--theme-text),inset_0_-2px_0_0_var(--theme-text)]">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object") {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div
      className={cn(
        "space-y-2 px-[1ch] py-[calc(var(--theme-line-height-base)*0.5rem)]",
        className,
      )}
      {...props}
    >
      <h4 className="text-xs font-medium tracking-wide text-[var(--theme-text)] uppercase opacity-70">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto text-xs [&_table]:w-full",
          errorText
            ? "bg-[var(--theme-focused-foreground)] text-[var(--theme-text)] opacity-80 shadow-[inset_2px_0_0_0_var(--theme-text),inset_-2px_0_0_0_var(--theme-text),inset_0_2px_0_0_var(--theme-text),inset_0_-2px_0_0_var(--theme-text)]"
            : "bg-[var(--theme-focused-foreground)] text-[var(--theme-text)] shadow-[inset_2px_0_0_0_var(--theme-text),inset_-2px_0_0_0_var(--theme-text),inset_0_2px_0_0_var(--theme-text),inset_0_-2px_0_0_var(--theme-text)]",
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
