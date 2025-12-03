import type { Terminal as XTermTerminal } from "@xterm/xterm";

export type ExtendedTerminal = XTermTerminal & {
  currentLine: string;
  user: string;
  host: string;
  cwd: string;
  sep: string;
  _promptChar: string;
  history: string[];
  historyCursor: number;
  pos: () => number;
  _promptRawText: () => string;
  deepLink: string;
  tabIndex: number;
  tabOptions: string[];
  tabBase: string;
  _initialized?: boolean;
  locked?: boolean;

  // Custom methods
  promptText: () => string;
  timer: (ms: number) => Promise<void>;
  delayPrint: (str: string, t: number) => Promise<void>;
  prompt: (prefix?: string, suffix?: string) => void;
  clearCurrentLine: (goToEndofHistory?: boolean) => void;
  setCurrentLine: (newLine: string, preserveCursor?: boolean) => void;
  stylePrint: (text: string, wrap?: boolean) => void;
  printLogoType: () => void;
  openURL: (url: string, newWindow?: boolean) => void;
  displayURL: (url: string) => void;
  navigate: (path: string) => void;
  command: (line: string) => number | void;
  resizeListener: () => void;
  init: (user?: string, preserveHistory?: boolean) => void;
  runDeepLink: () => void;
};
