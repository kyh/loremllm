"use client";

import { gsap } from "gsap";
import SplitType from "split-type";

const LETTERS_AND_SYMBOLS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "!",
  "@",
  "#",
  "$",
  "%",
  "^",
  "&",
  "*",
  "-",
  "_",
  "+",
  "=",
  ";",
  ":",
  "<",
  ">",
  ",",
];

type AnimationVariant = "cursor-square" | "bg";

const randomChar = () =>
  LETTERS_AND_SYMBOLS[Math.floor(Math.random() * LETTERS_AND_SYMBOLS.length)];

export class TextAnimator {
  private textElement: HTMLElement;
  private splitter: SplitType | null = null;
  private originalChars: string[] = [];
  private variant: AnimationVariant;

  constructor(textElement: HTMLElement, variant: AnimationVariant = "cursor-square") {
    if (!(textElement instanceof HTMLElement)) {
      throw new Error("Invalid text element provided.");
    }
    this.textElement = textElement;
    this.variant = variant;
    this.splitText();
  }

  private splitText() {
    try {
      if (this.splitter) {
        this.splitter.revert();
      }
      this.splitter = new SplitType(this.textElement, {
        types: "words,chars",
      });
      this.originalChars = (this.splitter.chars ?? []).map(
        (char) => char.innerHTML || char.textContent || "",
      );
    } catch (error) {
      console.error("SplitType initialization error:", error);
    }
  }

  reset() {
    if (!this.splitter) {
      return;
    }
    const chars = this.splitter.chars ?? [];
    for (const [index, char] of chars.entries()) {
      gsap.killTweensOf(char);
      if (this.originalChars[index] !== undefined) {
        char.innerHTML = this.originalChars[index] ?? "";
      }
    }
    if (this.variant === "bg") {
      gsap.killTweensOf(this.textElement);
      gsap.set(this.textElement, { "--anim": 0 });
    }
  }

  animate() {
    if (!this.splitter) {
      return;
    }
    this.reset();
    const chars = this.splitter.chars || [];
    if (chars.length === 0) {
      return;
    }

    if (this.variant === "cursor-square") {
      for (const [position, char] of chars.entries()) {
        const initialHTML = this.originalChars[position] ?? char.innerHTML;
        let repeatCount = 0;

        gsap.fromTo(
          char,
          { opacity: 0 },
          {
            delay: (position + 1) * 0.07,
            duration: 0.03,
            innerHTML: randomChar,
            onComplete: () => {
              gsap.set(char, { delay: 0.03, innerHTML: initialHTML });
            },
            onRepeat: () => {
              repeatCount += 1;
              if (repeatCount === 1) {
                gsap.set(char, { "--opa": 0 });
              }
            },
            onStart: () => {
              gsap.set(char, { "--opa": 1 });
            },
            opacity: 1,
            repeat: 3,
            repeatDelay: 0.04,
            repeatRefresh: true,
          },
        );
      }
    } else {
      for (const [position, char] of chars.entries()) {
        const initialHTML = this.originalChars[position] ?? char.innerHTML;
        gsap.fromTo(
          char,
          { opacity: 0 },
          {
            delay: (position + 1) * 0.06,
            duration: 0.03,
            innerHTML: randomChar,
            onComplete: () => {
              gsap.set(char, { delay: 0.1, innerHTML: initialHTML });
            },
            opacity: 1,
            repeat: 2,
            repeatDelay: 0.05,
            repeatRefresh: true,
          },
        );
      }
      gsap.fromTo(this.textElement, { "--anim": 0 }, { "--anim": 1, duration: 1, ease: "expo" });
    }
  }

  animateBack() {
    gsap.killTweensOf(this.textElement);
    gsap.to(this.textElement, {
      "--anim": 0,
      duration: 0.6,
      ease: "power4",
    });
  }
}
