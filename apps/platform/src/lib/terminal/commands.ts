import type { ExtendedTerminal } from "./types";
import { _DIRS, _FILES, _filesHere, _FULL_PATHS, getFileContents } from "./fs";
import { colorText } from "./terminal-ext";

let killed = false;

const help = {
  "%help%": "list all commands (you're looking at it)",
  "%whoami%": "learn about LoremLLM",
  "%twitter%": "twitter account",
  "%github%": "github repository",
  "%other%": "try your fav commands (e.g. %ls%, %groups%, %su%)",
};

export const commands = {
  help: function (args: string[], term: ExtendedTerminal) {
    const maxCmdLength = Math.max(...Object.keys(help).map((x) => x.length));
    Object.entries(help).forEach(function (kv) {
      const cmd = kv[0];
      const desc = kv[1];
      if (term.cols >= 80) {
        const rightPad = maxCmdLength - cmd.length + 2;
        const sep = " ".repeat(rightPad);
        term.stylePrint(`${cmd}${sep}${desc}`);
      } else {
        if (cmd != "help") {
          // skip second leading newline
          term.writeln("");
        }
        term.stylePrint(cmd);
        term.stylePrint(desc);
      }
    });
  },

  whoami: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(
      "LoremLLM is a collection of tools that help developers mock LLM responses. Use it for development/prototyping, testing, demos, learning, high volume testing, and offline development. LoremLLM helps you create consistent test cases, control what's shown in demos, teach AI concepts without API costs, and work without internet or API access.",
    );
  },

  github: function (args: string[], term: ExtendedTerminal) {
    term.displayURL("https://github.com/kyh/loremllm");
  },

  twitter: function (args: string[], term: ExtendedTerminal) {
    term.displayURL("https://twitter.com/kaiyuhsu");
  },

  other: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(
      "Yeah, I didn't literally mean %other%. I mean try some Linux commands",
    );
  },

  echo: function (args: string[], term: ExtendedTerminal) {
    const message = args.join(" ");
    term.stylePrint(message);
  },

  say: function (args: string[], term: ExtendedTerminal) {
    const message = args.join(" ");
    term.stylePrint(`(Robot voice): ${message}`);
  },

  pwd: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("/" + term.cwd.replaceAll("~", `home/${term.user}`));
  },

  ls: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(_filesHere(term.cwd).join("   "));
  },

  // I am so, so sorry for this code.
  cd: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(`You do not have permission to access this directory`);
  },

  zsh: function (args: string[], term: ExtendedTerminal) {
    term.init(term.user);
  },

  cat: function (args: string[], term: ExtendedTerminal) {
    const filename = args[0];

    if (!filename) {
      term.stylePrint("usage: cat [filename]");
      return;
    }

    if (_filesHere(term.cwd).includes(filename)) {
      term.writeln(getFileContents(filename));
    } else {
      term.stylePrint(`No such file: ${filename}`);
    }
  },

  grep: function (args: string[], term: ExtendedTerminal) {
    const q = args[0];
    const filename = args[1];

    if (filename == "id_rsa") {
      term.openURL("https://i.imgur.com/Q2Unw.gif");
    }

    if (!q || !filename) {
      term.stylePrint("usage: %grep% [pattern] [filename]");
      return;
    }

    if (_filesHere(term.cwd).includes(filename)) {
      const file = getFileContents(filename);
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const matches = file.matchAll(regex);
      let highlightedFile = file;
      for (const match of matches) {
        highlightedFile = highlightedFile.replaceAll(
          match[0],
          colorText(match[0], "command"),
        );
      }
      term.writeln(highlightedFile);
    } else {
      term.stylePrint(`No such file or directory: ${filename}`);
    }
  },

  finger: function (args: string[], term: ExtendedTerminal) {
    const user = args[0];

    switch (user) {
      case "guest":
        term.stylePrint("Login: guest            Name: Guest");
        term.stylePrint("Directory: /home/guest  Shell: /bin/zsh");
        break;
      case "root":
        term.stylePrint("Login: root             Name: That's Us!");
        term.stylePrint("Directory: /home/root   Shell: /bin/zsh");
        break;
      default:
        term.stylePrint(
          user ? `%finger%: ${user}: no such user` : "usage: %finger% [user]",
        );
        break;
    }
  },

  groups: function (args: string[], term: ExtendedTerminal) {
    const user = args[0];

    switch (user) {
      case "guest":
        term.stylePrint("guest lps founders engineers investors");
        break;
      case "root":
        term.stylePrint("wheel developers engineers loremllm");
        break;
      default:
        term.stylePrint(
          user ? `%groups%: ${user}: no such user` : "usage: %groups% [user]",
        );
        break;
    }
  },

  gzip: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(
      "What are you going to do with a zip file on a fake terminal, seriously?",
    );
  },

  free: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("Honestly, our memory isn't what it used to be.");
  },

  tail: function (args: string[], term: ExtendedTerminal) {
    term.command(`cat ${args.join(" ")}`);
  },

  less: function (args: string[], term: ExtendedTerminal) {
    term.command(`cat ${args.join(" ")}`);
  },

  head: function (args: string[], term: ExtendedTerminal) {
    term.command(`cat ${args.join(" ")}`);
  },

  open: function (args: string[], term: ExtendedTerminal) {
    if (!args.length) {
      term.stylePrint("%open%: open a file - usage:\r\n");
      term.stylePrint("%open% README.md");
    } else {
      term.openURL(`./${args[0]}`, false);
    }
  },

  more: function (args: string[], term: ExtendedTerminal) {
    term.command(`cat ${args.join(" ")}`);
  },

  emacs: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("%emacs% not installed. try: %vi%");
  },

  vim: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("%vim% not installed. try: %emacs%");
  },

  vi: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("%vi% not installed. try: %emacs%");
  },

  pico: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("%pico% not installed. try: %vi% or %emacs%");
  },

  nano: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("%nano% not installed. try: %vi% or %emacs%");
  },

  pine: function (args: string[], term: ExtendedTerminal) {
    term.openURL("mailto:im.kaiyu@gmail.com");
  },

  curl: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(
      `Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource ${args[0]}. Use a real terminal.`,
    );
  },

  ftp: function (args: string[], term: ExtendedTerminal) {
    term.command(`curl ${args.join(" ")}`);
  },

  ssh: function (args: string[], term: ExtendedTerminal) {
    term.command(`curl ${args.join(" ")}`);
  },

  sftp: function (args: string[], term: ExtendedTerminal) {
    term.command(`curl ${args.join(" ")}`);
  },

  scp: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(
      `████████████ Request Blocked: The ███████████ Policy disallows reading the ██████ resource ${args[0]}.`,
    );
  },

  rm: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("I'm sorry, I'm afraid I can't do that.");
  },

  mkdir: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("Come on, don't mess with our immaculate file system.");
  },

  alias: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("Just call me HAL.");
  },

  df: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("Nice try. Just get a Dropbox.");
  },

  kill: function (args: string[], term: ExtendedTerminal) {
    if (args[args.length - 1] == "337") {
      killed = true;
      term.stylePrint("LoremLLM crypto miner disabled.");
    } else {
      term.stylePrint("You can't kill me!");
    }
  },

  killall: function (args: string[], term: ExtendedTerminal) {
    term.command(`kill ${args.join(" ")}`);
  },

  history: function (args: string[], term: ExtendedTerminal) {
    term.history.forEach((element: string, index: number) => {
      term.stylePrint(`${1000 + index}  ${element}`);
    });
  },

  find: function (args: string[], term: ExtendedTerminal) {
    const file = args[0];
    if (!file) {
      term.stylePrint("usage: find [filename]");
      return;
    }
    if (Object.keys(_FILES).includes(file)) {
      term.stylePrint(_FULL_PATHS[file] ?? "");
    } else {
      term.stylePrint(`%find%: ${file}: No such file or directory`);
    }
  },

  fdisk: function (args: string[], term: ExtendedTerminal) {
    term.command("rm");
  },

  chown: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("You do not have permission to %chown%");
  },

  chmod: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("You do not have permission to %chmod%");
  },

  mv: function (args: string[], term: ExtendedTerminal) {
    const src = args[0];

    if (!src) {
      term.stylePrint("usage: mv [source] [destination]");
      return;
    }

    if (_filesHere(term.cwd).includes(src)) {
      term.stylePrint(`You do not have permission to move file ${src}`);
    } else {
      term.stylePrint(`%mv%: ${src}: No such file or directory`);
    }
  },

  cp: function (args: string[], term: ExtendedTerminal) {
    const src = args[0];

    if (!src) {
      term.stylePrint("usage: cp [source] [destination]");
      return;
    }

    if (_filesHere(term.cwd).includes(src)) {
      term.stylePrint(`You do not have permission to copy file ${src}`);
    } else {
      term.stylePrint(`%cp%: ${src}: No such file or directory`);
    }
  },

  touch: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("You can't %touch% this");
  },

  sudo: function (args: string[], term: ExtendedTerminal) {
    if (term.user == "root") {
      term.command(args.join(" "));
    } else {
      term.stylePrint(
        `${colorText(
          term.user,
          "user",
        )} is not in the sudoers file. This incident will be reported`,
      );
    }
  },

  su: function (args: string[], term: ExtendedTerminal) {
    const user = args[0] ?? "root";

    if (user == "root" || user == "guest") {
      term.user = user;
      term.command("cd ~");
    } else {
      term.stylePrint("su: Sorry");
    }
  },

  quit: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("Use Ctrl+C to cancel current command.");
  },

  stop: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("Use Ctrl+C to cancel current command.");
  },

  passwd: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(
      "Wow. Maybe don't enter your password into a sketchy web-based term.command prompt?",
    );
  },

  man: function (args: string[], term: ExtendedTerminal) {
    term.command(`tldr ${args.join(" ")}`);
  },

  woman: function (args: string[], term: ExtendedTerminal) {
    term.command(`tldr ${args.join(" ")}`);
  },

  ping: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("pong");
  },

  ps: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("PID TTY       TIME CMD");
    term.stylePrint("424 ttys00 0:00.33 %-zsh%");
    term.stylePrint("158 ttys01 0:09.70 %/bin/npm start%");
    term.stylePrint("767 ttys02 0:00.02 %/bin/sh%");
    if (!killed) {
      term.stylePrint("337 ttys03 0:13.37 %/bin/cgminer -o pwn.d%");
    }
  },

  uname: function (args: string[], term: ExtendedTerminal) {
    switch (args[0]) {
      case "-a":
        term.stylePrint(
          "LoremLLM loremllm 0.0.1 LoremLLM Kernel Version 0.0.1 root:xnu-31415.926.5~3/RELEASE_X86_64 x86_64",
        );
        break;
      case "-mrs":
        term.stylePrint("LoremLLM 0.0.1 x86_64");
        break;
      default:
        term.stylePrint("LoremLLM");
    }
  },

  top: function (args: string[], term: ExtendedTerminal) {
    term.command("ps");
  },

  clear: function (args: string[], term: ExtendedTerminal) {
    term.init();
  },

  zed: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint("Coming soon! ;)");
  },

  ge: function (args: string[], term: ExtendedTerminal) {
    term.command("great_expectations");
  },

  great_expectations: function (args: string[], term: ExtendedTerminal) {
    term.command("superconductive");
  },

  privacy: function (args: string[], term: ExtendedTerminal) {
    term.command("privacy_dynamics");
  },

  eval: function (args: string[], term: ExtendedTerminal) {
    term.stylePrint(
      "please instead build a webstore with macros. in the meantime, the result is: " +
        eval(args.join(" ")),
    );
  },
};
