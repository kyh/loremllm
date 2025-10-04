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
import { Card } from "@repo/ui/card";

import type { PromptInputMessage } from "@repo/ui/ai-elements/prompt-input";

interface ChatBotDemoProps {
  mode: "demo" | "lorem";
  title: string;
  description: string;
  placeholder?: string;
}

export const ChatBotDemo = ({ mode, title, description, placeholder }: ChatBotDemoProps) => {
  const [input, setInput] = useState("");
  const [loremParams, setLoremParams] = useState({
    count: 1,
    units: "sentences" as "words" | "sentences" | "paragraphs",
    paragraphLowerBound: 3,
    paragraphUpperBound: 7,
    sentenceLowerBound: 5,
    sentenceUpperBound: 15,
  });

  const { messages, sendMessage, status } = useChat({
    api: mode === "demo" ? "/api/chat" : "/api/lorem",
    initialBody: mode === "demo" 
      ? { id: "demo" } // Query the demo collection
      : { ...loremParams }, // Use lorem ipsum generation
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text) return;
    void sendMessage({ text });
    setInput("");
  };

  const updateParam = (key: string, value: any) => {
    setLoremParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-[520px] flex-col">
      {/* Parameter Controls for Lorem mode */}
      {mode === "lorem" && (
        <Card className="mb-4 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-medium mb-1">Count</label>
              <input
                type="number"
                min="1"
                value={loremParams.count}
                onChange={(e) => updateParam("count", parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Units</label>
              <select
                value={loremParams.units}
                onChange={(e) => updateParam("units", e.target.value)}
                className="w-full px-2 py-1 border rounded"
              >
                <option value="words">Words</option>
                <option value="sentences">Sentences</option>
                <option value="paragraphs">Paragraphs</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Sentence Min Words</label>
              <input
                type="number"
                min="1"
                value={loremParams.sentenceLowerBound}
                onChange={(e) => updateParam("sentenceLowerBound", parseInt(e.target.value) || 5)}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Sentence Max Words</label>
              <input
                type="number"
                min="1"
                value={loremParams.sentenceUpperBound}
                onChange={(e) => updateParam("sentenceUpperBound", parseInt(e.target.value) || 15)}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Paragraph Min Sentences</label>
              <input
                type="number"
                min="1"
                value={loremParams.paragraphLowerBound}
                onChange={(e) => updateParam("paragraphLowerBound", parseInt(e.target.value) || 3)}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Paragraph Max Sentences</label>
              <input
                type="number"
                min="1"
                value={loremParams.paragraphUpperBound}
                onChange={(e) => updateParam("paragraphUpperBound", parseInt(e.target.value) || 7)}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
          </div>
        </Card>
      )}

      <Conversation className="h-full">
        <ConversationContent>
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

      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
            placeholder={placeholder || "Type your message..."}
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
