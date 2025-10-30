"use client";

import * as React from "react";
import clsx from "clsx";

type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

export const Input: React.FC<InputProps> = ({
  value: controlled,
  defaultValue,
  onChange,
  className,
  placeholder,
  ...props
}) => {
  const [val, setVal] = React.useState(defaultValue ?? "");
  const value = typeof controlled === "string" ? controlled : val;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setFocused] = React.useState(false);
  const [caretIndex, setCaretIndex] = React.useState(0);

  // Sync overlay scroll with input scroll (should be no effect for non-scrollable input)
  React.useEffect(() => {
    if (!inputRef.current || !overlayRef.current) return;
    overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
  }, [value]);

  // Dynamically copy padding, font, and other computed styles
  const [overlayStyle, setOverlayStyle] = React.useState<React.CSSProperties>(
    {},
  );
  React.useLayoutEffect(() => {
    if (!inputRef.current) return;
    const cs = window.getComputedStyle(inputRef.current);
    setOverlayStyle({
      padding: cs.padding,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontVariant: cs.fontVariant,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      width: cs.width, // For absolute overlay match to input size
    });
  }, [isFocused, className, value]);

  // Handler: Tracks caret index reliably
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    setCaretIndex(e.target.selectionStart ?? 0);
    props.onFocus?.(e);
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    props.onBlur?.(e);
  };
  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCaretIndex(e.currentTarget.selectionStart ?? 0);
    props.onSelect?.(e);
  };
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setVal(newValue);
    setCaretIndex(e.target.selectionStart ?? 0);
    onChange?.(e);
  };
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCaretIndex(e.currentTarget.selectionStart ?? 0);
    props.onKeyUp?.(e);
  };

  // Overlay: render value+caret (or placeholder if empty+not focused)
  let overlayRender: React.ReactNode;
  if (!isFocused && value.length === 0 && placeholder) {
    overlayRender = (
      <span className="text-[var(--theme-placeholder,theme(colors.gray.400))] italic opacity-70">
        {placeholder}
      </span>
    );
  } else {
    const cells = value.split("");
    overlayRender = cells.map((c, i) =>
      i === caretIndex && isFocused ? (
        <span
          key={`caret-${i}`}
          className="block-cursor animate-[block-cursor-blink_1s_steps(1)_infinite_alternate] rounded-none bg-black text-white"
          style={{
            display: "inline-block",
            width: "1ch",
            height: "1em",
            textAlign: "center",
          }}
        >
          {c === " " ? "\u00a0" : c}
        </span>
      ) : (
        <span
          key={i}
          style={{ display: "inline-block", width: "1ch", height: "1em" }}
        >
          {c === " " ? "\u00a0" : c}
        </span>
      ),
    );
    if (caretIndex === value.length && isFocused) {
      overlayRender = [
        ...overlayRender,
        <span
          key="caret-phantom"
          className="block-cursor animate-[block-cursor-blink_1s_steps(1)_infinite_alternate] rounded-none bg-black text-white"
          style={{
            display: "inline-block",
            width: "1ch",
            height: "1em",
            textAlign: "center",
          }}
        />,
      ];
    }
  }

  return (
    <div className="relative inline-block w-full">
      <input
        ref={inputRef}
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
          "pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden font-mono text-base leading-[1em] tracking-normal",
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
