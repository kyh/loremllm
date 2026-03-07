"use client";

import * as React from "react";
import { useTheme } from "@repo/ui/theme";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="text-link hover:text-link-hover pointer-events-auto cursor-pointer no-underline outline-none"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
};
