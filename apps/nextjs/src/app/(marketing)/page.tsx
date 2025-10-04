import { Logo } from "@repo/ui/logo";

import { ChatBotDemo } from "./_components/chatbot-demo";

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
          <ChatBotDemo 
            mode="demo"
            title="Demo Collection Chat"
            description="This demo queries the 'demo' collection for responses."
            placeholder="Ask a question about the demo collection..."
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Lorem Ipsum Generator</h2>
          <p className="text-sm text-gray-600 mb-4">
            This demo generates dynamic lorem ipsum text with customizable parameters.
          </p>
          <ChatBotDemo 
            mode="lorem"
            title="Lorem Ipsum Generator"
            description="This demo generates dynamic lorem ipsum text with customizable parameters."
            placeholder="Type any message to generate lorem ipsum..."
          />
        </div>
      </div>
    </main>
  );
};

export default Page;
