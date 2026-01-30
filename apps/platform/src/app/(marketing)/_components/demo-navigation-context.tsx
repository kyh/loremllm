"use client";

import * as React from "react";

import type { Demo } from "./demo-data";

type DemoNavigationContextValue = {
  allDemos: Demo[];
  openIndex: number | null;
  openDemo: (demo: Demo) => void;
  closeDemo: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
};

const DemoNavigationContext =
  React.createContext<DemoNavigationContextValue | null>(null);

type DemoNavigationProviderProps = {
  demos: Demo[];
  children: React.ReactNode;
};

export const DemoNavigationProvider = ({
  demos,
  children,
}: DemoNavigationProviderProps) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const openDemo = React.useCallback(
    (demo: Demo) => {
      const index = demos.findIndex((d) => d.id === demo.id);
      if (index !== -1) {
        setOpenIndex(index);
      }
    },
    [demos],
  );

  const closeDemo = React.useCallback(() => {
    setOpenIndex(null);
  }, []);

  const goToPrevious = React.useCallback(() => {
    setOpenIndex((current) =>
      current !== null && current > 0 ? current - 1 : current,
    );
  }, []);

  const goToNext = React.useCallback(() => {
    setOpenIndex((current) =>
      current !== null && current < demos.length - 1 ? current + 1 : current,
    );
  }, [demos.length]);

  const value = React.useMemo(
    () => ({
      allDemos: demos,
      openIndex,
      openDemo,
      closeDemo,
      goToPrevious,
      goToNext,
      hasPrevious: openIndex !== null && openIndex > 0,
      hasNext: openIndex !== null && openIndex < demos.length - 1,
    }),
    [demos, openIndex, openDemo, closeDemo, goToPrevious, goToNext],
  );

  return (
    <DemoNavigationContext.Provider value={value}>
      {children}
    </DemoNavigationContext.Provider>
  );
};

export const useDemoNavigation = () => {
  const context = React.useContext(DemoNavigationContext);
  if (!context) {
    throw new Error(
      "useDemoNavigation must be used within a DemoNavigationProvider",
    );
  }
  return context;
};
