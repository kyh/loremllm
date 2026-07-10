"use client";

import { CodeBlock, CodeBlockCopyButton } from "@repo/ui/components/ai-elements/code-block";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { siteConfig } from "@/lib/site-config";

type EndpointCardProps = {
  publicId: string;
  isPublic: boolean;
};

const buildChatSnippet = (
  publicId: string,
) => `const response = await fetch("${siteConfig.url}/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "chat",
    collectionId: "${publicId}",
    messages: [
      { role: "user", parts: [{ type: "text", text: "Hello" }] },
    ],
  }),
});
// Streams a UI message response (AI SDK compatible)`;

const buildEveSnippet = (publicId: string) => `import { useEveAgent } from "eve/react";

const agent = useEveAgent({
  host: "${siteConfig.url}/api/eve/${publicId}",
});
// Streams eve agent events — works with eve/client too`;

export const EndpointCard = ({ publicId, isPublic }: EndpointCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Endpoint</CardTitle>
        <CardDescription>
          {isPublic
            ? "Point your AI SDK or eve app at this collection — messages are matched against your mocks and streamed back."
            : "This collection is private. Make it public to call the endpoint from outside the dashboard."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">AI SDK</p>
          <CodeBlock code={buildChatSnippet(publicId)} language="typescript">
            <CodeBlockCopyButton />
          </CodeBlock>
        </div>
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">eve</p>
          <CodeBlock code={buildEveSnippet(publicId)} language="typescript">
            <CodeBlockCopyButton />
          </CodeBlock>
        </div>
      </CardContent>
    </Card>
  );
};
