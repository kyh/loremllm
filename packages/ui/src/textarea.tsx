"use client";

import * as React from "react";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import clsx from "clsx";

import { cn } from "./utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  isBlink?: boolean;
};

const Textarea = ({
  isBlink = true,
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
  const [isFocused, setIsFocused] = React.useState<boolean>(false);
  const [selectionStart, setSelectionStart] = React.useState<number>(0);

  React.useEffect(() => {
    if (textAreaRef.current && isFocused) {
      textAreaRef.current.setSelectionRange(selectionStart, selectionStart);
    }
  }, [selectionStart, isFocused]);

  React.useEffect(() => {
    setSelectionStart(textValue.length);
  }, [textValue]);

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
    setSelectionStart(e.target.selectionStart || 0);
  };

  const onHandleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget as HTMLTextAreaElement;
    setSelectionStart(textarea.selectionStart);
  };

  const onHandleFocus = () => {
    setIsFocused(true);
    if (textAreaRef.current) {
      setSelectionStart(textAreaRef.current.selectionStart);
    }
  };

  const onHandleBlur = () => {
    setIsFocused(false);
  };

  const onHandleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget as HTMLTextAreaElement;
    textarea.focus();
    setSelectionStart(textarea.selectionStart);
  };

  React.useLayoutEffect(() => {
    if (!measurementRef.current) return;

    // Line counting removed - can be re-added if needed
  }, [text, selectionStart, placeholder]);

  const onHandleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Focus management removed - can be re-added if needed
  };

  const isPlaceholderVisible = !textValue && placeholder;

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
        {isPlaceholderVisible
          ? placeholder
          : textValue.substring(0, selectionStart)}
        <span
          className={clsx(
            "inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] min-w-[1ch] bg-[var(--theme-text)] align-bottom",
            isBlink && "animate-[blink_1s_step-start_infinite]",
          )}
        ></span>
        {!isPlaceholderVisible && textValue.substring(selectionStart)}
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
