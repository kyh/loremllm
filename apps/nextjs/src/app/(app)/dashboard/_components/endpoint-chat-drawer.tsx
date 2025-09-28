"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import type { DataUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/drawer";
import { Input } from "@repo/ui/input";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type TextPart = { type: "text"; text: string };

type ToolPart = {
  type: `tool-${string}` | "dynamic-tool";
  toolCallId: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

const isTextPart = (part: unknown): part is TextPart =>
  isRecord(part) && part.type === "text" && typeof part.text === "string";

const isToolPart = (part: unknown): part is ToolPart => {
  if (!isRecord(part)) {
    return false;
  }

  const type = part.type;
  const toolCallId = part.toolCallId;
  const toolName = part.toolName;

  if (type === "dynamic-tool") {
    return typeof toolCallId === "string" && typeof toolName === "string";
  }

  if (typeof type === "string" && type.startsWith("tool-")) {
    return typeof toolCallId === "string";
  }

  return false;
};

const roleLabel: Record<UIMessage["role"], string> = {
  system: "System",
  user: "You",
  assistant: "Assistant",
};

type EndpointChatDrawerProps = {
  endpointId: string;
  endpointName: string;
};

type MatchingMetadata = Record<string, unknown>;

type ChatPanelProps = EndpointChatDrawerProps & {
  open: boolean;
};

const mergeMetadata = (
  parts: MatchingMetadata | null,
  messageMetadata: MatchingMetadata | null,
) => {
  if (!parts && !messageMetadata) {
    return null;
  }

  const merged: MatchingMetadata = {};

  if (parts) {
    Object.assign(merged, parts);
  }

  if (messageMetadata) {
    Object.assign(merged, messageMetadata);
  }

  return Object.keys(merged).length ? merged : null;
};

const ChatPanel = (props: ChatPanelProps) => {
  const { endpointId, endpointName, open } = props;
  const [input, setInput] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [matchingParts, setMatchingParts] = useState<MatchingMetadata | null>(null);

  const handleData = useCallback((part: DataUIPart<MatchingMetadata>) => {
    if (!part.type.startsWith("data-matching")) {
      return;
    }

    setMatchingParts((previous) => {
      const next: MatchingMetadata = { ...(previous ?? {}) };

      if (isRecord(part.data)) {
        Object.assign(next, part.data as MatchingMetadata);
      } else if (part.id) {
        next[part.id] = part.data;
      }

      return next;
    });
  }, []);

  const handleFinish = useCallback((message: UIMessage) => {
    const metadata = message.metadata;

    if (isRecord(metadata)) {
      setMatchingParts((previous) => mergeMetadata(previous, metadata));
    }
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/${endpointId}/llm`,
      }),
    [endpointId],
  );

  const chat = useMemo(
    () =>
      new Chat({
        transport,
        onData: handleData,
        onFinish: ({ message }) => handleFinish(message),
      }),
    [transport, handleData, handleFinish],
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    stop,
    clearError,
  } = useChat({ chat });

  useEffect(() => {
    if (!open) {
      void stop();
    }
  }, [open, stop]);

  useEffect(() => {
    setMessages([]);
    setMatchingParts(null);
    setInput("");
    setClientError(null);
    clearError();
  }, [endpointId, setMessages, clearError]);

  useEffect(() => {
    if (status === "submitted") {
      setMatchingParts(null);
      setClientError(null);
    }
  }, [status]);

  useEffect(() => {
    if (error) {
      setClientError(error.message);
    }
  }, [error]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedInput = input.trim();

      if (!trimmedInput.length) {
        return;
      }

      setClientError(null);
      clearError();

      try {
        await sendMessage({ text: trimmedInput });
        setInput("");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unknown error";
        setClientError(message);
      }
    },
    [input, sendMessage, clearError],
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    setMatchingParts(null);
    setClientError(null);
    setInput("");
    clearError();
  }, [setMessages, clearError]);

  const latestAssistant = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === "assistant" && isRecord(message.metadata)),
    [messages],
  );

  const combinedMetadata = useMemo(
    () =>
      mergeMetadata(
        matchingParts,
        latestAssistant?.metadata && isRecord(latestAssistant.metadata)
          ? (latestAssistant.metadata as MatchingMetadata)
          : null,
      ),
    [matchingParts, latestAssistant?.metadata],
  );

  const similarity =
    typeof combinedMetadata?.similarity === "number" ? combinedMetadata.similarity : null;
  const matchedTitle =
    typeof combinedMetadata?.title === "string" ? combinedMetadata.title : null;
  const matchedInteractionId =
    typeof combinedMetadata?.interactionId === "string" ? combinedMetadata.interactionId : null;

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="rounded-md border border-dashed border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
        <div className="flex flex-col gap-1 text-foreground">
          <span className="font-medium">Endpoint ID</span>
          <code className="w-fit rounded bg-background/70 px-2 py-1 text-xs">{endpointId}</code>
        </div>
        <p className="mt-3 text-muted-foreground">
          Send a message to preview how <span className="font-medium">{endpointName}</span> responds.
          Messages are matched against your saved mock interactions.
        </p>
      </div>
      {combinedMetadata ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Matched interaction</span>
            {matchedTitle ? <span>{matchedTitle}</span> : null}
            <div className="flex flex-wrap items-center gap-2 text-primary/80">
              {similarity !== null ? (
                <span>
                  Similarity: <strong>{(similarity * 100).toFixed(1)}%</strong>
                </span>
              ) : null}
              {matchedInteractionId ? (
                <span className="truncate">
                  ID: <code>{matchedInteractionId}</code>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-border/60 bg-background/70 p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Ask a question to see the mocked assistant reply.
            </p>
          ) : (
            messages.map((message) => {
              const textParts = message.parts.filter(isTextPart) as TextPart[];
              const text = textParts.map((part) => part.text).join("").trim();
              const toolParts = message.parts.filter(isToolPart) as ToolPart[];

              return (
                <article
                  key={message.id}
                  className="space-y-2 rounded-md border border-border/70 bg-background p-3 text-sm shadow-sm"
                >
                  <header className="flex items-center justify-between">
                    <Badge variant="outline">{roleLabel[message.role]}</Badge>
                    {isRecord(message.metadata) ? (
                      <span className="text-xs text-muted-foreground">
                        metadata: {JSON.stringify(message.metadata)}
                      </span>
                    ) : null}
                  </header>
                  {text ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {text}
                    </p>
                  ) : null}
                  {toolParts.length ? (
                    <div className="space-y-2">
                      {toolParts.map((part, index) => (
                        <div
                          key={`${part.toolCallId}-${index}`}
                          className="rounded-md border border-border/70 bg-muted/40 p-2 text-xs text-muted-foreground"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{part.toolName ?? "Tool"}</span>
                            <code className="rounded bg-background px-1 py-0.5 text-[10px]">
                              {part.toolCallId}
                            </code>
                          </div>
                          {part.state ? (
                            <p className="mt-1 text-xs text-muted-foreground">State: {part.state}</p>
                          ) : null}
                          {part.input !== undefined ? (
                            <pre className="mt-2 max-h-40 overflow-auto rounded bg-background px-2 py-1 text-xs text-foreground/90">
                              {JSON.stringify(part.input, null, 2)}
                            </pre>
                          ) : null}
                          {part.output !== undefined ? (
                            <pre className="mt-2 max-h-40 overflow-auto rounded bg-background px-2 py-1 text-xs text-foreground/90">
                              {JSON.stringify(part.output, null, 2)}
                            </pre>
                          ) : null}
                          {part.errorText ? (
                            <p className="mt-1 text-xs text-destructive">{part.errorText}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>
      {clientError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {clientError}
        </div>
      ) : null}
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the mock assistant a question"
          disabled={isStreaming}
        />
        <Button type="submit" loading={isStreaming} disabled={isStreaming && !input.trim()}>
          Send
        </Button>
        {isStreaming ? (
          <Button type="button" variant="outline" onClick={() => void stop()}>
            Stop
          </Button>
        ) : null}
      </form>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
          Clear conversation
        </Button>
      </div>
    </div>
  );
};

export const EndpointChatDrawer = (props: EndpointChatDrawerProps) => {
  const { endpointId, endpointName } = props;
  const [open, setOpen] = useState(false);

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open chat</Button>
      </DrawerTrigger>
      <DrawerContent className="w-full sm:max-w-xl">
        <DrawerHeader className="border-b border-border/60 pb-4">
          <DrawerTitle>Chat with {endpointName}</DrawerTitle>
          <DrawerDescription>
            Preview mocked responses without leaving the dashboard.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-6 pt-4">
          <ChatPanel endpointId={endpointId} endpointName={endpointName} open={open} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
