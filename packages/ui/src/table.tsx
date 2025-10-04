"use client";

import * as React from "react";

import { cn } from "./utils";

const Table = ({ className, ...props }: React.ComponentProps<"table">) => {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn(
          "relative m-0 w-full border-spacing-0 border-0 p-0 text-[100%] outline-0",
          className,
        )}
        {...props}
      />
    </div>
  );
};

const TableHeader = ({
  className,
  ...props
}: React.ComponentProps<"thead">) => {
  return (
    <thead data-slot="table-header" className={cn("", className)} {...props} />
  );
};

const TableBody = ({ className, ...props }: React.ComponentProps<"tbody">) => {
  return (
    <tbody data-slot="table-body" className={cn("", className)} {...props} />
  );
};

const TableFooter = ({
  className,
  ...props
}: React.ComponentProps<"tfoot">) => {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-theme-border font-normal uppercase",
        className,
      )}
      {...props}
    />
  );
};

const TableRow = ({ className, ...props }: React.ComponentProps<"tr">) => {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "transition-all duration-200 ease-in-out hover:bg-theme-focused-foreground",
        className,
      )}
      {...props}
    />
  );
};

const TableHead = ({ className, ...props }: React.ComponentProps<"th">) => {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "bg-theme-border px-[1ch] py-[calc(var(--font-size)*0.5*var(--theme-line-height-base))] text-left align-middle font-normal whitespace-nowrap text-theme-text uppercase",
        className,
      )}
      {...props}
    />
  );
};

const TableCell = ({ className, ...props }: React.ComponentProps<"td">) => {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-[1ch] py-[calc(var(--font-size)*0.5*var(--theme-line-height-base))] align-middle whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
};

const TableCaption = ({
  className,
  ...props
}: React.ComponentProps<"caption">) => {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-[var(--theme-overlay)]", className)}
      {...props}
    />
  );
};

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
