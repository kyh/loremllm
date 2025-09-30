import { Logo } from "@repo/ui/logo";

import { ChatBotDemo } from "./_components/chatbot-demo";

const Page = () => {
  return (
    <main className="mt-8 flex flex-col gap-4">
      <Logo />
      <ChatBotDemo />
    </main>
  );
};

export default Page;
