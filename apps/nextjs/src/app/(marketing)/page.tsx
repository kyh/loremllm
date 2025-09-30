import ChatBotDemo from "./_components/chatbot-demo";
import { WaitlistForm } from "./_components/waitlist-form";

const Page = () => {
  return (
    <main className="mt-8 flex flex-col gap-4">
      <h1>Mock APIs for LLMs</h1>
      <p>
        LoremLLM provides mock APIs for LLMs, making it easy to test and develop
        with large language models without the complexity of real API
        integrations.
      </p>
      <WaitlistForm />
      <div className="mt-3">
        <p>How it works:</p>
        <ol className="mt-2 list-inside list-decimal">
          <li>Choose from a variety of mock LLM API endpoints</li>
          <li>Configure your mock responses and behavior patterns</li>
          <li>Test your applications with realistic LLM interactions</li>
        </ol>
      </div>
      <p>
        Perfect for developers who need to test LLM integrations without relying
        on expensive API calls. Whether you're building chatbots, content
        generators, or AI-powered features – LoremLLM provides reliable mock
        responses for development and testing.
      </p>
      <section className="mt-10 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">See it in action</h2>
          <p className="text-sm text-muted-foreground">
            Chat with our lorem ipsum assistant powered by the public
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">/api/llm</code>
            endpoint. Every message you send here is served through the same API
            your apps can use.
          </p>
        </div>
        <ChatBotDemo />
      </section>
    </main>
  );
};

export default Page;
