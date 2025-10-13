"use client";

import * as React from "react";
import { useControllableState } from "@radix-ui/react-use-controllable-state";

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
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    },
  });

  const textValue = String(text ?? "");

  const updateCaretPosition = React.useCallback(() => {
    if (!textAreaRef.current || !measureRef.current) return;
    const cursorPos = textAreaRef.current.selectionStart;
    setIsCaretAtEnd(cursorPos >= textValue.length);

    // Measure the width of text up to cursor position on the last line
    if (cursorPos >= textValue.length) {
      // Copy computed styles from textarea to measure element
      const styles = window.getComputedStyle(textAreaRef.current);
      measureRef.current.style.font = styles.font;
      measureRef.current.style.letterSpacing = styles.letterSpacing;
      measureRef.current.style.wordSpacing = styles.wordSpacing;
      measureRef.current.style.lineHeight = styles.lineHeight;

      const lines = textValue.split("\n");
      const lastLine = lines[lines.length - 1] ?? "";
      measureRef.current.textContent = lastLine || "";

      // Use getBoundingClientRect for more accurate measurements
      const measureRect = measureRef.current.getBoundingClientRect();

      // Get textarea's padding and border to position caret correctly
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const borderLeft = parseFloat(styles.borderLeftWidth) || 0;
      const paddingTop = parseFloat(styles.paddingTop) || 0;
      const borderTop = parseFloat(styles.borderTopWidth) || 0;

      // Calculate the height of all previous lines
      const scrollHeight = textAreaRef.current.scrollHeight;
      const paddingBottom = parseFloat(styles.paddingBottom) || 0;
      const borderBottom = parseFloat(styles.borderBottomWidth) || 0;
      const totalVerticalBorder = borderTop + borderBottom;
      const totalPadding = paddingTop + paddingBottom;
      const contentHeight = scrollHeight - totalPadding - totalVerticalBorder;

      // Position caret at the bottom line (last line of content)
      const lineHeight =
        parseFloat(styles.lineHeight) || parseFloat(styles.fontSize);
      const topPosition = paddingTop + borderTop + contentHeight - lineHeight;

      setCaretLeft(measureRect.width + paddingLeft + borderLeft);
      setCaretTop(topPosition);
    }
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
    setTimeout(updateCaretPosition, 0);
  };

  const onHandleSelect = () => {
    updateCaretPosition();
  };

  const onHandleFocus = () => {
    setIsFocused(true);
    updateCaretPosition();
  };

  const onHandleBlur = () => {
    setIsFocused(false);
  };

  const onHandleClick = () => {
    updateCaretPosition();
  };

  const onHandleKeyDown = () => {
    setTimeout(updateCaretPosition, 0);
  };

  const containerClasses = cn("relative", isFocused && "focused", className);

  return (
    <div className={containerClasses}>
      <textarea
        className={cn(
          "m-0 w-full resize-none border-none bg-transparent p-0 leading-[var(--theme-line-height-base)] outline-none",
          isFocused && isCaretAtEnd && "caret-transparent",
        )}
        ref={textAreaRef}
        value={textValue}
        placeholder={placeholder}
        onFocus={onHandleFocus}
        onBlur={onHandleBlur}
        onKeyDown={onHandleKeyDown}
        onChange={onHandleChange}
        onSelect={onHandleSelect}
        onClick={onHandleClick}
        {...rest}
      />
      <span
        ref={measureRef}
        className="invisible absolute whitespace-pre"
        aria-hidden="true"
      />
      {isFocused && isCaretAtEnd && (
        <span
          className="pointer-events-none absolute inline-block h-[calc(var(--font-size)*var(--theme-line-height-base))] min-w-[1ch] animate-[blink_1s_step-start_infinite] bg-[var(--theme-text)] align-bottom text-[var(--theme-background)]"
          style={{
            left: `${caretLeft}px`,
            top: `${caretTop}px`,
          }}
        />
      )}
    </div>
  );
};

export { Textarea };
