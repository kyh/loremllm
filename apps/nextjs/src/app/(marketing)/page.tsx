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
    </main>
  );
};

export default Page;
