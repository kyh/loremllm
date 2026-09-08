"use client";

import type { ComponentProps, HTMLAttributes } from "react";
import type { BundledLanguage, ShikiTransformer } from "shiki";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { codeToHtml } from "shiki";

import { Button } from "@repo/ui/components/button";
import { cn } from "cn";

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

const lineNumberTransformer: ShikiTransformer = {
  line(node, line) {
    node.children.unshift({
      children: [{ type: "text", value: String(line) }],
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      tagName: "span",
      type: "element",
    });
  },
  name: "line-numbers",
};

const highlightCode = async (code: string, language: BundledLanguage, showLineNumbers = false) => {
  const transformers: ShikiTransformer[] = showLineNumbers ? [lineNumberTransformer] : [];

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: "one-light",
      transformers,
    }),
    codeToHtml(code, {
      lang: language,
      theme: "one-dark-pro",
      transformers,
    }),
  ]);
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [html, setHtml] = useState<string>("");
  const [darkHtml, setDarkHtml] = useState<string>("");
  const contextValue = useMemo(() => ({ code }), [code]);

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      const [light, dark] = await highlightCode(code, language, showLineNumbers);
      if (!cancelled) {
        setHtml(light);
        setDarkHtml(dark);
      }
    };
    void highlight();

    return () => {
      cancelled = true;
    };
  }, [code, language, showLineNumbers]);

  /* oxlint-disable react/no-danger -- Shiki escapes source code and returns trusted highlight markup */
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
          <div
            className="[&>pre]:bg-background! [&>pre]:text-foreground! overflow-hidden dark:hidden [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div
            className="[&>pre]:bg-background! [&>pre]:text-foreground! hidden overflow-hidden dark:block [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm"
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">{children}</div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
  /* oxlint-enable react/no-danger */
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
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
