"use client";

import { Fragment, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { copyMessagesToClipboard } from "@loremllm/transport/copy-messages-to-clipboard";
import { Message } from "@repo/ui/ai-elements/message";
import { Response } from "@repo/ui/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@repo/ui/ai-elements/tool";
import { BlockLoader } from "@repo/ui/block-loader";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { getToolOrDynamicToolName, isToolOrDynamicToolUIPart } from "ai";

const Page = () => {
  const { messages, sendMessage, status, error } = useChat({
    onFinish: copyMessagesToClipboard,
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const input = formData.get("message");
      const trimmedInput = typeof input === "string" ? input.trim() : "";
      if (!trimmedInput) return;

      // Send message with empty body to trigger lorem endpoint
      await sendMessage({ text: trimmedInput }, { body: {} });
      e.currentTarget.reset();
    },
    [sendMessage],
  );

  return (
    <div className="flex min-h-screen flex-col p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">
          Test copyMessagesToClipboard
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Send a message and when the assistant responds with lorem ipsum text,
          it will automatically copy the static transport template to your
          clipboard.
        </p>

        <div className="mb-6 flex flex-col gap-4">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No messages yet. Send a message to start the conversation.
            </p>
          ) : (
            messages.map((message) => (
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
                              {(part.output !== undefined ||
                                part.errorText) && (
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
            ))
          )}

          {status === "submitted" && <BlockLoader mode={1} />}
        </div>

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-md border p-3 text-sm">
            {error.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            name="message"
            placeholder="Type your message..."
            disabled={status === "submitted" || status === "streaming"}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={status === "submitted" || status === "streaming"}
          >
            {status === "submitted" || status === "streaming"
              ? "Sending..."
              : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Page;
