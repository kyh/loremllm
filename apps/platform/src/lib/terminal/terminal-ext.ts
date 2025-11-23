import type { ExtendedTerminal } from "./types";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal as XTermTerminal } from "@xterm/xterm";
import { commands } from "./commands";
import { _DIRS, _filesHere, preloadFiles } from "./fs";

// Utility functions
export function colorText(text: string, color: string): string {
  const colors: Record<string, string> = {
    command: "\x1b[1;35m",
    hyperlink: "\x1b[1;34m",
    user: "\x1b[1;33m",
    prompt: "\x1b[1;32m",
    bold: "\x1b[1;37m",
  };
  return `${colors[color] ?? ""}${text}\x1b[0;38m`;
}

// ASCII Art
export const LOGO_TYPE = `
    __                              __    __    __  ___
   / /   ____  ________  ____ ___  / /   / /   /  |/  /
  / /   / __ \\/ ___/ _ \\/ __  __ \\/ /   / /   / /|_/ / 
 / /___/ /_/ / /  /  __/ / / / / / /___/ /___/ /  / /  
/_____/\\____/_/   \\___/_/ /_/ /_/_____/_____/_/  /_/   
`.replaceAll("\n", "\r\n");

export function extend(term: XTermTerminal, fitAddon: FitAddon): void {
  const extendedTerm = term as ExtendedTerminal;

  extendedTerm.currentLine = "";
  extendedTerm.user = "guest";
  extendedTerm.host = "loremllm";
  extendedTerm.cwd = "~";
  extendedTerm.sep = ":";
  extendedTerm._promptChar = "$";
  extendedTerm.history = [];
  extendedTerm.historyCursor = -1;
  extendedTerm.pos = () => {
    // Access the underlying Terminal's _core property
    const termCore = (
      extendedTerm as unknown as XTermTerminal & {
        _core: { buffer: { x: number } };
      }
    )._core;
    return termCore.buffer.x - extendedTerm._promptRawText().length - 1;
  };
  extendedTerm._promptRawText = () =>
    `${extendedTerm.user}${extendedTerm.sep}${extendedTerm.host} ${extendedTerm.cwd} $`;
  extendedTerm.deepLink =
    typeof window !== "undefined"
      ? window.location.hash.replace("#", "").split("-").join(" ")
      : "";

  // Simple tab completion state
  extendedTerm.tabIndex = 0;
  extendedTerm.tabOptions = [];
  extendedTerm.tabBase = "";

  extendedTerm.promptText = () => {
    const text = extendedTerm
      ._promptRawText()
      .replace(extendedTerm.user, colorText(extendedTerm.user, "user"))
      .replace(extendedTerm.sep, colorText(extendedTerm.sep, ""))
      .replace(extendedTerm.host, colorText(extendedTerm.host, ""))
      .replace(extendedTerm.cwd, colorText(extendedTerm.cwd, "hyperlink"))
      .replace(
        extendedTerm._promptChar,
        colorText(extendedTerm._promptChar, "prompt"),
      );
    return text;
  };

  extendedTerm.timer = (ms: number) =>
    new Promise((res) => setTimeout(res, ms));

  extendedTerm.delayPrint = async (str: string, t: number) => {
    await extendedTerm.timer(t);
    extendedTerm.write(str);
  };

  extendedTerm.prompt = (prefix = "\r\n", suffix = " ") => {
    extendedTerm.write(`${prefix}${extendedTerm.promptText()}${suffix}`);
  };

  extendedTerm.clearCurrentLine = (goToEndofHistory = false) => {
    extendedTerm.write("\x1b[2K\r");
    extendedTerm.prompt("", " ");
    extendedTerm.currentLine = "";
    if (goToEndofHistory) {
      extendedTerm.historyCursor = -1;
      extendedTerm.scrollToBottom();
    }
  };

  extendedTerm.setCurrentLine = (newLine: string, preserveCursor = false) => {
    // Something with the new xterm package is messing up the location of term.pos() right after the clearCurrentLine()
    // Because of this, we need to collect the position beforehand.
    const oldPos = extendedTerm.pos();
    const length = extendedTerm.currentLine.length;
    extendedTerm.clearCurrentLine();
    extendedTerm.currentLine = newLine;
    extendedTerm.write(newLine);
    if (preserveCursor) {
      // extendedTerm.write("\x1b[D".repeat(length - extendedTerm.pos()));
      extendedTerm.write("\x1b[D".repeat(length - oldPos));
    }
  };

  extendedTerm.stylePrint = (text: string, wrap = true) => {
    // Hyperlinks
    const urlRegex =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,24}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
    const urlMatches = text.matchAll(urlRegex);
    let allowWrapping = true;
    for (const match of urlMatches) {
      allowWrapping = match[0].length < 76;
      text = text.replace(match[0], colorText(match[0], "hyperlink"));
    }

    // Text Wrap
    if (allowWrapping && wrap) {
      text = _wordWrap(text, Math.min(extendedTerm.cols, 76));
    }

    // Commands
    const cmds = Object.keys(commands);
    for (const cmd of cmds) {
      const cmdRegex = new RegExp(
        `%${cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}%`,
        "g",
      );
      const cmdMatches = text.matchAll(cmdRegex);
      for (const match of cmdMatches) {
        text = text.replace(match[0], colorText(cmd, "command"));
      }
    }

    extendedTerm.writeln(text);
  };

  extendedTerm.printLogoType = () => {
    extendedTerm.writeln(
      extendedTerm.cols >= 40 ? LOGO_TYPE : "[LoremLLM]\r\n",
    );
  };

  extendedTerm.openURL = (url: string, newWindow = true) => {
    extendedTerm.stylePrint(`Opening ${url}`);
    if (extendedTerm._initialized) {
      if (newWindow) {
        window.open(url, "_blank");
      } else {
        window.location.href = url;
      }
    }
  };

  extendedTerm.displayURL = (url: string) => {
    extendedTerm.stylePrint(colorText(url, "hyperlink"));
  };

  extendedTerm.command = (line: string) => {
    const parts = line.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    if (!cmd) {
      return;
    }
    const args = parts.slice(1, parts.length);
    const fn = commands[cmd as keyof typeof commands];
    if (typeof fn === "undefined") {
      extendedTerm.stylePrint(
        `Command not found: ${cmd}. Try 'help' to get started.`,
      );
    } else {
      return fn(args, extendedTerm);
    }
  };

  extendedTerm.resizeListener = () => {
    extendedTerm._initialized = false;
    extendedTerm.init(extendedTerm.user, true);
    extendedTerm.runDeepLink();
    for (const c of extendedTerm.history) {
      extendedTerm.prompt("\r\n", ` ${c}\r\n`);
      extendedTerm.command(c);
    }
    extendedTerm.prompt();
    extendedTerm.scrollToBottom();
    extendedTerm._initialized = true;
  };

  extendedTerm.init = (user = "guest", preserveHistory = false) => {
    fitAddon.fit();
    preloadFiles();
    extendedTerm.reset();
    extendedTerm.printLogoType();
    extendedTerm.stylePrint("Mock responses for LLMs!");
    extendedTerm.stylePrint(
      `Type ${colorText("help", "command")} to get started. or ${colorText("demo", "command")} to try a demo.`,
      false,
    );

    extendedTerm.user = user;
    if (!preserveHistory) {
      extendedTerm.history = [];
    }
    extendedTerm.focus();
  };

  extendedTerm.runDeepLink = () => {
    if (extendedTerm.deepLink != "") {
      extendedTerm.command(extendedTerm.deepLink);
    }
  };
}

// https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
// TODO: This doesn't work well at detecting newline
function _wordWrap(str: string, maxWidth: number): string {
  const newLineStr = "\r\n";
  let res = "";
  while (str.length > maxWidth) {
    let found = false;
    // Inserts new line at first whitespace of the line
    for (let i = maxWidth - 1; i >= 0; i--) {
      if (_testWhite(str.charAt(i))) {
        res = res + [str.slice(0, i), newLineStr].join("");
        str = str.slice(i + 1);
        found = true;
        break;
      }
    }
    // Inserts new line at maxWidth position, the word is too long to wrap
    if (!found) {
      res += [str.slice(0, maxWidth), newLineStr].join("");
      str = str.slice(maxWidth);
    }
  }
  return res + str;
}

function _testWhite(x: string): boolean {
  const white = new RegExp(/^\s$/);
  return white.test(x.charAt(0));
}
