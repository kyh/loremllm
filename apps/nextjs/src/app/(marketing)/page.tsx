import { Logo } from "@repo/ui/logo";

import { ChatBotDemo } from "./_components/chatbot-demo";

const Page = () => {
  return (
    <main className="mt-8 flex flex-col gap-8">
      <Logo />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Demo Collection Chat</h2>
          <p className="text-sm text-gray-600">
            This demo queries the "demo" collection for responses.
          </p>
          <ChatBotDemo mode="demo" />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Lorem Ipsum Generator</h2>
          <p className="text-sm text-gray-600">
            This demo generates dynamic lorem ipsum text with customizable
            parameters.
          </p>
          <ChatBotDemo mode="lorem" />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Markdown Streaming</h2>
          <p className="text-sm text-gray-600">
            Paste markdown to see it parsed and streamed back in real time.
          </p>
          <ChatBotDemo
            mode="markdown"
            preset={`# Release Highlights

- **Streaming markdown** with live updates
- Rendered exactly as you provide it
- Great for previewing documentation tweaks`}
          />
        </div>
      </div>
    </main>
  );
};

export default Page;
