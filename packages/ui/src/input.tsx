"use client";

import * as React from "react";
import clsx from "clsx";

// ---- Overlay utils (inlined here and exported) ----
export const CaretCell: React.FC<
  { caret?: boolean; char?: string } & React.HTMLAttributes<HTMLSpanElement>
> = ({ caret, char, className, style, ...rest }) => {
  return (
    <span
      className={clsx(
        "inline-block h-[1em] w-[1ch] text-center align-baseline",
        caret &&
          "block-cursor animate-[block-cursor-blink_1s_steps(1)_infinite_alternate] rounded-none bg-black text-white",
        className,
      )}
      style={style}
      {...rest}
    >
      {caret ? undefined : char === " " ? "\u00a0" : char}
    </span>
  );
};

export function renderPlaceholder(placeholder?: string): React.ReactNode {
  if (!placeholder) return null;
  return (
    <span className="text-[var(--theme-placeholder,theme(colors.gray.400))] italic opacity-70">
      {placeholder}
    </span>
  );
}

export function renderOverlayContentInput(
  value: string,
  caretIndex: number,
  isFocused: boolean,
): React.ReactNode {
  const cells = value.split("");
  const nodes: React.ReactNode[] = cells.map((c, i) =>
    i === caretIndex && isFocused ? (
      <CaretCell key={`c-${i}`} caret />
    ) : (
      <CaretCell key={`c-${i}`} char={c} />
    ),
  );
  if (isFocused && caretIndex === value.length)
    nodes.push(<CaretCell key="caret-end" caret />);
  return nodes;
}

export function renderOverlayContentTextarea(
  value: string,
  caretIndex: number,
  isFocused: boolean,
): React.ReactNode {
  const lines = value.split("\n");
  let flat = 0;
  const blocks: React.ReactNode[] = [];
  lines.forEach((line, lineIdx) => {
    line.split("").forEach((ch, i) => {
      const pos = flat;
      flat++;
      if (isFocused && pos === caretIndex)
        blocks.push(<CaretCell key={`c-${lineIdx}-${i}`} caret />);
      else blocks.push(<CaretCell key={`c-${lineIdx}-${i}`} char={ch} />);
    });
    if (isFocused && flat === caretIndex)
      blocks.push(<CaretCell key={`caret-end-${lineIdx}`} caret />);
    if (lineIdx < lines.length - 1) {
      flat++;
      blocks.push(<br key={`br-${lineIdx}`} />);
    }
  });
  return blocks;
}

export function useOverlayMirrorStyles<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
): React.CSSProperties {
  const [style, setStyle] = React.useState<React.CSSProperties>({});
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    setStyle({
      padding: cs.padding,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontVariant: cs.fontVariant,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      width: cs.width,
      whiteSpace: (cs.whiteSpace as any) || undefined,
    });
  }, [ref]);
  return style;
}

export function useSyncOverlayScroll<
  T extends HTMLElement,
  U extends HTMLElement,
>(fieldRef: React.RefObject<T>, overlayRef: React.RefObject<U>): void {
  React.useEffect(() => {
    const f = fieldRef.current;
    const o = overlayRef.current as unknown as HTMLElement | null;
    if (!f || !o) return;
    const onScroll = () => {
      o.scrollTop = (f as unknown as HTMLElement).scrollTop;
      o.scrollLeft = (f as unknown as HTMLElement).scrollLeft;
    };
    (f as unknown as HTMLElement).addEventListener("scroll", onScroll);
    onScroll();
    return () =>
      (f as unknown as HTMLElement).removeEventListener("scroll", onScroll);
  }, [fieldRef, overlayRef]);
}

// ---- Input component ----

type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
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
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(forwardedRef, () => inputRef.current!);

    const overlayRef = React.useRef<HTMLDivElement>(null);
    const [isFocused, setFocused] = React.useState<boolean>(false);
    const [caretIndex, setCaretIndex] = React.useState<number>(0);
    const [isComposing, setIsComposing] = React.useState<boolean>(false);

    useSyncOverlayScroll(
      inputRef as React.RefObject<HTMLElement>,
      overlayRef as React.RefObject<HTMLElement>,
    );
    const overlayStyle = useOverlayMirrorStyles(inputRef);

    const setIdx = (idx?: number | null) => {
      if (idx == null) return;
      if (!isComposing) setCaretIndex(idx);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      setIdx(e.target.selectionStart);
      props.onFocus?.(e);
    };
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      props.onBlur?.(e);
    };
    const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
      setIdx(e.currentTarget.selectionStart);
      props.onSelect?.(e);
    };
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setVal(newValue);
      setIdx(e.target.selectionStart);
      onChange?.(e);
    };
    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      setIdx(e.currentTarget.selectionStart);
      props.onKeyUp?.(e);
    };
    const handleCompositionStart = () => setIsComposing(true);
    const handleCompositionEnd = (
      e: React.CompositionEvent<HTMLInputElement>,
    ) => {
      setIsComposing(false);
      setIdx((e.target as HTMLInputElement).selectionStart);
    };

    let overlayRender: React.ReactNode;
    if (!isFocused && value.length === 0 && placeholder) {
      overlayRender = renderPlaceholder(placeholder);
    } else {
      overlayRender = renderOverlayContentInput(value, caretIndex, isFocused);
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
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className={clsx(
            "relative z-1 box-border w-full bg-inherit p-0 font-mono text-base leading-[1em] tracking-normal outline-none",
            "font-variant-numeric-tabular lining-nums",
            "[font-feature-settings:'tnum_1']",
            className,
          )}
          autoComplete="off"
          style={{
            caretColor: "transparent",
            background: "transparent",
            color: "transparent",
          }}
          {...props}
        />
        <div
          ref={overlayRef}
          className={clsx(
            "pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden font-mono text-base leading-[1em] tracking-normal",
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
