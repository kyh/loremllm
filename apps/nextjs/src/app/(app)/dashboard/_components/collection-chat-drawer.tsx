"use client";

import type { DataUIPart, UIMessage } from "ai";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat, useChat } from "@ai-sdk/react";
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
import { DefaultChatTransport } from "ai";

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

type CollectionChatDrawerProps = {
  collectionId: string;
  collectionName: string;
};

type MatchingMetadata = Record<string, unknown>;

type ChatPanelProps = CollectionChatDrawerProps & {
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
  const { collectionId, collectionName, open } = props;
  const [input, setInput] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [matchingParts, setMatchingParts] = useState<MatchingMetadata | null>(
    null,
  );

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
        api: "/api/llm",
        prepareSendMessagesRequest: ({ body, headers }) => ({
          body: body ?? {},
          headers: {
            ...headers,
            "x-collection-id": collectionId,
          },
        }),
      }),
    [collectionId],
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
  }, [collectionId, setMessages, clearError]);

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
        const message =
          cause instanceof Error ? cause.message : "Unknown error";
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
        .find(
          (message) =>
            message.role === "assistant" && isRecord(message.metadata),
        ),
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
    typeof combinedMetadata?.similarity === "number"
      ? combinedMetadata.similarity
      : null;
  const matchedTitle =
    typeof combinedMetadata?.title === "string" ? combinedMetadata.title : null;
  const matchedInteractionId =
    typeof combinedMetadata?.interactionId === "string"
      ? combinedMetadata.interactionId
      : null;

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="border-border/60 bg-muted/40 text-muted-foreground rounded-md border border-dashed p-4 text-xs">
        <div className="text-foreground flex flex-col gap-1">
          <span className="font-medium">Collection ID</span>
          <code className="bg-background/70 w-fit rounded px-2 py-1 text-xs">
            {collectionId}
          </code>
        </div>
        <p className="text-muted-foreground mt-3">
          Send a message to preview how{" "}
          <span className="font-medium">{collectionName}</span> responds.
          Messages are matched against your saved mock interactions.
        </p>
      </div>
      {combinedMetadata ? (
        <div className="border-primary/30 bg-primary/5 text-primary rounded-md border p-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Matched interaction</span>
            {matchedTitle ? <span>{matchedTitle}</span> : null}
            <div className="text-primary/80 flex flex-wrap items-center gap-2">
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
        <div className="border-border/60 bg-background/70 flex-1 space-y-3 overflow-y-auto rounded-md border p-3">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No messages yet. Ask a question to see the mocked assistant reply.
            </p>
          ) : (
            messages.map((message) => {
              const textParts = message.parts.filter(isTextPart) as TextPart[];
              const text = textParts
                .map((part) => part.text)
                .join("")
                .trim();
              const toolParts = message.parts.filter(isToolPart) as ToolPart[];

              return (
                <article
                  key={message.id}
                  className="border-border/70 bg-background space-y-2 rounded-md border p-3 text-sm shadow-sm"
                >
                  <header className="flex items-center justify-between">
                    <Badge variant="outline">{roleLabel[message.role]}</Badge>
                    {isRecord(message.metadata) ? (
                      <span className="text-muted-foreground text-xs">
                        metadata: {JSON.stringify(message.metadata)}
                      </span>
                    ) : null}
                  </header>
                  {text ? (
                    <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
                      {text}
                    </p>
                  ) : null}
                  {toolParts.length ? (
                    <div className="space-y-2">
                      {toolParts.map((part, index) => (
                        <div
                          key={`${part.toolCallId}-${index}`}
                          className="border-border/70 bg-muted/40 text-muted-foreground rounded-md border p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground font-medium">
                              {part.toolName ?? "Tool"}
                            </span>
                            <code className="bg-background rounded px-1 py-0.5 text-[10px]">
                              {part.toolCallId}
                            </code>
                          </div>
                          {part.state ? (
                            <p className="text-muted-foreground mt-1 text-xs">
                              State: {part.state}
                            </p>
                          ) : null}
                          {part.input !== undefined ? (
                            <pre className="bg-background text-foreground/90 mt-2 max-h-40 overflow-auto rounded px-2 py-1 text-xs">
                              {JSON.stringify(part.input, null, 2)}
                            </pre>
                          ) : null}
                          {part.output !== undefined ? (
                            <pre className="bg-background text-foreground/90 mt-2 max-h-40 overflow-auto rounded px-2 py-1 text-xs">
                              {JSON.stringify(part.output, null, 2)}
                            </pre>
                          ) : null}
                          {part.errorText ? (
                            <p className="text-destructive mt-1 text-xs">
                              {part.errorText}
                            </p>
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
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-xs">
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
        <Button
          type="submit"
          loading={isStreaming}
          disabled={isStreaming && !input.trim()}
        >
          Send
        </Button>
        {isStreaming ? (
          <Button type="button" variant="outline" onClick={() => void stop()}>
            Stop
          </Button>
        ) : null}
      </form>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
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

export const CollectionChatDrawer = (props: CollectionChatDrawerProps) => {
  const { collectionId, collectionName } = props;
  const [open, setOpen] = useState(false);

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open chat</Button>
      </DrawerTrigger>
      <DrawerContent className="w-full sm:max-w-xl">
        <DrawerHeader className="border-border/60 border-b pb-4">
          <DrawerTitle>Chat with {collectionName}</DrawerTitle>
          <DrawerDescription>
            Preview mocked responses without leaving the dashboard.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-4 pb-6">
          <ChatPanel
            collectionId={collectionId}
            collectionName={collectionName}
            open={open}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
