const _LOCAL_FILES: Record<string, string> = {
  id_rsa: "Nice try!",
};

const _REMOTE_FILES: Record<string, string> = {
  "README.md":
    "https://raw.githubusercontent.com/kyh/loremllm/refs/heads/main/README.md",
};

export const _FILES = {
  ..._LOCAL_FILES,
  ..._REMOTE_FILES,
};

export const _DIRS: Record<string, string[]> = {
  "~": ["id_rsa", "README.md"],
  bin: ["zsh"],
  home: ["guest", "root"].sort(),
  "/": ["bin", "home"],
};

const _FULL_PATHS: Record<string, string> = {};
for (const [key, values] of Object.entries(_DIRS)) {
  for (const value of values) {
    switch (key) {
      case "~":
        _FULL_PATHS[value] = `${key}/${value}`;
        break;
      case "/":
        _FULL_PATHS[value] = `/${value}`;
        break;
      default:
        _FULL_PATHS[value] = `/${key}/${value}`;
    }
  }
}

export { _FULL_PATHS };

const filesCache: Record<string, string> = { ..._LOCAL_FILES };

// Initialize DOM elements for file storage (similar to original implementation)
if (typeof document !== "undefined") {
  let filesDiv = document.getElementById("files-all");
  if (!filesDiv) {
    filesDiv = document.createElement("div");
    filesDiv.id = "files-all";
    filesDiv.style.display = "none";
    document.body.appendChild(filesDiv);
  }
}

export function preloadFiles() {
  // Initialize local files in cache
  for (const [name, content] of Object.entries(_LOCAL_FILES)) {
    filesCache[name] = content;
    if (typeof document !== "undefined") {
      _insertFileToDOM(name, content);
    }
  }

  // Load remote files
  for (const [name, url] of Object.entries(_REMOTE_FILES)) {
    _loadFile(name, url);
  }
}

function _loadFile(name: string, url: string) {
  fetch(url)
    .then((response) => response.text())
    .then((body) => {
      filesCache[name] = body;
      if (typeof document !== "undefined") {
        _insertFileToDOM(name, body);
      }
    })
    .catch(() => {
      // Silently fail if file can't be loaded
    });
}

function _insertFileToDOM(name: string, txt: string) {
  if (typeof document === "undefined") return;

  const parentDiv = document.getElementById("files-all");
  if (!parentDiv) return;

  let div = document.getElementById(name);
  if (!div) {
    div = document.createElement("div");
    div.id = name;
    parentDiv.appendChild(div);
  }
  div.innerText = txt;
}

export function getFileContents(filename: string): string {
  // Try cache first
  if (filesCache[filename]) {
    return filesCache[filename]
      .replaceAll("<br>", "\r\n")
      .replaceAll("&gt;", ">")
      .replaceAll("&lt;", "<");
  }

  // Fallback to DOM (for compatibility)
  if (typeof document !== "undefined") {
    const div = document.getElementById(filename);
    if (div) {
      return div.innerHTML
        .replaceAll("<br>", "\r\n")
        .replaceAll("&gt;", ">")
        .replaceAll("&lt;", "<");
    }
  }

  return `No such file: ${filename}`;
}

export function _filesHere(cwd: string): string[] {
  return _DIRS[cwd] ?? [];
}
