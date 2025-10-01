"use client";

import * as React from "react";
import clsx from "clsx";

import { cn } from "./utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  caretChars?: string | any;
  label?: string | any;
  isBlink?: boolean;
};

const Input = ({
  caretChars,
  isBlink = true,
  label,
  placeholder,
  onChange,
  type,
  id,
  className,
  ...rest
}: InputProps) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [text, setText] = React.useState<string>(
    rest.defaultValue?.toString() || rest.value?.toString() || "",
  );
  const [isFocused, setIsFocused] = React.useState<boolean>(false);
  const [selectionStart, setSelectionStart] = React.useState<number>(
    text.length,
  );

  const lastFocusDirectionRef = React.useRef<"up" | "down" | null>(null);

  React.useEffect(() => {
    if (rest.value !== undefined) {
      const val = rest.value.toString();
      setText(val);
      setSelectionStart(val.length);
    }
  }, [rest.value]);

  const onHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    if (onChange) {
      onChange(e);
    }
    setSelectionStart(e.target.selectionStart ?? value.length);
  };

  const onHandleFocus = () => {
    setIsFocused(true);
    if (!inputRef.current) return;

    if (lastFocusDirectionRef.current === "down") {
      setSelectionStart(text.length);
      inputRef.current.setSelectionRange(text.length, text.length);
    } else if (lastFocusDirectionRef.current === "up") {
      setSelectionStart(0);
      inputRef.current.setSelectionRange(0, 0);
    }
  };

  const onHandleBlur = () => {
    setIsFocused(false);
  };

  const onHandleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget as HTMLInputElement;
    setSelectionStart(inputEl.selectionStart ?? text.length);
  };

  const onHandleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget as HTMLInputElement;
    inputEl.focus();
    setSelectionStart(inputEl.selectionStart ?? text.length);
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
    }
  };

  const isPlaceholderVisible = !text && placeholder;
  const containerClasses = cn(
    "relative block",
    isFocused && "focused",
    className,
  );

  const maskText = (t: string) =>
    type === "password" ? "•".repeat(t.length) : t;

  const beforeCaretText = isPlaceholderVisible
    ? (placeholder ?? "")
    : maskText(text.substring(0, selectionStart));
  const afterCaretText = isPlaceholderVisible
    ? ""
    : maskText(text.substring(selectionStart));

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className="block bg-[var(--theme-border)]">
          {label}
        </label>
      )}
      <div className="relative block">
        <div
          className={clsx(
            "break-anywhere pointer-events-none overflow-hidden bg-[var(--theme-background-input)] whitespace-nowrap shadow-[inset_0_0_0_2px_var(--theme-border)]",
            isPlaceholderVisible && "text-[var(--theme-overlay)] italic",
          )}
        >
          {beforeCaretText}
          {!isPlaceholderVisible && (
            <span
              className={clsx(
                "inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] min-w-[1ch] bg-[var(--theme-text)] align-bottom text-[var(--theme-background)]",
                isBlink && "animate-[blink_1s_step-start_0s_infinite]",
                isFocused && "bg-[var(--theme-focused-foreground)]",
              )}
            >
              {caretChars || ""}
            </span>
          )}
          {!isPlaceholderVisible && afterCaretText}
        </div>
        <input
          id={inputId}
          ref={inputRef}
          className="font-inherit absolute top-0 left-0 m-0 w-full overflow-hidden border-0 bg-transparent p-0 leading-[var(--theme-line-height-base)] text-[var(--font-size)] text-transparent caret-transparent outline-0 [&:-webkit-autofill]:shadow-[0_0_0px_1000px_var(--theme-focused-foreground)_inset]"
          value={text}
          aria-placeholder={placeholder}
          type={type}
          onFocus={onHandleFocus}
          onBlur={onHandleBlur}
          onChange={onHandleChange}
          onSelect={onHandleSelect}
          onClick={onHandleClick}
          onKeyDown={onHandleKeyDown}
          {...rest}
        />
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
