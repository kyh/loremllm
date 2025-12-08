"use client";

import * as React from "react";
import { DialogClose, DialogPortal, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/utils";
import { AnimatePresence, motion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";

type DraggableDialogContentProps = {
  className?: string;
  children: React.ReactNode;
  title?: string;
  titleEndContent?: React.ReactNode;
  isOpen: boolean;
} & React.ComponentProps<typeof DialogPrimitive.Content>;

export const DraggableDialogContent = ({
  className,
  children,
  title,
  titleEndContent = null,
  isOpen,
  ...props
}: DraggableDialogContentProps) => {
  const constraintsRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <DialogPortal forceMount>
      <AnimatePresence>
        {isOpen && (
          <div
            ref={constraintsRef}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0}
              dragConstraints={constraintsRef}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              className={cn(
                "bg-background relative z-50 grid w-full max-w-[calc(100%-2rem)] gap-0 rounded-lg border shadow-lg sm:max-w-2xl",
                className,
              )}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.2,
                ease: [0.215, 0.61, 0.355, 1],
              }}
            >
              <DialogTitle className="sr-only">{title}</DialogTitle>
              <DialogPrimitive.Content
                data-slot="dialog-content"
                className="relative"
                {...props}
              >
                {/* Window Title Bar - Draggable Handle */}
                <div
                  className={cn(
                    "bg-muted/30 grid grid-cols-[1fr_auto_1fr] items-center rounded-t-lg border-b px-4 py-2.5 select-none",
                    isDragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                >
                  <div className="flex gap-1.5 justify-self-start">
                    <DialogClose
                      data-slot="dialog-close"
                      className="size-3 cursor-pointer rounded-full bg-[#ff5f57] transition-colors hover:bg-[#ff3f37]"
                      aria-label="Close"
                    />
                    <div className="size-3 rounded-full bg-[#ffbd2e]" />
                    <div className="size-3 rounded-full bg-[#28ca42]" />
                  </div>
                  <div className="text-muted-foreground text-center text-sm font-medium">
                    {title ?? "Untitled"}
                  </div>
                  <div className="flex gap-1.5 justify-self-end">
                    {titleEndContent}
                  </div>
                </div>
                <div className="flex flex-col overflow-hidden">{children}</div>
              </DialogPrimitive.Content>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogPortal>
  );
};
