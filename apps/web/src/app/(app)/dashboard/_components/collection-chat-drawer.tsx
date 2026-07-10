"use client";

import type { UIMessage } from "ai";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/components/drawer";
import { Input } from "@repo/ui/components/input";
import { MessageResponse } from "@repo/ui/components/ai-elements/message";
import { getToolOrDynamicToolName, isToolUIPart } from "ai";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const roleLabel: Record<UIMessage["role"], string> = {
  system: "System",
  user: "You",
  assistant: "Assistant",
};

type MatchMetadata = {
  interactionId: string | null;
  title: string | null;
  similarity: number | null;
};

const parseMatchMetadata = (metadata: unknown): MatchMetadata | null => {
  if (!isRecord(metadata)) {
    return null;
  }

  const interactionId = typeof metadata.interactionId === "string" ? metadata.interactionId : null;
  const title = typeof metadata.title === "string" ? metadata.title : null;
  const similarity = typeof metadata.similarity === "number" ? metadata.similarity : null;

  if (interactionId === null && title === null && similarity === null) {
    return null;
  }

  return { interactionId, title, similarity };
};

type CollectionChatDrawerProps = {
  collectionId: string;
  collectionName: string;
};

const ChatPanel = ({ collectionId, collectionName }: CollectionChatDrawerProps) => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, setMessages, stop, clearError } = useChat();

  const latestMatch = useMemo(() => {
    const latestAssistant = messages.toReversed().find((message) => message.role === "assistant");
    return parseMatchMetadata(latestAssistant?.metadata);
  }, [messages]);

  const isStreaming = status === "submitted" || status === "streaming";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput.length || isStreaming) {
      return;
    }

    clearError();
    setInput("");
    void sendMessage({ text: trimmedInput }, { body: { type: "chat", collectionId } });
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    clearError();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="border-border/60 bg-muted/40 text-muted-foreground rounded-md border border-dashed p-4 text-xs">
        <div className="text-foreground flex flex-col gap-1">
          <span className="font-medium">Collection ID</span>
          <code className="bg-background/70 w-fit rounded px-2 py-1 text-xs">{collectionId}</code>
        </div>
        <p className="text-muted-foreground mt-3">
          Send a message to preview how <span className="font-medium">{collectionName}</span>{" "}
          responds. Messages are matched against your saved mock interactions.
        </p>
      </div>
      {latestMatch ? (
        <div className="border-primary/30 bg-primary/5 text-primary rounded-md border p-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Matched interaction</span>
            {latestMatch.title ? <span>{latestMatch.title}</span> : null}
            <div className="text-primary/80 flex flex-wrap items-center gap-2">
              {latestMatch.similarity !== null ? (
                <span>
                  Similarity: <strong>{(latestMatch.similarity * 100).toFixed(1)}%</strong>
                </span>
              ) : null}
              {latestMatch.interactionId ? (
                <span className="truncate">
                  ID: <code>{latestMatch.interactionId}</code>
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
              const text = message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("")
                .trim();
              const toolParts = message.parts.filter(isToolUIPart);

              return (
                <article
                  key={message.id}
                  className="border-border/70 bg-background space-y-2 rounded-md border p-3 text-sm shadow-sm"
                >
                  <header className="flex items-center justify-between">
                    <Badge variant="outline">{roleLabel[message.role]}</Badge>
                  </header>
                  {text ? (
                    message.role === "assistant" ? (
                      <MessageResponse className="text-sm">{text}</MessageResponse>
                    ) : (
                      <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
                        {text}
                      </p>
                    )
                  ) : null}
                  {toolParts.length ? (
                    <div className="space-y-2">
                      {toolParts.map((part) => (
                        <div
                          key={part.toolCallId}
                          className="border-border/70 bg-muted/40 text-muted-foreground rounded-md border p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground font-medium">
                              {getToolOrDynamicToolName(part)}
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
                            <p className="text-destructive mt-1 text-xs">{part.errorText}</p>
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
      {error ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-xs">
          {error.message}
        </div>
      ) : null}
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the mock assistant a question"
          disabled={isStreaming}
        />
        <Button type="submit" loading={isStreaming} disabled={!isStreaming && !input.trim()}>
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
          {/* Keyed by collection so switching collections starts a fresh conversation */}
          <ChatPanel
            key={collectionId}
            collectionId={collectionId}
            collectionName={collectionName}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
