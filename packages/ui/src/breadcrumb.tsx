import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "./utils";

const Breadcrumb = ({ ...props }: React.ComponentProps<"nav">) => {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
};

const BreadcrumbList = ({
  className,
  ...props
}: React.ComponentProps<"ol">) => {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn("inline-block", className)}
      {...props}
    />
  );
};

const BreadcrumbItem = ({
  className,
  ...props
}: React.ComponentProps<"li">) => {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn(
        "inline-block leading-[calc(var(--theme-line-height-base)*1rem)]",
        className,
      )}
      {...props}
    />
  );
};

const BreadcrumbLink = ({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
}) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        "inline-block border-0 bg-[var(--theme-border)] text-[var(--theme-text)] no-underline outline-0 transition-all duration-200 ease-in-out visited:text-[var(--theme-text)] hover:bg-[var(--theme-focused-foreground)] hover:text-[var(--theme-text)] focus:bg-[var(--theme-focused-foreground)]",
        className,
      )}
      {...props}
    />
  );
};

const BreadcrumbPage = ({
  className,
  ...props
}: React.ComponentProps<"span">) => {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-[var(--theme-text)]", className)}
      {...props}
    />
  );
};

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("mx-[1ch] inline-block min-w-[1ch]", className)}
      {...props}
    >
      {children ?? " ❯ "}
    </li>
  );
};

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("inline-block min-w-[3ch]", className)}
      {...props}
    >
      …<span className="sr-only">More</span>
    </span>
  );
};

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
