"use client";

import * as React from "react";
import clsx from "clsx";

type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
};

export const Textarea: React.FC<TextareaProps> = ({
  value: controlled,
  defaultValue,
  onChange,
  className,
  placeholder,
  ...props
}) => {
  const [val, setVal] = React.useState(defaultValue ?? "");
  const value = typeof controlled === "string" ? controlled : val;
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setFocused] = React.useState(false);
  const [caretIndex, setCaretIndex] = React.useState(0);

  // Sync overlay scroll with textarea scroll
  React.useEffect(() => {
    const ta = textareaRef.current,
      ov = overlayRef.current;
    if (ta && ov) {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    }
  }, [value, isFocused]);

  // Dynamically copy padding, font, and other computed styles
  const [overlayStyle, setOverlayStyle] = React.useState<React.CSSProperties>(
    {},
  );
  React.useLayoutEffect(() => {
    if (!textareaRef.current) return;
    const cs = window.getComputedStyle(textareaRef.current);
    setOverlayStyle({
      padding: cs.padding,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontVariant: cs.fontVariant,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      width: cs.width,
      whiteSpace: "pre-wrap",
    });
  }, [isFocused, className, value]);

  // Handlers update caret position and value
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocused(true);
    setCaretIndex(e.target.selectionStart);
    props.onFocus?.(e);
  };
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocused(false);
    props.onBlur?.(e);
  };
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCaretIndex(e.currentTarget.selectionStart);
    props.onSelect?.(e);
  };
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setVal(newValue);
    setCaretIndex(e.target.selectionStart);
    onChange?.(e);
  };
  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setCaretIndex(e.currentTarget.selectionStart);
    props.onKeyUp?.(e);
  };

  // Overlay: Split lines, then chars for each line. Place caret block.
  let overlayRender: React.ReactNode = null;
  if (!isFocused && value.length === 0 && placeholder) {
    overlayRender = (
      <span className="text-[var(--theme-placeholder,theme(colors.gray.400))] italic opacity-70">
        {placeholder}
      </span>
    );
  } else {
    const lines = value.split("\n");
    let flatCaret = 0;
    overlayRender = lines.map((line, lineIdx) => {
      const chars = line.split("");
      const result = chars.map((ch, i) => {
        const absolutePos = flatCaret;
        flatCaret++;
        if (absolutePos === caretIndex && isFocused) {
          return (
            <span
              key={`caret-${lineIdx}-${i}`}
              className="block-cursor animate-[block-cursor-blink_1s_steps(1)_infinite_alternate] rounded-none bg-black text-white"
              style={{
                display: "inline-block",
                width: "1ch",
                height: "1em",
                textAlign: "center",
              }}
            >
              {ch === " " ? "\u00a0" : ch}
            </span>
          );
        }
        return (
          <span
            key={i}
            style={{ display: "inline-block", width: "1ch", height: "1em" }}
          >
            {ch === " " ? "\u00a0" : ch}
          </span>
        );
      });
      if (flatCaret === caretIndex && isFocused) {
        result.push(
          <span
            key={`caret-phantom-${lineIdx}`}
            className="block-cursor animate-[block-cursor-blink_1s_steps(1)_infinite_alternate] rounded-none bg-black text-white"
            style={{
              display: "inline-block",
              width: "1ch",
              height: "1em",
              textAlign: "center",
            }}
          />,
        );
      }
      flatCaret++;
      return (
        <React.Fragment key={`line-${lineIdx}`}>
          {result}
          {lineIdx < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      );
    });
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
      {/* Overlay caret and text */}
      <div
        ref={overlayRef}
        className={clsx(
          "pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden font-mono text-base leading-[1em] tracking-normal whitespace-pre-wrap",
          className,
        )}
        aria-hidden
        style={{
          zIndex: 10,
          ...overlayStyle,
        }}
      >
        {overlayRender}
      </div>
    </div>
  );
};
