import type { ExtendedTerminal } from "./types";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal as XTermTerminal } from "@xterm/xterm";
import { commands } from "./commands";
import { _DIRS, _filesHere, preloadFiles } from "./fs";

// ANSI color codes
const COLORS: Record<string, string> = {
  command: "\x1b[1;35m",
  hyperlink: "\x1b[1;34m",
  user: "\x1b[1;33m",
  prompt: "\x1b[1;32m",
  bold: "\x1b[1;37m",
};

export function colorText(text: string, color: string): string {
  return `${COLORS[color] ?? ""}${text}\x1b[0;38m`;
}

// ASCII Art Logo
export const LOGO_TYPE = `
    __                              __    __    __  ___
   / /   ____  ________  ____ ___  / /   / /   /  |/  /
  / /   / __ \\/ ___/ _ \\/ __  __ \\/ /   / /   / /|_/ / 
 / /___/ /_/ / /  /  __/ / / / / / /___/ /___/ /  / /  
/_____/\\____/_/   \\___/_/ /_/ /_/_____/_____/_/  /_/   
`.replaceAll("\n", "\r\n");

// Word wrap utility
function wordWrap(str: string, maxWidth: number): string {
  const newLineStr = "\r\n";
  let res = "";
  while (str.length > maxWidth) {
    let found = false;
    for (let i = maxWidth - 1; i >= 0; i--) {
      if (/^\s$/.test(str.charAt(i))) {
        res = res + [str.slice(0, i), newLineStr].join("");
        str = str.slice(i + 1);
        found = true;
        break;
      }
    }
    if (!found) {
      res += [str.slice(0, maxWidth), newLineStr].join("");
      str = str.slice(maxWidth);
    }
  }
  return res + str;
}

// Helper to reset tab completion state
function resetTabState(term: ExtendedTerminal): void {
  term.tabIndex = 0;
  term.tabOptions = [];
  term.tabBase = "";
}

/**
 * Initialize and run the terminal with all custom methods and input handling
 */
export function initializeTerminal(
  term: XTermTerminal,
  fitAddon: FitAddon,
  navigate?: (path: string) => void,
): void {
  const t = term as ExtendedTerminal;

  // Initialize state
  t.currentLine = "";
  t.user = "guest";
  t.host = "loremllm";
  t.cwd = "~";
  t.sep = ":";
  t._promptChar = "$";
  t.history = [];
  t.historyCursor = -1;
  t.tabIndex = 0;
  t.tabOptions = [];
  t.tabBase = "";
  t.deepLink =
    typeof window !== "undefined"
      ? window.location.hash.replace("#", "").split("-").join(" ")
      : "";

  // Cursor position helper
  t.pos = () => {
    const termCore = (
      t as unknown as XTermTerminal & { _core: { buffer: { x: number } } }
    )._core;
    return termCore.buffer.x - t._promptRawText().length - 1;
  };

  // Prompt helpers
  t._promptRawText = () => `${t.user}${t.sep}${t.host} ${t.cwd} $`;

  t.promptText = () => {
    return t
      ._promptRawText()
      .replace(t.user, colorText(t.user, "user"))
      .replace(t.sep, colorText(t.sep, ""))
      .replace(t.host, colorText(t.host, ""))
      .replace(t.cwd, colorText(t.cwd, "hyperlink"))
      .replace(t._promptChar, colorText(t._promptChar, "prompt"));
  };

  t.prompt = (prefix = "\r\n", suffix = " ") => {
    t.write(`${prefix}${t.promptText()}${suffix}`);
  };

  // Timing helpers
  t.timer = (ms: number) => new Promise((res) => setTimeout(res, ms));

  t.delayPrint = async (str: string, time: number) => {
    await t.timer(time);
    t.write(str);
  };

  // Line editing
  t.clearCurrentLine = (goToEndofHistory = false) => {
    t.write("\x1b[2K\r");
    t.prompt("", " ");
    t.currentLine = "";
    if (goToEndofHistory) {
      t.historyCursor = -1;
      t.scrollToBottom();
    }
  };

  t.setCurrentLine = (newLine: string, preserveCursor = false) => {
    const oldPos = t.pos();
    const length = t.currentLine.length;
    t.clearCurrentLine();
    t.currentLine = newLine;
    t.write(newLine);
    if (preserveCursor) {
      t.write("\x1b[D".repeat(length - oldPos));
    }
  };

  // Output formatting
  t.stylePrint = (text: string, wrap = true) => {
    // Highlight URLs
    const urlRegex =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,24}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
    const urlMatches = text.matchAll(urlRegex);
    let allowWrapping = true;
    for (const match of urlMatches) {
      allowWrapping = match[0].length < 76;
      text = text.replace(match[0], colorText(match[0], "hyperlink"));
    }

    // Word wrap
    if (allowWrapping && wrap) {
      text = wordWrap(text, Math.min(t.cols, 76));
    }

    // Highlight commands
    for (const cmd of Object.keys(commands)) {
      const cmdRegex = new RegExp(
        `%${cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}%`,
        "g",
      );
      for (const match of text.matchAll(cmdRegex)) {
        text = text.replace(match[0], colorText(cmd, "command"));
      }
    }

    t.writeln(text);
  };

  t.printLogoType = () => {
    t.writeln(t.cols >= 40 ? LOGO_TYPE : "[LoremLLM]\r\n");
  };

  // Navigation
  t.openURL = (url: string, newWindow = true) => {
    t.stylePrint(`Opening ${url}`);
    if (t._initialized) {
      if (newWindow) {
        window.open(url, "_blank");
      } else {
        window.location.href = url;
      }
    }
  };

  t.displayURL = (url: string) => {
    t.stylePrint(colorText(url, "hyperlink"));
  };

  t.navigate = (path: string) => {
    if (navigate) {
      navigate(path);
    } else if (typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  // Command execution
  t.command = (line: string) => {
    const parts = line.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    if (!cmd) return;

    const args = parts.slice(1);
    const fn = commands[cmd as keyof typeof commands];
    if (typeof fn === "undefined") {
      t.stylePrint(`Command not found: ${cmd}. Try 'help' to get started.`);
    } else {
      return fn(args, t);
    }
  };

  // Initialization
  t.init = (user = "guest", preserveHistory = false) => {
    try {
      fitAddon.fit();
    } catch {
      // Ignore fit errors when terminal isn't ready
    }
    preloadFiles();
    t.reset();
    t.printLogoType();
    t.stylePrint("Mock responses for LLMs!");
    t.stylePrint(
      `Type ${colorText("help", "command")} to get started. or ${colorText("demo", "command")} to try a demo.`,
      false,
    );
    t.user = user;
    if (!preserveHistory) {
      t.history = [];
    }
    t.focus();
  };

  t.runDeepLink = () => {
    if (t.deepLink !== "") {
      t.command(t.deepLink);
    }
  };

  t.resizeListener = () => {
    t._initialized = false;
    t.init(t.user, true);
    t.runDeepLink();
    for (const c of t.history) {
      t.prompt("\r\n", ` ${c}\r\n`);
      t.command(c);
    }
    t.prompt();
    t.scrollToBottom();
    t._initialized = true;
  };

  // Run terminal
  if (t._initialized) return;

  t.init();
  t._initialized = true;
  t.locked = false;

  if (typeof window === "undefined") return;

  t.prompt();
  t.runDeepLink();

  // Input handling
  t.onData((e: string) => {
    if (!t._initialized || t.locked) return;

    switch (e) {
      case "\r": {
        // Enter
        resetTabState(t);
        t.currentLine = t.currentLine.trim();
        const tokens = t.currentLine.split(" ");
        const cmd = tokens.shift();
        const args = tokens.join(" ");
        t.writeln("");

        if (t.currentLine.length > 0) {
          t.history.push(t.currentLine);
          const exitStatus = t.command(t.currentLine);

          // Analytics
          const dataLayer = (window as { dataLayer?: unknown[] }).dataLayer;
          if (dataLayer) {
            dataLayer.push({ event: "commandSent", command: cmd, args });
          }

          if (exitStatus !== 1) {
            t.prompt();
            t.clearCurrentLine(true);
          }
        } else {
          t.prompt();
          t.clearCurrentLine(true);
        }
        break;
      }

      case "\u0001": // Ctrl+A - go to start
        t.write("\x1b[D".repeat(t.pos()));
        break;

      case "\u0005": // Ctrl+E - go to end
        if (t.pos() < t.currentLine.length) {
          t.write("\x1b[C".repeat(t.currentLine.length - t.pos()));
        }
        break;

      case "\u0003": // Ctrl+C - cancel
        resetTabState(t);
        t.prompt();
        t.clearCurrentLine(true);
        break;

      case "\u0008": // Ctrl+H
      case "\u007F": // Backspace
        resetTabState(t);
        if (t.pos() > 0) {
          const newLine =
            t.currentLine.slice(0, t.pos() - 1) + t.currentLine.slice(t.pos());
          t.setCurrentLine(newLine, true);
        }
        break;

      case "\x1b[A": {
        // Up arrow - history
        resetTabState(t);
        const historyReversed = [...t.history].reverse();
        if (t.historyCursor < historyReversed.length - 1) {
          t.historyCursor += 1;
          const historyLine = historyReversed[t.historyCursor];
          if (historyLine !== undefined) {
            t.setCurrentLine(historyLine, false);
          }
        }
        break;
      }

      case "\x1b[B": {
        // Down arrow - history
        resetTabState(t);
        const historyReversed = [...t.history].reverse();
        if (t.historyCursor > 0) {
          t.historyCursor -= 1;
          const historyLine = historyReversed[t.historyCursor];
          if (historyLine !== undefined) {
            t.setCurrentLine(historyLine, false);
          }
        } else {
          t.clearCurrentLine(true);
        }
        break;
      }

      case "\x1b[C": // Right arrow
        if (t.pos() < t.currentLine.length) {
          t.write("\x1b[C");
        }
        break;

      case "\x1b[D": // Left arrow
        if (t.pos() > 0) {
          t.write("\x1b[D");
        }
        break;

      case "\t": {
        // Tab completion
        const tabParts = t.currentLine.split(" ");
        const tabCmd = tabParts[0] ?? "";
        const tabRest = tabParts.slice(1).join(" ");

        if (t.tabBase !== t.currentLine) {
          resetTabState(t);
          t.tabBase = t.currentLine;

          // Get completions based on context
          if (tabParts.length === 1) {
            t.tabOptions = Object.keys(commands)
              .filter((c) => c.startsWith(tabCmd))
              .sort();
          } else if (
            [
              "cat",
              "tail",
              "less",
              "head",
              "open",
              "mv",
              "cp",
              "chown",
              "chmod",
              "ls",
            ].includes(tabCmd)
          ) {
            t.tabOptions = _filesHere(t.cwd)
              .filter((f) => f.startsWith(tabRest))
              .sort();
          } else if (tabCmd === "cd") {
            t.tabOptions = _filesHere(t.cwd)
              .filter(
                (dir) =>
                  dir.startsWith(tabRest) && !_DIRS[t.cwd]?.includes(dir),
              )
              .sort();
          }
        }

        if (t.tabOptions.length === 1) {
          // Single match
          const completion =
            tabParts.length === 1
              ? `${t.tabOptions[0]} `
              : `${tabCmd} ${t.tabOptions[0]}`;
          t.setCurrentLine(completion);
          resetTabState(t);
        } else if (t.tabOptions.length > 1) {
          if (t.tabIndex === 0) {
            // First tab - show options
            t.writeln(`\r\n${t.tabOptions.join("   ")}`);
            t.prompt();
            t.setCurrentLine(t.currentLine);
            t.tabIndex = 1;
          } else {
            // Cycle through options
            const option = t.tabOptions[(t.tabIndex - 1) % t.tabOptions.length];
            if (option !== undefined) {
              const completion =
                tabParts.length === 1 ? option : `${tabCmd} ${option}`;
              t.setCurrentLine(completion);
            }
            t.tabIndex++;
            t.tabBase = t.currentLine;
          }
        }
        break;
      }

      default: {
        // Regular character input
        resetTabState(t);
        const newLine = `${t.currentLine.slice(0, t.pos())}${e}${t.currentLine.slice(t.pos())}`;
        t.setCurrentLine(newLine, true);
        break;
      }
    }

    t.scrollToBottom();
  });
}
