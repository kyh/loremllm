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
import { Response } from "@repo/ui/ai-elements/response";
import { BlockLoader } from "@repo/ui/block-loader";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";

import type { PromptInputMessage } from "@repo/ui/ai-elements/prompt-input";

export const LoremDemo = () => {
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
    api: "/api/lorem",
    initialBody: {
      ...loremParams,
    },
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
      {/* Parameter Controls */}
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

      <Conversation className="h-full">
        <ConversationContent>
          {messages.map((message) => (
            <div key={message.id}>
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
            placeholder="Type any message to generate lorem ipsum..."
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