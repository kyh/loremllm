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
import { BlockLoader } from "@repo/ui/block-loader";

import type { PromptInputMessage } from "@repo/ui/ai-elements/prompt-input";

type ChatMode = "demo" | "lorem" | "markdown";

type ChatBotDemoProps = {
  mode: ChatMode;
  preset?: string;
};

export const ChatBotDemo = ({ mode, preset }: ChatBotDemoProps) => {
  const [input, setInput] = useState(() => preset ?? "");
  const { messages, sendMessage, status } = useChat({});

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

  const placeholder = (() => {
    switch (mode) {
      case "demo":
        return "Ask the demo collection a question";
      case "lorem":
        return "Describe the lorem ipsum you'd like";
      case "markdown":
        return "Paste markdown to stream it back";
    }
  })();

  return (
    <div className="flex flex-1 flex-col">
      <Conversation className="h-full">
        <ConversationContent className="h-[300px]">
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
