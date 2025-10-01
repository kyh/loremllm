"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";

import { cn } from "./utils";

const Accordion = ({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) => {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
};

const AccordionItem = ({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) => {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-0", className)}
      {...props}
    />
  );
};

const AccordionTrigger = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) => {
  return (
    <AccordionPrimitive.Header className="flex items-center justify-between transition-all duration-200 ease-in-out hover:bg-[var(--theme-focused-foreground)]">
      <span className="flex-shrink-0 cursor-pointer px-[1ch] select-none">
        ▸
      </span>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 cursor-pointer items-center justify-between text-left font-normal transition-all outline-none select-none focus:bg-[var(--theme-focused-foreground)] [&[data-state=open]~span]:content-['▾']",
          className,
        )}
        {...props}
      >
        <span className="w-full min-w-[10%] cursor-pointer pl-0 select-none data-[state=open]:pl-[1ch]">
          {children}
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};

const AccordionContent = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) => {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden transition-all"
      {...props}
    >
      <div className={cn("pl-[1ch]", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
