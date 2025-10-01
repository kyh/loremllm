"use client";

import * as React from "react";

import { ActionBar } from "../action-bar";
import { ActionButton } from "../action-button";
import { toggleDebugGrid } from "../debug-grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";

type DefaultActionBarProps = {
  items?: {
    hotkey: string;
    onClick: () => void;
    body: React.ReactNode;
  }[];
};

const DefaultActionBar: React.FC<DefaultActionBarProps> = () => {
  function onHandleThemeChange(className?: string) {
    const body = document.body;

    body.classList.forEach((existingClass) => {
      if (existingClass.startsWith("theme-")) {
        body.classList.remove(existingClass);
      }
    });

    if (className) {
      body.classList.add(className);
    } else {
      body.classList.add("theme-light");
    }
  }

  return (
    <div className="fixed top-0 left-[2ch] z-[1]">
      <ActionBar>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionButton hotkey="⌃+T">Theme</ActionButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onHandleThemeChange("")}>
              ⊹ Refined White [DEFAULT]
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHandleThemeChange("theme-dark")}>
              ⊹ Black Midnight Vapor
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onHandleThemeChange("theme-black-red")}
            >
              ⊹ U-571 Code Red
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onHandleThemeChange("theme-black-teal")}
            >
              ⊹ Digital Bioluminescence
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHandleThemeChange("theme-blue")}>
              ⊹ Operation Safe Blue
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onHandleThemeChange("theme-green")}
            >
              ⊹ Neon Green Garden
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onHandleThemeChange("theme-black-green")}
            >
              ⊹ Kirkland Signature AS/400
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ActionButton hotkey="⌃+G" onClick={() => toggleDebugGrid()}>
          Grid
        </ActionButton>
      </ActionBar>
    </div>
  );
};

export { DefaultActionBar };
