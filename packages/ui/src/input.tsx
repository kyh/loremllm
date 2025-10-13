"use client";

import * as React from "react";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

import { cn } from "./utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  caretChars?: string;
  label?: string;
};

const Input = ({
  caretChars,
  label,
  placeholder,
  onChange,
  id,
  className,
  value,
  defaultValue,
  ...rest
}: InputProps) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const measureRef = React.useRef<HTMLSpanElement | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isCaretAtEnd, setIsCaretAtEnd] = React.useState(true);
  const [caretLeft, setCaretLeft] = React.useState(0);
  const [caretTop, setCaretTop] = React.useState(0);

  const [text, setText] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: (value) => {
      if (onChange) {
        const syntheticEvent = {
          target: { value: value ?? "" },
          currentTarget: { value: value ?? "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    },
  });

  const textValue = String(text ?? "");
  const lastFocusDirectionRef = React.useRef<"up" | "down" | null>(null);

  const updateCaretPosition = React.useCallback(() => {
    if (!inputRef.current || !measureRef.current) return;
    const cursorPos = inputRef.current.selectionStart ?? 0;
    setIsCaretAtEnd(cursorPos >= textValue.length);

    // Measure the width of text up to cursor position
    if (cursorPos >= textValue.length) {
      // Copy computed styles from input to measure element
      const styles = window.getComputedStyle(inputRef.current);
      measureRef.current.style.font = styles.font;
      measureRef.current.style.letterSpacing = styles.letterSpacing;
      measureRef.current.style.wordSpacing = styles.wordSpacing;
      measureRef.current.style.lineHeight = styles.lineHeight;

      measureRef.current.textContent = textValue || "";

      // Use getBoundingClientRect for more accurate positioning
      const measureRect = measureRef.current.getBoundingClientRect();

      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const borderLeft = parseFloat(styles.borderLeftWidth) || 0;
      const paddingTop = parseFloat(styles.paddingTop) || 0;
      const borderTop = parseFloat(styles.borderTopWidth) || 0;

      setCaretLeft(measureRect.width + paddingLeft + borderLeft);
      setCaretTop(paddingTop + borderTop);
    }
  }, [textValue]);

  const onHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    setTimeout(updateCaretPosition, 0);
  };

  const onHandleFocus = () => {
    setIsFocused(true);
    updateCaretPosition();

    if (!inputRef.current) return;
    if (lastFocusDirectionRef.current === "down") {
      inputRef.current.setSelectionRange(textValue.length, textValue.length);
    } else if (lastFocusDirectionRef.current === "up") {
      inputRef.current.setSelectionRange(0, 0);
    }
  };

  const onHandleBlur = () => {
    setIsFocused(false);
  };

  const onHandleSelect = () => {
    updateCaretPosition();
  };

  const onHandleClick = () => {
    updateCaretPosition();
  };

  const onHandleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      lastFocusDirectionRef.current = "up";
      const previousFocusable = findNextFocusable(
        document.activeElement,
        "previous",
      );
      previousFocusable?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      lastFocusDirectionRef.current = "down";
      const nextFocusable = findNextFocusable(document.activeElement, "next");
      nextFocusable?.focus();
    } else {
      setTimeout(updateCaretPosition, 0);
    }
  };

  const containerClasses = cn(
    "relative block",
    isFocused && "focused",
    className,
  );
  const caretDisplayContent = caretChars ?? "";

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className="block bg-[var(--theme-border)]">
          {label}
        </label>
      )}
      <div className="relative block">
        <input
          id={inputId}
          ref={inputRef}
          className={cn(
            "m-0 w-full border-0 bg-[var(--theme-background-input)] p-0 leading-[var(--theme-line-height-base)] shadow-[inset_0_0_0_2px_var(--theme-border)] outline-0 [&:-webkit-autofill]:shadow-[0_0_0px_1000px_var(--theme-focused-foreground)_inset]",
            isFocused && isCaretAtEnd && "caret-transparent",
          )}
          value={textValue}
          placeholder={placeholder}
          onFocus={onHandleFocus}
          onBlur={onHandleBlur}
          onChange={onHandleChange}
          onSelect={onHandleSelect}
          onClick={onHandleClick}
          onKeyDown={onHandleKeyDown}
          {...rest}
        />
        <span
          ref={measureRef}
          className="invisible absolute whitespace-pre"
          aria-hidden="true"
        />
        {isFocused && isCaretAtEnd && (
          <span
            className="pointer-events-none absolute inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] min-w-[1ch] animate-[blink_1s_step-start_0s_infinite] bg-[var(--theme-text)] align-bottom text-[var(--theme-background)]"
            style={{
              left: `${caretLeft}px`,
              top: `${caretTop}px`,
            }}
          >
            {caretDisplayContent}
          </span>
        )}
      </div>
    </div>
  );
};

const findNextFocusable = (
  element: Element | null,
  direction: "next" | "previous" = "next",
): HTMLElement | null => {
  if (!element) return null;

  const focusableSelectors = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  const focusableElements = Array.from(
    document.querySelectorAll<HTMLElement>(focusableSelectors.join(", ")),
  );

  const currentIndex = focusableElements.indexOf(element as HTMLElement);

  if (currentIndex !== -1) {
    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % focusableElements.length
        : (currentIndex - 1 + focusableElements.length) %
          focusableElements.length;

    return focusableElements[nextIndex] ?? null;
  }

  return null;
};

export { Input };
