// Local files stored in memory
const LOCAL_FILES: Record<string, string> = {
  id_rsa: "Nice try!",
};

// Remote files to fetch
const REMOTE_FILES: Record<string, string> = {
  "README.md":
    "https://raw.githubusercontent.com/kyh/loremllm/refs/heads/main/README.md",
};

// All files (for exports)
export const _FILES = {
  ...LOCAL_FILES,
  ...REMOTE_FILES,
};

// Directory structure
export const _DIRS: Record<string, string[]> = {
  "~": ["id_rsa", "README.md"],
  bin: ["zsh"],
  home: ["guest", "root"].sort(),
  "/": ["bin", "home"],
};

// Full paths mapping
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

// In-memory file cache
const filesCache: Record<string, string> = { ...LOCAL_FILES };

/**
 * Preload all files into cache
 */
export function preloadFiles(): void {
  // Load remote files
  for (const [name, url] of Object.entries(REMOTE_FILES)) {
    fetch(url)
      .then((response) => response.text())
      .then((body) => {
        filesCache[name] = body;
      })
      .catch(() => {
        // Silently fail if file can't be loaded
      });
  }
}

/**
 * Get file contents from cache
 */
export function getFileContents(filename: string): string {
  const content = filesCache[filename];
  if (content) {
    return content
      .replaceAll("<br>", "\r\n")
      .replaceAll("&gt;", ">")
      .replaceAll("&lt;", "<");
  }
  return `No such file: ${filename}`;
}

/**
 * Get files in directory
 */
export function _filesHere(cwd: string): string[] {
  return _DIRS[cwd] ?? [];
}
