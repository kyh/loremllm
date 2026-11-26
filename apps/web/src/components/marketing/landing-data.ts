import { pageLinks } from "@/lib/agent/markdown";
import { siteConfig } from "@/lib/site-config";

export type CoverMotif = "stack" | "wave" | "branch" | "loop" | "grid" | "split";

export interface Fact {
  label: string;
  value: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  motif: CoverMotif;
  facts: Fact[];
}

export interface Capability {
  title: string;
  description: string;
}

export const coreFeatures: Feature[] = [
  {
    description:
      "OpenAI, Anthropic and AI SDK compatible out of the box. Change one base URL and your client never knows the difference.",
    facts: [
      { label: "Formats", value: "OpenAI, Anthropic, AI SDK" },
      { label: "Setup", value: "One base URL" },
      { label: "Auth", value: "Any key works" },
    ],
    id: "providers",
    motif: "split",
    title: "Drop-in endpoints",
  },
  {
    description:
      "Real server-sent events, chunk by chunk. Dial in time to first token, chunk size and speed, or add jitter on purpose.",
    facts: [
      { label: "Transport", value: "SSE" },
      { label: "Controls", value: "First token, delay, size" },
      { label: "Patterns", value: "Steady, bursty, jitter" },
    ],
    id: "streaming",
    motif: "wave",
    title: "Realistic streaming",
  },
  {
    description:
      "Fixed text, templates or generated lorem. The same request gets the same answer, token for token, on every run.",
    facts: [
      { label: "Replies", value: "Text, template, lorem" },
      { label: "Matching", value: "Exact, regex, semantic" },
      { label: "Output", value: "Deterministic" },
    ],
    id: "scripted",
    motif: "stack",
    title: "Scripted replies",
  },
  {
    description:
      "Canned arguments, tool results and the final answer, across as many turns as your agent loop needs.",
    facts: [
      { label: "Parts", value: "Call, result, answer" },
      { label: "Turns", value: "Multi turn" },
      { label: "Protocols", value: "Function calling, MCP" },
    ],
    id: "tools",
    motif: "branch",
    title: "Tool calls",
  },
];

export const capabilities: Capability[] = [
  {
    description:
      "Spin up a fake MCP server with tools, resources and prompts. Point any client at its URL.",
    title: "Mock MCP servers",
  },
  {
    description:
      "Match on prompt text, regex or turn number, then play replies in order per conversation.",
    title: "Scenarios",
  },
  {
    description:
      "Send a JSON schema, get back valid JSON that fits it. Fixed values or generated ones.",
    title: "Structured output",
  },
  {
    description:
      "429s, timeouts, malformed chunks and streams that die halfway. On demand, every time.",
    title: "Error injection",
  },
  {
    description:
      "Thinking blocks, token usage and cost on every response, shaped like the real thing.",
    title: "Reasoning and usage",
  },
  {
    description: "Proxy real model traffic once, save it as a mock, replay it forever for free.",
    title: "Record and replay",
  },
  {
    description:
      "Every request your code made, which scenario answered it, and what streamed back.",
    title: "Request inspector",
  },
  {
    description: "Shared projects and mock URLs the whole team, and your CI, can point at.",
    title: "Team projects",
  },
  {
    description: "Run any mock locally with one command. Same scenarios, zero network.",
    title: "Local server",
  },
];

export interface Step {
  title: string;
  description: string;
}

export const steps: Step[] = [
  {
    description: "Describe replies, tool calls and failures in the dashboard or a config file.",
    title: "Create a mock",
  },
  {
    description: "Point your OpenAI, Anthropic or AI SDK client at your mock URL. Keep your code.",
    title: "Swap the base URL",
  },
  {
    description: "Build UIs before the backend exists. Run agent tests that never flake.",
    title: "Ship",
  },
];

export interface Package {
  name: string;
  description: string;
  href: string;
}

export const packages: Package[] = [
  {
    description:
      "Chat transport and language model for the Vercel AI SDK. Stream mocks into useChat with no network.",
    name: "@loremllm/ai-sdk",
    href: "/docs/packages/ai-sdk",
  },
  {
    description: "Serve scripted turns over the eve agent protocol from any server.",
    name: "@loremllm/eve",
    href: "/docs/packages/eve",
  },
  {
    description: "Mock fetch for the OpenAI SDK. Chat completions, responses and tool calls.",
    name: "@loremllm/openai",
    href: "/docs/packages/openai",
  },
  {
    description: "Mock fetch for the Anthropic SDK. Messages, streaming and tool use.",
    name: "@loremllm/anthropic",
    href: "/docs/packages/anthropic",
  },
  {
    description: "A fake MCP server you configure in code. Tools, resources and prompts.",
    name: "@loremllm/mcp",
    href: "/docs/packages/mcp",
  },
  {
    description: "Record real LLM and MCP traffic, then replay it as a mock.",
    name: "@loremllm/record",
    href: "/docs/packages/record",
  },
  {
    description: "Vitest and Jest helpers. Scenario setup and matchers like toHaveRequestedTool.",
    name: "@loremllm/test",
    href: "/docs/packages/test",
  },
  {
    description: "Run mocks locally, pull them from your project and record from the terminal.",
    name: "loremllm",
    href: "/docs/packages/cli",
  },
];

export interface StreamEvent {
  at: number;
  kind: string;
  body: string;
}

export const heroStream: StreamEvent[] = [
  { at: 0, body: 'POST /v1/chat/completions  "Refund order A-1042"', kind: "request" },
  { at: 240, body: "Look up the order, then refund it.", kind: "reasoning" },
  { at: 520, body: 'lookupOrder({ id: "A-1042" })', kind: "tool call" },
  { at: 760, body: '{ status: "delivered", total: 48 }', kind: "tool result" },
  { at: 980, body: 'refund({ id: "A-1042", amount: 48 })', kind: "tool call" },
  { at: 1200, body: "{ ok: true }", kind: "tool result" },
  { at: 1420, body: "Done. $48 is on its way back to your card.", kind: "text" },
  { at: 1900, body: "42 in, 18 out, $0.00", kind: "usage" },
];

export interface ScenarioRow {
  trigger: string;
  reply: string;
}

export const scenarioRows: ScenarioRow[] = [
  { reply: "Call lookupOrder, then refund", trigger: 'Prompt has "refund"' },
  { reply: "Reply with the order summary", trigger: "Second turn" },
  { reply: "Call getWeather with the city", trigger: "Matches /weather in (\\w+)/" },
  { reply: "Return 429 after two chunks", trigger: "Header loremllm-scenario: rate-limit" },
  { reply: "Stream 40 words of lorem", trigger: "Anything else" },
];

export const agentTestCode = `import { mockLLM, text, toolCall } from "@loremllm/test";

test("refunds a delivered order", async () => {
  await using llm = await mockLLM("support-bot");

  llm.on(/refund/i).replyOnce(
    toolCall("lookupOrder", { id: "A-1042" }),
  );
  llm.on({ toolResult: "lookupOrder" }).replyOnce(
    toolCall("refund", { id: "A-1042", amount: 48 }),
  );
  llm.on({ toolResult: "refund" }).reply(
    text("Done. $48 is on its way back."),
  );

  await agent.run("Refund order A-1042", {
    baseURL: \`\${llm.url}/v1\`,
  });

  expect(llm).toHaveRequestedTool("refund", { amount: 48 });
  expect(payments.refunds).toHaveLength(1);
});`;

export interface Question {
  question: string;
  answer: string;
}

export const questions: Question[] = [
  {
    answer:
      "Only when you record. Everything else is a reply you scripted, stored or asked to be generated. Nothing goes to a provider.",
    question: "Does it call a real model?",
  },
  {
    answer:
      "The OpenAI and Anthropic SDKs, the Vercel AI SDK, any MCP client, and anything that can make an HTTP request.",
    question: "Which clients work?",
  },
  {
    answer:
      "Not for the npm packages or the local server. Hosted mocks, the inspector and team projects need a free account.",
    question: "Do I need an account?",
  },
  {
    answer:
      "Yes. Use the in-process packages or the local server and your tests run with no network, no key and the same result every time.",
    question: "Can I run it in CI?",
  },
  {
    answer: "Yes. The packages, the server and this site are on GitHub.",
    question: "Is it open source?",
  },
];

export interface FooterSection {
  title: string;
  links: { label: string; href: string }[];
}

export const footerSections: FooterSection[] = [
  {
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/auth/login", label: "Sign in" },
      { href: "/llms.txt", label: "llms.txt" },
    ],
    title: "Product",
  },
  {
    links: pageLinks
      .filter((page) => page.href !== "/docs")
      .map((page) => ({ href: page.href ?? "/", label: page.label })),
    title: siteConfig.name,
  },
  {
    links: [
      { href: siteConfig.repository, label: "GitHub" },
      { href: siteConfig.npmPackage, label: "npm" },
      { href: "https://x.com/kaiyuhsu", label: "X" },
    ],
    title: "Elsewhere",
  },
];
