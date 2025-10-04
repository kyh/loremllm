import { Logo } from "@repo/ui/logo";

import { ChatBotDemo } from "./_components/chatbot-demo";

const Page = () => {
  return (
    <main className="mt-8 flex flex-col gap-8">
      <Logo />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Demo Collection Chat</h2>
          <p className="mb-4 text-sm text-gray-600">
            This demo queries the "demo" collection for responses.
          </p>
          <ChatBotDemo mode="demo" />
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Lorem Ipsum Generator</h2>
          <p className="mb-4 text-sm text-gray-600">
            This demo generates dynamic lorem ipsum text with customizable
            parameters.
          </p>
          <ChatBotDemo mode="lorem" />
        </div>
      </div>
    </main>
  );
};

export default Page;
