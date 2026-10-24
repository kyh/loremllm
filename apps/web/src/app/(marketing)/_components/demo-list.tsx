"use client";

import * as React from "react";
import { Dialog, DialogTrigger } from "@repo/ui/components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";

import type { Demo } from "./demo-data";
import type { HoverTextHandle } from "./hover-text";
import { DemoChat } from "./demo-chat";
import { DemoCodeView } from "./demo-code-view";
import { useDemoNavigation } from "./demo-navigation-context";
import { DraggablePanel } from "./draggable-panel";
import { HoverText } from "./hover-text";

interface DemoListProps {
  demos: Demo[];
  className?: string;
}

type DialogChangeDetails = Parameters<
  NonNullable<React.ComponentProps<typeof Dialog>["onOpenChange"]>
>[1];

/**
 * The panel is portaled outside the Dialog's (absent) popup, so Base UI reads a
 * press inside it — focusing the prompt, say — as an outside press and would
 * close the demo the visitor is typing into.
 */
const isPressInsidePanel = (details: DialogChangeDetails) =>
  details.reason === "outside-press" &&
  details.event.target instanceof Element &&
  details.event.target.closest("[data-draggable-panel]") !== null;

const formatCounter = (index: number) => (index + 1).toString().padStart(2, "0");

interface DemoItemProps {
  demo: Demo;
  index: number;
  setHoverTextRef: (
    itemIndex: number,
    colIndex: number,
  ) => (handle: HoverTextHandle | null) => void;
  createMouseHandlers: (index: number) => {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

const DemoItem = ({ demo, index, setHoverTextRef, createMouseHandlers }: DemoItemProps) => {
  const { allDemos, openIndex, openDemo, closeDemo, goToPrevious, goToNext, hasPrevious, hasNext } =
    useDemoNavigation();

  const mouseHandlers = createMouseHandlers(index);
  const currentDemo = openIndex === null ? null : allDemos[openIndex];
  const isOpen = currentDemo?.id === demo.id;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open, details) => {
        if (open) {
          openDemo(demo);
        } else if (!isPressInsidePanel(details)) {
          closeDemo();
        }
      }}
    >
      <DialogTrigger
        nativeButton={false}
        render={
          <li
            className="grid cursor-pointer grid-cols-[40px_1fr] gap-x-4 py-2 text-base sm:grid-cols-[50px_180px_1fr] sm:gap-x-8 sm:text-lg"
            {...mouseHandlers}
          >
            <span>{formatCounter(index)}</span>
            <HoverText ref={setHoverTextRef(index, 0)}>{demo.title}</HoverText>
            <HoverText
              ref={setHoverTextRef(index, 1)}
              className="hidden whitespace-normal sm:block"
            >
              {demo.description}
            </HoverText>
          </li>
        }
      />
      {currentDemo && isOpen && (
        <DraggablePanel
          title={`[${currentDemo.section}] ${currentDemo.title}`}
          isOpen={isOpen}
          onClose={closeDemo}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          size={{ height: 600, width: 500 }}
        >
          <Tabs defaultValue="preview" className="h-full min-h-0">
            <TabsList className="divide-border border-b divide-x">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="min-h-0 overflow-hidden">
              <DemoChat demo={currentDemo} />
            </TabsContent>
            <TabsContent value="code" className="bg-background min-h-0 overflow-auto">
              <DemoCodeView demo={currentDemo} />
            </TabsContent>
          </Tabs>
        </DraggablePanel>
      )}
    </Dialog>
  );
};

export const DemoList = ({ demos, className }: DemoListProps) => {
  const hoverTextRefs = React.useRef<Map<number, HoverTextHandle[]>>(new Map());

  const setHoverTextRef = React.useCallback(
    (itemIndex: number, colIndex: number) => (handle: HoverTextHandle | null) => {
      if (handle) {
        if (!hoverTextRefs.current.has(itemIndex)) {
          hoverTextRefs.current.set(itemIndex, []);
        }
        const refs = hoverTextRefs.current.get(itemIndex);
        if (refs) {
          refs[colIndex] = handle;
        }
      }
    },
    [],
  );

  const createMouseHandlers = React.useCallback(
    (index: number) => ({
      onMouseEnter: () => {
        const handles = hoverTextRefs.current.get(index);
        if (handles) {
          for (const handle of handles) {
            handle.animate();
          }
        }
      },
      onMouseLeave: () => {
        const handles = hoverTextRefs.current.get(index);
        if (handles) {
          for (const handle of handles) {
            handle.animateBack();
          }
        }
      },
    }),
    [],
  );

  return (
    <ul className={className}>
      {demos.map((demo, index) => (
        <DemoItem
          key={demo.id}
          demo={demo}
          index={index}
          setHoverTextRef={setHoverTextRef}
          createMouseHandlers={createMouseHandlers}
        />
      ))}
    </ul>
  );
};
