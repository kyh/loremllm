"use client";

import * as React from "react";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import clsx from "clsx";

import { useMirrorCaret } from "./input";
import { cn } from "./utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = ({
  placeholder,
  onChange,
  className,
  value,
  defaultValue,
  ...rest
}: TextareaProps) => {
  const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const measurementRef = React.useRef<HTMLDivElement | null>(null);

  const [text, setText] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: (value) => {
      if (onChange) {
        const syntheticEvent = {
          target: { value: value ?? "" },
          currentTarget: { value: value ?? "" },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    },
  });

  const textValue = String(text ?? "");
  const placeholderText = placeholder ?? "";

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
    setSelectionFromTarget,
  } = useMirrorCaret<HTMLTextAreaElement>({
    value: textValue,
    placeholder: placeholderText,
  });

  const resizeTextArea = React.useCallback(() => {
    if (!textAreaRef.current) return;
    textAreaRef.current.style.height = "auto";
    textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
  }, []);

  React.useEffect(() => {
    resizeTextArea();
    window.addEventListener("resize", resizeTextArea);
    return () => window.removeEventListener("resize", resizeTextArea);
  }, [resizeTextArea]);

  const onHandleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    resizeTextArea();
    setSelectionFromTarget(e.currentTarget);
  };

  const onHandleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    handleSelect(e);
  };

  const onHandleFocus = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    handleFocus(event);
  };

  const onHandleBlur = () => {
    handleBlur();
  };

  const onHandleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    handleClick(e);
  };

  const onHandleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Focus management removed - can be re-added if needed
  };

  const containerClasses = cn("relative", isFocused && "focused", className);

  return (
    <div className={containerClasses}>
      <div
        className={clsx(
          "break-anywhere pointer-events-none break-words whitespace-pre-wrap",
          isPlaceholderVisible && "italic opacity-70",
          isFocused &&
            "[&_.block]:bg-[var(--theme-focused-foreground)] [&_.placeholder]:bg-[var(--theme-focused-foreground)]",
        )}
      >
        {beforeCaretText}
        {isFocused && !isPlaceholderVisible && !isCaretAtEnd && (
          <span className="inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] animate-[blink_1s_step-start_infinite] bg-[var(--theme-text)] align-bottom text-[var(--theme-background)]">
            {highlightedDisplayCharacter}
          </span>
        )}
        {isFocused && (isPlaceholderVisible || isCaretAtEnd) && (
          <span className="inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] min-w-[1ch] animate-[blink_1s_step-start_infinite] bg-[var(--theme-text)] align-bottom text-[var(--theme-background)]" />
        )}
        {!isPlaceholderVisible && afterCaretText}
      </div>

      <div
        ref={measurementRef}
        className="break-anywhere pointer-events-none invisible absolute w-full overflow-auto break-words whitespace-pre-wrap"
      ></div>

      <textarea
        className="font-inherit absolute top-0 left-0 m-0 h-full w-full resize-none overflow-hidden border-none bg-transparent p-0 leading-[var(--theme-line-height-base)] text-transparent caret-transparent outline-none"
        ref={textAreaRef}
        value={textValue}
        aria-placeholder={placeholder}
        onFocus={onHandleFocus}
        onBlur={onHandleBlur}
        onKeyDown={onHandleKeyDown}
        onChange={onHandleChange}
        onSelect={onHandleSelect}
        onClick={onHandleClick}
        {...rest}
      />
    </div>
  );
};

export { Textarea };
