"use client";

import type { ComponentProps, CSSProperties, HTMLAttributes } from "react";
import type { BundledLanguage, ThemedToken, TokensResult } from "shiki";
import { createContext, Fragment, useContext, useEffect, useMemo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { codeToTokens } from "shiki";

import { Button } from "@repo/ui/components/button";
import { cn } from "cn";
import { rendersContent } from "@repo/ui/lib/renders-content";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};

interface CodeBlockContextType {
  code: string;
}

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;
const FONT_STYLE_UNDERLINE = 4;
const FONT_STYLE_STRIKETHROUGH = 8;

const hasFontStyle = (fontStyle: number | undefined, flag: number) =>
  fontStyle !== undefined && fontStyle > 0 && Math.floor(fontStyle / flag) % 2 === 1;

const tokenStyle = (token: ThemedToken) => {
  const decorations = [
    hasFontStyle(token.fontStyle, FONT_STYLE_UNDERLINE) ? "underline" : "",
    hasFontStyle(token.fontStyle, FONT_STYLE_STRIKETHROUGH) ? "line-through" : "",
  ].filter((decoration) => decoration !== "");

  const style: CSSProperties = {
    color: token.color,
    fontStyle: hasFontStyle(token.fontStyle, FONT_STYLE_ITALIC) ? "italic" : undefined,
    fontWeight: hasFontStyle(token.fontStyle, FONT_STYLE_BOLD) ? "bold" : undefined,
    textDecoration: decorations.length > 0 ? decorations.join(" ") : undefined,
  };

  return style;
};

const lineOffsets = (code: string) => {
  const offsets: number[] = [];
  let next = 0;

  for (const line of code.split("\n")) {
    offsets.push(next);
    next += line.length + 1;
  }

  return offsets;
};

const HighlightedCode = ({
  code,
  result,
  showLineNumbers,
}: {
  code: string;
  result: TokensResult;
  showLineNumbers: boolean;
}) => {
  const offsets = lineOffsets(code);

  return (
    <pre style={{ backgroundColor: result.bg, color: result.fg }}>
      <code>
        {result.tokens.map((line, index) => (
          <Fragment key={offsets[index] ?? code.length}>
            {index > 0 && "\n"}
            <span className="line">
              {showLineNumbers && (
                <span className="text-muted-foreground mr-4 inline-block min-w-10 text-right select-none">
                  {index + 1}
                </span>
              )}
              {line.map((token) => (
                <span key={token.offset} style={tokenStyle(token)}>
                  {token.content}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </code>
    </pre>
  );
};

const highlightCode = async (code: string, language: BundledLanguage) =>
  await Promise.all([
    codeToTokens(code, { lang: language, theme: "one-light" }),
    codeToTokens(code, { lang: language, theme: "one-dark-pro" }),
  ]);

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [highlighted, setHighlighted] = useState<{
    code: string;
    dark: TokensResult;
    light: TokensResult;
  } | null>(null);

  const contextValue = useMemo(() => ({ code }), [code]);

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      const [light, dark] = await highlightCode(code, language);

      if (!cancelled) {
        setHighlighted({ code, dark, light });
      }
    };

    void highlight();

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <CodeBlockContext.Provider value={contextValue}>
      <div
        className={cn(
          "group bg-background text-foreground relative h-full w-full overflow-hidden",
          className,
        )}
        {...props}
      >
        <div className="relative">
          <div className="[&>pre]:bg-background! [&>pre]:text-foreground! overflow-hidden dark:hidden [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm">
            {highlighted && (
              <HighlightedCode
                code={highlighted.code}
                result={highlighted.light}
                showLineNumbers={showLineNumbers}
              />
            )}
          </div>
          <div className="[&>pre]:bg-background! [&>pre]:text-foreground! hidden overflow-hidden dark:block [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm">
            {highlighted && (
              <HighlightedCode
                code={highlighted.code}
                result={highlighted.dark}
                showLineNumbers={showLineNumbers}
              />
            )}
          </div>
          {rendersContent(children) && (
            <div className="absolute top-2 right-2 flex items-center gap-2">{children}</div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (!("navigator" in globalThis) || !("clipboard" in navigator)) {
      onError?.(new Error("Clipboard API not available"));

      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => {
        setIsCopied(false);
      }, timeout);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={() => {
        void copyToClipboard();
      }}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
