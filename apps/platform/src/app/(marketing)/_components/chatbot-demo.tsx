"use client";

import { Fragment, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@repo/ui/ai-elements/conversation";
import { Message } from "@repo/ui/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@repo/ui/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@repo/ui/ai-elements/reasoning";
import { Response } from "@repo/ui/ai-elements/response";
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
import { BlockLoader } from "@repo/ui/block-loader";
import { getToolOrDynamicToolName, isToolOrDynamicToolUIPart } from "ai";

import type { StaticChatTransport } from "@loremllm/transport";
import type { PromptInputMessage } from "@repo/ui/ai-elements/prompt-input";

type ChatBotDemoProps = {
  mode: string;
  placeholder?: string;
  preset?: string;
  transport?: StaticChatTransport;
};

export const ChatBotDemo = ({
  mode,
  placeholder,
  preset,
  transport,
}: ChatBotDemoProps) => {
  const [input, setInput] = useState(() => preset ?? "");
  const { messages, sendMessage, status } = useChat({
    transport,
  });

  console.log("messages", messages);

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text) return;
    const body: Record<string, unknown> = {};

    if (mode === "demo") {
      body.collectionId = "demo";
    }

    if (mode === "markdown") {
      body.markdown = text;
    }

    void sendMessage({ text }, { body });
    setInput(preset ?? "");
  };

  return (
    <div className="flex flex-1 flex-col">
      <Conversation className="h-full">
        <ConversationContent className="h-[300px]">
          {/* <header className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs uppercase">
                  {activeDemo.id === "demo"
                    ? "Collection"
                    : activeDemo.id === "lorem"
                      ? "Generator"
                      : "Streaming"}
                </span>
                <h1 className="text-xl font-semibold">{activeDemo.title}</h1>
                <p className="text-muted-foreground text-sm">
                  {activeDemo.description}
                </p>
              </header> */}
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "assistant" &&
                message.parts.filter((part) => part.type === "source-url")
                  .length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === "source-url",
                        ).length
                      }
                    />
                    {message.parts
                      .filter((part) => part.type === "source-url")
                      .map((part, i) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            key={`${message.id}-${i}`}
                            href={part.url}
                            title={part.url}
                          />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <Fragment key={`${message.id}-${i}`}>
                        <Message from={message.role}>
                          <Response>{part.text}</Response>
                        </Message>
                      </Fragment>
                    );
                  case "reasoning":
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={
                          status === "streaming" &&
                          i === message.parts.length - 1 &&
                          message.id === messages.at(-1)?.id
                        }
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  default:
                    // Check if it's a tool part
                    if (isToolOrDynamicToolUIPart(part)) {
                      // part is now narrowed to ToolUIPart
                      const toolName = getToolOrDynamicToolName(part);
                      return (
                        <Tool key={`${message.id}-tool-${part.toolCallId}`}>
                          <ToolHeader
                            title={toolName}
                            type={part.type as `tool-${string}`}
                            state={part.state}
                          />
                          <ToolContent>
                            {part.input !== undefined && (
                              <ToolInput input={part.input} />
                            )}
                            {(part.output !== undefined || part.errorText) && (
                              <ToolOutput
                                output={part.output}
                                errorText={part.errorText}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                }
              })}
            </div>
          ))}
          {status === "submitted" && <BlockLoader mode={1} />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit} className="mt-4 border-t pt-4">
        <PromptInputBody className="h-[100px]">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            value={input}
          />
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools />
          <PromptInputSubmit disabled={!input.trim()} status={status} />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
};
