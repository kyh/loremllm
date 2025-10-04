import { Logo } from "@repo/ui/logo";
import { Card } from "@repo/ui/card";

import { ChatBotDemo } from "./_components/chatbot-demo";
import { LoremDemo } from "./_components/lorem-demo";

const Page = () => {
  return (
    <main className="mt-8 flex flex-col gap-8">
      <Logo />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Demo Collection Chat</h2>
          <p className="text-sm text-gray-600 mb-4">
            This demo queries the "demo" collection for responses.
          </p>
          <ChatBotDemo />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Lorem Ipsum Generator</h2>
          <p className="text-sm text-gray-600 mb-4">
            This demo generates dynamic lorem ipsum text with customizable parameters.
          </p>
          <LoremDemo />
        </div>
      </div>
    </main>
  );
};

export default Page;
