"use client";

import * as React from "react";
import { Dialog, DialogTrigger } from "@repo/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";

import type { Demo } from "./demo-data";
import type { HoverTextHandle } from "./hover-text";
import { DemoChat } from "./demo-chat";
import { DemoCodeView } from "./demo-code-view";
import { useDemoNavigation } from "./demo-navigation-context";
import { DraggablePanel } from "./draggable-panel";
import { HoverText } from "./hover-text";

type DemoListProps = {
  demos: Demo[];
  className?: string;
};

export const DemoList = ({ demos, className }: DemoListProps) => {
  const hoverTextRefs = React.useRef<Map<number, HoverTextHandle[]>>(new Map());

  const formatCounter = (index: number) => {
    const num = (index + 1).toString().padStart(2, "0");
    return num;
  };

  const setHoverTextRef = React.useCallback(
    (itemIndex: number, colIndex: number) => {
      return (handle: HoverTextHandle | null) => {
        if (handle) {
          if (!hoverTextRefs.current.has(itemIndex)) {
            hoverTextRefs.current.set(itemIndex, []);
          }
          const refs = hoverTextRefs.current.get(itemIndex);
          if (refs) {
            refs[colIndex] = handle;
          }
        }
      };
    },
    [],
  );

  const createMouseHandlers = React.useCallback((index: number) => {
    return {
      onMouseEnter: () => {
        const handles = hoverTextRefs.current.get(index);
        if (handles) {
          handles.forEach((handle) => {
            handle.animate();
          });
        }
      },
      onMouseLeave: () => {
        const handles = hoverTextRefs.current.get(index);
        if (handles) {
          handles.forEach((handle) => {
            handle.animateBack();
          });
        }
      },
    };
  }, []);

  return (
    <ul className={className}>
      {demos.map((demo, index) => (
        <DemoItem
          key={demo.id}
          demo={demo}
          index={index}
          setHoverTextRef={setHoverTextRef}
          createMouseHandlers={createMouseHandlers}
          formatCounter={formatCounter}
        />
      ))}
    </ul>
  );
};

type DemoItemProps = {
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
  formatCounter: (index: number) => string;
};

const DemoItem = ({
  demo,
  index,
  setHoverTextRef,
  createMouseHandlers,
  formatCounter,
}: DemoItemProps) => {
  const {
    allDemos,
    openIndex,
    openDemo,
    closeDemo,
    goToPrevious,
    goToNext,
    hasPrevious,
    hasNext,
  } = useDemoNavigation();

  const mouseHandlers = createMouseHandlers(index);
  const currentDemo = openIndex !== null ? allDemos[openIndex] : null;
  const isOpen = currentDemo?.id === demo.id;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? openDemo(demo) : closeDemo())}>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      {currentDemo && isOpen && (
        <DraggablePanel
          title={`[${currentDemo.section}] ${currentDemo.title}`}
          isOpen={isOpen}
          onClose={closeDemo}
          onPrevious={goToPrevious}
          onNext={goToNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          size={{ width: 500, height: 600 }}
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
