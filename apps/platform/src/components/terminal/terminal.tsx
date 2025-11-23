"use client";

import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";

import type { ExtendedTerminal } from "@/lib/terminal/types";
import { extend } from "@/lib/terminal/terminal-ext";
import { runRootTerminal } from "@/lib/terminal/terminal-runner";

import "@xterm/xterm/css/xterm.css";

export const TerminalComponent = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current || termRef.current) return;

    // Create terminal instance
    const term = new Terminal({ cursorBlink: true });
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.open(terminalRef.current);
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Extend terminal with custom methods
    extend(term, fitAddon);

    // Run terminal (cast to ExtendedTerminal after extend)
    runRootTerminal(term as ExtendedTerminal);

    // Store refs
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial fit

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div className="flex h-full min-h-dvh w-full flex-col bg-black font-mono">
      <div id="aa-all" className="hidden" />
      <div id="files-all" className="hidden" />
      <div
        ref={terminalRef}
        id="terminal"
        className="h-full w-full flex-1 p-6"
      />
    </div>
  );
};
