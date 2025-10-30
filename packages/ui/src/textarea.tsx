"use client";

import * as React from "react";
import clsx from "clsx";

import {
  renderOverlayContentTextarea,
  renderPlaceholder,
  useOverlayMirrorStyles,
  useSyncOverlayScroll,
} from "./input";

type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      value: controlled,
      defaultValue,
      onChange,
      className,
      placeholder,
      ...props
    },
    forwardedRef,
  ) {
    const [val, setVal] = React.useState<string>(defaultValue ?? "");
    const value = typeof controlled === "string" ? controlled : val;
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(forwardedRef, () => textareaRef.current!);

    const overlayRef = React.useRef<HTMLDivElement>(null);
    const [isFocused, setFocused] = React.useState<boolean>(false);
    const [caretIndex, setCaretIndex] = React.useState<number>(0);
    const [isComposing, setIsComposing] = React.useState<boolean>(false);

    useSyncOverlayScroll(
      textareaRef as React.RefObject<HTMLElement>,
      overlayRef as React.RefObject<HTMLElement>,
    );
    const overlayStyle = useOverlayMirrorStyles(textareaRef);

    const setIdx = (idx?: number | null) => {
      if (idx == null) return;
      if (!isComposing) setCaretIndex(idx);
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(true);
      setIdx(e.target.selectionStart);
      props.onFocus?.(e);
    };
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setFocused(false);
      props.onBlur?.(e);
    };
    const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      setIdx(e.currentTarget.selectionStart);
      props.onSelect?.(e);
    };
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setVal(newValue);
      setIdx(e.target.selectionStart);
      onChange?.(e);
    };
    const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      setIdx(e.currentTarget.selectionStart);
      props.onKeyUp?.(e);
    };
    const handleCompositionStart = () => setIsComposing(true);
    const handleCompositionEnd = (
      e: React.CompositionEvent<HTMLTextAreaElement>,
    ) => {
      setIsComposing(false);
      setIdx((e.target as HTMLTextAreaElement).selectionStart);
    };

    let overlayRender: React.ReactNode = null;
    if (!isFocused && value.length === 0 && placeholder) {
      overlayRender = renderPlaceholder(placeholder);
    } else {
      overlayRender = renderOverlayContentTextarea(
        value,
        caretIndex,
        isFocused,
      );
    }

    return (
      <div className="relative inline-block w-full">
        <textarea
          ref={textareaRef}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSelect={handleSelect}
          onChange={handleInput}
          onKeyUp={handleKeyUp}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className={clsx(
            "relative z-1 box-border w-full bg-inherit p-0 font-mono text-base leading-[1em] tracking-normal outline-none",
            "font-variant-numeric-tabular lining-nums",
            "[font-feature-settings:'tnum_1']",
            className,
          )}
          autoComplete="off"
          style={{ caretColor: "transparent", background: "transparent" }}
          {...props}
        />
        <div
          ref={overlayRef}
          className={clsx(
            "pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden font-mono text-base leading-[1em] tracking-normal whitespace-pre-wrap",
            className,
          )}
          aria-hidden
          style={{ zIndex: 10, ...overlayStyle }}
        >
          {overlayRender}
        </div>
      </div>
    );
  },
);
