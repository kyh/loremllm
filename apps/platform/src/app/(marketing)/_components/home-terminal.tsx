"use client";

import { useEffect, useRef } from "react";

import type { FitAddon } from "xterm-addon-fit";
import type { Terminal } from "xterm";

const sequences = [
  {
    command: "loremllm summarize \"Latest AI research on generative agents\"",
    output: [
      "• Key breakthroughs in memory-augmented agents",
      "• New evaluation metrics for autonomous workflows",
      "• Practical guidance for deploying research prototypes",
    ],
  },
  {
    command: "loremllm brainstorm features --topic \"AI writing assistant\"",
    output: [
      "1. Context-aware tone shifts",
      "2. Team collaboration canvas",
      "3. Instant citation lookup",
    ],
  },
  {
    command: "loremllm draft email --persona product_manager",
    output: [
      "Subject: Aligning on next sprint goals",
      "Body: Highlights risks, proposes milestones, and requests async feedback.",
    ],
  },
  {
    command: "loremllm plan release-notes --source ./changelog.md",
    output: [
      "✔ Generated customer-friendly summary",
      "✔ Highlighted upgrade steps",
      "✔ Suggested launch tweet thread",
    ],
  },
];

const delay = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const typeLine = async (
  term: Terminal,
  text: string,
  shouldStop?: () => boolean,
) => {
  await new Promise<void>((resolve) => {
    let index = 0;
    const interval = window.setInterval(() => {
      const shouldHalt = shouldStop?.() ?? false;
      if (shouldHalt) {
        window.clearInterval(interval);
        resolve();
        return;
      }

      if (index < text.length) {
        term.write(text.charAt(index));
      }

      index += 1;

      if (index >= text.length) {
        window.clearInterval(interval);
        resolve();
      }
    }, 35);
  });

  const hasStopped = shouldStop?.() ?? false;
  if (!hasStopped) {
    term.write("\r\n");
  }
};

export const HomeTerminal = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;

    const isDisposed = () => disposed;

    const setup = async () => {
      const [xtermModule, fitAddonModule] = await Promise.all([
        import("xterm"),
        import("xterm-addon-fit"),
      ]);

      await import("xterm/css/xterm.css");

      const { Terminal: XTerm } = xtermModule;
      const { FitAddon: XTermFitAddon } = fitAddonModule;

      if (isDisposed()) {
        return;
      }

      term = new XTerm({
        convertEol: true,
        cursorBlink: true,
        fontFamily: "'DM Mono', 'Fira Code', monospace",
        fontSize: 14,
        allowTransparency: true,
        theme: {
          background: "#020617",
          foreground: "#e2e8f0",
          cursor: "#38bdf8",
        },
      });

      fitAddon = new XTermFitAddon();
      term.loadAddon(fitAddon);

      if (containerRef.current) {
        term.open(containerRef.current);
        fitAddon.fit();
      }

      resizeObserver = new ResizeObserver(() => {
        if (!isDisposed()) {
          fitAddon?.fit();
        }
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      const runDemo = async (terminal: Terminal) => {
        for (const sequence of sequences) {
          if (isDisposed()) break;
          terminal.write("\x1b[38;5;81m$ \x1b[0m");
          await typeLine(terminal, sequence.command, isDisposed);
          if (isDisposed()) break;
          await delay(300);
          if (isDisposed()) break;
          for (const line of sequence.output) {
            if (isDisposed()) break;
            terminal.writeln(`  ${line}`);
          }
          if (isDisposed()) break;
          terminal.writeln("");
          await delay(600);
        }

        if (!isDisposed()) {
          terminal.write("\x1b[38;5;81m$ \x1b[0m");
        }
      };

      void runDemo(term);
    };

    void setup();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      fitAddon?.dispose();
      term?.dispose();
      resizeObserver = null;
      fitAddon = null;
      term = null;
    };
  }, []);

  return <div ref={containerRef} className="flex-1" />;
};
