"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { XIcon } from "lucide-react";
import { motion } from "motion/react";
import { createPortal } from "react-dom";

type DraggablePanelProps = {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  size?: { width: number; height: number };
  className?: string;
};

const MOBILE_BREAKPOINT = 640;

export const DraggablePanel = ({
  title,
  icon,
  children,
  isOpen,
  onClose,
  initialPosition = { x: 20, y: 20 },
  size = { width: 300, height: 200 },
  className,
}: DraggablePanelProps) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          left: rect.left,
          top: rect.top,
        };
      }

      const handleMove = (moveEvent: PointerEvent) => {
        if (!dragStartRef.current) return;
        if (moveEvent.pointerId !== e.pointerId) return;

        const deltaX = moveEvent.clientX - dragStartRef.current.x;
        const deltaY = moveEvent.clientY - dragStartRef.current.y;

        let newLeft = dragStartRef.current.left + deltaX;
        let newTop = dragStartRef.current.top + deltaY;

        // Constrain to viewport
        const maxLeft = window.innerWidth - size.width;
        const maxTop = window.innerHeight - size.height;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        setPosition({ x: newLeft, y: newTop });
      };

      const handleEnd = (endEvent?: PointerEvent) => {
        if (endEvent && endEvent.pointerId !== e.pointerId) return;

        setIsDragging(false);
        dragStartRef.current = null;
        target.releasePointerCapture(e.pointerId);
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleEnd);
        document.removeEventListener("pointercancel", handleEnd);
      };

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleEnd);
      document.addEventListener("pointercancel", handleEnd);
    },
    [size],
  );

  if (!isOpen) return null;

  const panel = (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-popover/20 border-border fixed z-50 flex flex-col rounded-lg border shadow-lg backdrop-blur-sm",
        isDragging && "select-none",
        isMobile && "inset-2 !h-auto !w-auto",
        className,
      )}
      style={
        isMobile
          ? undefined
          : {
              left: position.x,
              top: position.y,
              width: size.width,
              height: size.height,
            }
      }
    >
      <div
        className={cn(
          "border-border bg-muted/50 flex items-center justify-between rounded-t-lg border-b px-3 py-2",
          !isMobile && "cursor-move",
        )}
        onPointerDown={isMobile ? undefined : handleDragStart}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-mono text-sm font-semibold">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="size-5"
        >
          <XIcon />
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded-b-lg">{children}</div>
    </motion.div>
  );

  if (typeof window === "undefined") return null;

  return createPortal(panel, document.body);
};
