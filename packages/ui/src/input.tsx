"use client";

import * as React from "react";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import clsx from "clsx";

import { cn } from "./utils";

type MirrorCaretOptions = {
  value: string;
  placeholder?: string;
  maskText?: (text: string) => string;
};

type MirrorCaretReturn<TElement extends HTMLInputElement | HTMLTextAreaElement> = {
  isFocused: boolean;
  isPlaceholderVisible: boolean;
  clampedSelectionStart: number;
  isCaretAtEnd: boolean;
  beforeCaretText: string;
  highlightedDisplayCharacter: string;
  afterCaretText: string;
  handleFocus: (event: React.FocusEvent<TElement>) => void;
  handleBlur: () => void;
  handleSelect: (event: React.SyntheticEvent<TElement>) => void;
  handleClick: (event: React.MouseEvent<TElement>) => void;
  setSelectionStart: React.Dispatch<React.SetStateAction<number>>;
  setSelectionFromTarget: (target: TElement) => void;
};

const useMirrorCaret = <TElement extends HTMLInputElement | HTMLTextAreaElement>({
  value,
  placeholder = "",
  maskText = (text: string) => text,
}: MirrorCaretOptions): MirrorCaretReturn<TElement> => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState<number>(value.length);

  React.useEffect(() => {
    setSelectionStart((previous) => Math.min(previous, value.length));
  }, [value]);

  const setSelectionFromTarget = React.useCallback((target: TElement) => {
    const nextSelectionStart =
      typeof target.selectionStart === "number"
        ? target.selectionStart
        : target.value.length;

    setSelectionStart(nextSelectionStart);
  }, []);

  const handleFocus = React.useCallback(
    (event: React.FocusEvent<TElement>) => {
      setIsFocused(true);
      setSelectionFromTarget(event.currentTarget);
    },
    [setSelectionFromTarget],
  );

  const handleBlur = React.useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleSelect = React.useCallback(
    (event: React.SyntheticEvent<TElement>) => {
      setSelectionFromTarget(event.currentTarget);
    },
    [setSelectionFromTarget],
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<TElement>) => {
      event.currentTarget.focus();
      setSelectionFromTarget(event.currentTarget);
    },
    [setSelectionFromTarget],
  );

  const isPlaceholderVisible = !value && placeholder.length > 0;
  const clampedSelectionStart = Math.min(selectionStart, value.length);
  const isCaretAtEnd = clampedSelectionStart >= value.length;

  const beforeCaretText = isPlaceholderVisible
    ? placeholder
    : maskText(value.substring(0, clampedSelectionStart));

  const highlightedCharacter =
    !isPlaceholderVisible && !isCaretAtEnd
      ? maskText(value.charAt(clampedSelectionStart))
      : "";

  const highlightedDisplayCharacter =
    highlightedCharacter === "" ? "\u00a0" : highlightedCharacter;

  const afterCaretText = isPlaceholderVisible
    ? ""
    : maskText(
        value.substring(clampedSelectionStart + (isCaretAtEnd ? 0 : 1)),
      );

  return {
    isFocused,
    isPlaceholderVisible,
    clampedSelectionStart,
    isCaretAtEnd,
    beforeCaretText,
    highlightedDisplayCharacter,
    afterCaretText,
    handleFocus,
    handleBlur,
    handleSelect,
    handleClick,
    setSelectionStart,
    setSelectionFromTarget,
  };
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  caretChars?: string;
  label?: string;
};

const Input = ({
  caretChars,
  label,
  placeholder,
  onChange,
  type,
  id,
  className,
  value,
  defaultValue,
  ...rest
}: InputProps) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
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

  const placeholderText = placeholder ?? "";

  const maskText = React.useCallback(
    (t: string) => (type === "password" ? "•".repeat(t.length) : t),
    [type],
  );

  const {
    isFocused,
    isPlaceholderVisible,
    isCaretAtEnd,
    beforeCaretText,
    highlightedDisplayCharacter,
    afterCaretText,
    handleFocus,
    handleBlur,
    handleSelect,
    handleClick,
    setSelectionStart,
    setSelectionFromTarget,
  } = useMirrorCaret<HTMLInputElement>({
    value: textValue,
    placeholder: placeholderText,
    maskText,
  });

  const onHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    setSelectionFromTarget(e.currentTarget);
  };

  const onHandleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    handleFocus(event);
    if (!inputRef.current) return;

    if (lastFocusDirectionRef.current === "down") {
      setSelectionStart(textValue.length);
      inputRef.current.setSelectionRange(textValue.length, textValue.length);
    } else if (lastFocusDirectionRef.current === "up") {
      setSelectionStart(0);
      inputRef.current.setSelectionRange(0, 0);
    }
  };

  const onHandleBlur = () => {
    handleBlur();
  };

  const onHandleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    handleSelect(e);
  };

  const onHandleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    handleClick(e);
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
        <div
          className={clsx(
            "break-anywhere pointer-events-none overflow-hidden whitespace-nowrap bg-[var(--theme-background-input)] shadow-[inset_0_0_0_2px_var(--theme-border)]",
            isPlaceholderVisible && "text-[var(--theme-overlay)] italic",
          )}
        >
          {beforeCaretText}
          {isFocused && !isPlaceholderVisible && !isCaretAtEnd && (
            <span className="inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] animate-[blink_1s_step-start_0s_infinite] bg-[var(--theme-text)] align-bottom text-[var(--theme-background)]">
              {highlightedDisplayCharacter}
            </span>
          )}
          {isFocused && (isPlaceholderVisible || isCaretAtEnd) && (
            <span className="inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] min-w-[1ch] animate-[blink_1s_step-start_0s_infinite] bg-[var(--theme-text)] align-bottom text-[var(--theme-background)]">
              {caretDisplayContent}
            </span>
          )}
          {!isPlaceholderVisible && afterCaretText}
        </div>
        <input
          id={inputId}
          ref={inputRef}
          className="font-inherit absolute top-0 left-0 m-0 w-full overflow-hidden border-0 bg-transparent p-0 leading-[var(--theme-line-height-base)] text-transparent caret-transparent outline-0 [&:-webkit-autofill]:shadow-[0_0_0px_1000px_var(--theme-focused-foreground)_inset]"
          value={textValue}
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

export { Input, useMirrorCaret };
