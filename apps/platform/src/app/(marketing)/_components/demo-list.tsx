"use client";

import * as React from "react";
import { Dialog, DialogTrigger } from "@repo/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";

import type { Demo } from "./demo-data";
import type { HoverTextHandle } from "./hover-text";
import { DemoChat } from "./demo-chat";
import { DemoCodeView } from "./demo-code-view";
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
  const [isOpen, setIsOpen] = React.useState(false);
  const mouseHandlers = createMouseHandlers(index);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <li
          className="grid cursor-pointer grid-cols-[50px_240px_1fr] gap-x-8 py-2 text-lg"
          {...mouseHandlers}
        >
          <span>{formatCounter(index)}</span>
          <HoverText ref={setHoverTextRef(index, 0)}>{demo.title}</HoverText>
          <HoverText
            ref={setHoverTextRef(index, 1)}
            className="whitespace-normal"
          >
            {demo.description}
          </HoverText>
        </li>
      </DialogTrigger>
      <DraggablePanel
        title={demo.title}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <Tabs defaultValue="preview" className="h-[70dvh]">
          <TabsList className="border-b">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <DemoChat demo={demo} />
          </TabsContent>
          <TabsContent
            value="code"
            className="max-w-[calc(100%-2rem)] overflow-auto sm:max-w-2xl"
          >
            <DemoCodeView demo={demo} />
          </TabsContent>
        </Tabs>
      </DraggablePanel>
    </Dialog>
  );
};
