"use client";

import type { UIMessage } from "ai";
import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@repo/ui/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageContent,
  MessageResponse,
} from "@repo/ui/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@repo/ui/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@repo/ui/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@repo/ui/ai-elements/sources";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@repo/ui/ai-elements/tool";
import { Spinner } from "@repo/ui/spinner";
import { getToolOrDynamicToolName, isToolOrDynamicToolUIPart } from "ai";

import type { Demo } from "./demo-data";
import type { PromptInputMessage } from "@repo/ui/ai-elements/prompt-input";

export const DemoChat = ({ demo }: { demo: Demo }) => {
  const [input, setInput] = useState(() => demo.preset ?? "");
  const { messages, sendMessage, status } = useChat({
    transport: demo.transport,
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text) return;
    const body: Record<string, unknown> = {};

    if (demo.id === "demo") {
      body.collectionId = "demo";
    }

    if (demo.id === "markdown") {
      body.markdown = text;
    }

    void sendMessage({ text }, { body });
    setInput(demo.preset ?? "");
  };

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="h-full">
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                <MessageParts parts={message.parts} messageId={message.id} />
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Spinner />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <PromptInput
        onSubmit={handleSubmit}
        inputGroupClassName="border-b-0 border-x-0"
      >
        <PromptInputBody className="h-[80px]">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit disabled={!input.trim()} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
};

type MessagePartsProps = {
  parts: UIMessage["parts"];
  messageId: string;
};

const MessageParts = ({ parts, messageId }: MessagePartsProps) => {
  // Group sources together
  const { otherParts, sourceParts } = useMemo(() => {
    const sources: (
      | { type: "source-url"; url: string; title?: string; sourceId?: string }
      | {
          type: "source-document";
          url?: string;
          title?: string;
          filename?: string;
          sourceId?: string;
        }
    )[] = [];
    const others: UIMessage["parts"] = [];

    for (const part of parts) {
      if (part.type === "source-url" || part.type === "source-document") {
        sources.push(part);
      } else {
        others.push(part);
      }
    }

    return { otherParts: others, sourceParts: sources };
  }, [parts]);

  return (
    <>
      {otherParts.map((part, i) => {
        const key = `${messageId}-${i}`;

        switch (part.type) {
          case "text":
            return <MessageResponse key={key}>{part.text}</MessageResponse>;

          case "reasoning":
            return (
              <Reasoning key={key}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );

          case "file":
            return <MessageAttachment key={key} data={part} className="mt-2" />;

          default:
            // Handle tool parts (tool-* and dynamic-tool)
            if (isToolOrDynamicToolUIPart(part)) {
              const toolName = getToolOrDynamicToolName(part);
              // ToolHeader expects tool-* format, so convert dynamic-tool
              const toolType: `tool-${string}` =
                part.type === "dynamic-tool" ? "tool-dynamic" : part.type;
              return (
                <Tool key={key}>
                  <ToolHeader
                    title={toolName}
                    type={toolType}
                    state={part.state}
                  />
                  <ToolContent>
                    {part.input !== undefined && (
                      <ToolInput input={part.input} />
                    )}
                    <ToolOutput
                      output={part.output}
                      errorText={part.errorText}
                    />
                  </ToolContent>
                </Tool>
              );
            }

            // Handle data-* parts (custom data parts)
            if (
              typeof part.type === "string" &&
              part.type.startsWith("data-")
            ) {
              return (
                <div
                  key={key}
                  className="border-border/70 bg-muted/40 text-muted-foreground rounded-md border p-2 text-xs"
                >
                  <div className="text-foreground mb-1 font-medium">
                    {part.type}
                  </div>
                  <pre className="bg-background text-foreground/90 max-h-40 overflow-auto rounded px-2 py-1 text-xs">
                    {JSON.stringify("data" in part ? part.data : part, null, 2)}
                  </pre>
                </div>
              );
            }

            return null;
        }
      })}

      {/* Render sources together if any exist */}
      {sourceParts.length > 0 && (
        <Sources>
          <SourcesTrigger count={sourceParts.length} />
          <SourcesContent>
            {sourceParts.map((source, i) => {
              const key = `${messageId}-source-${i}`;
              if (source.type === "source-url") {
                return (
                  <Source
                    key={key}
                    href={source.url}
                    title={source.title ?? source.url}
                  />
                );
              } else {
                // source-document
                return (
                  <Source
                    key={key}
                    href={source.url}
                    title={source.title ?? source.filename ?? "Document"}
                  />
                );
              }
            })}
          </SourcesContent>
        </Sources>
      )}
    </>
  );
};
