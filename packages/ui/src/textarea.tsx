"use client";

import * as React from "react";
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
  ...rest
}: TextareaProps) => {
  const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const measurementRef = React.useRef<HTMLDivElement | null>(null);

  const [text, setText] = React.useState<string>(
    rest.defaultValue?.toString() ?? rest.value?.toString() ?? "",
  );
  const [isFocused, setIsFocused] = React.useState<boolean>(false);
  const [selectionStart, setSelectionStart] = React.useState<number>(0);

  React.useEffect(() => {
    if (textAreaRef.current && isFocused) {
      textAreaRef.current.setSelectionRange(selectionStart, selectionStart);
    }
  }, [selectionStart, isFocused]);

  React.useEffect(() => {
    if (rest.value !== undefined) {
      const val = rest.value.toString();
      setText(val);
      setSelectionStart(val.length);
    }
  }, [rest.value]);

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
    if (onChange) {
      onChange(e);
    }
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

  const isPlaceholderVisible = !text && placeholder;

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
        {isPlaceholderVisible ? placeholder : text.substring(0, selectionStart)}
        {!isPlaceholderVisible && (
          <span
            className={clsx(
              "inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] min-w-[1ch] bg-[var(--theme-text)] align-bottom",
              isBlink && "animate-[blink_1s_step-start_infinite]",
            )}
          ></span>
        )}
        {!isPlaceholderVisible && text.substring(selectionStart)}
      </div>

      <div
        ref={measurementRef}
        className="break-anywhere pointer-events-none invisible absolute w-full overflow-auto break-words whitespace-pre-wrap"
      ></div>

      <textarea
        className="font-inherit absolute top-0 left-0 m-0 h-full w-full resize-none overflow-hidden border-none bg-transparent p-0 leading-[var(--theme-line-height-base)] text-transparent caret-transparent outline-none"
        ref={textAreaRef}
        value={text}
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
