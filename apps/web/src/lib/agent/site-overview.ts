import { siteConfig } from "@/lib/site-config";

import type { ProseListItem } from "./site-pages";

/**
 * The single description of what this site is and when an agent should reach
 * for it. Consumed by the homepage text, `/llms.txt`, and the Markdown
 * representation of `/`, so all three say the same thing.
 */

export const siteSummary = `${siteConfig.name} mocks LLM responses: store input/output pairs in a collection and a hosted endpoint streams back the best semantic match in the AI SDK UI message format, instead of calling a real model.`;

export const siteIntroParagraphs: string[] = [
  `${siteConfig.name} is a set of tools for building and testing AI interfaces without paying for, or waiting on, a real language model. It is open source and built by ${siteConfig.author.name}.`,
  "There are two ways to use it. The `@loremllm/transport` npm package is a chat transport for the Vercel AI SDK: you describe the exact message parts the UI should receive — text, reasoning, tool calls — and `useChat` streams them back with no network request at all. The hosted API at `/api/chat` does the same over HTTP: it streams lorem ipsum, replays a markdown string, or answers from a collection of recorded interactions, picking the closest one by embedding similarity.",
];

/**
 * When-to-use guidance. Concrete about the jobs this site is right for — and
 * about the ones it is not, so an agent can rule it out fast.
 */
export const whenToUse: ProseListItem[] = [
  {
    label: "You are building a chat UI before the backend exists",
    text: "point `useChat` at `@loremllm/transport` or at `/api/chat` and the UI receives a realistic streamed response today",
  },
  {
    label: "You need deterministic AI responses in tests or demos",
    text: "a collection maps known inputs to fixed outputs, so the same question always gets the same answer, token by token",
  },
  {
    label: "You want to exercise streaming edge cases",
    text: "the transport can emit reasoning parts, tool calls and custom chunk timing that are hard to reproduce against a live model",
  },
  {
    label: "You need filler text shaped like model output",
    text: '`POST /api/chat` with `{"type":"lorem"}` streams generated lorem ipsum as an AI SDK UI message stream — no account, no key',
  },
  {
    label: "Not a fit",
    text: `${siteConfig.name} does not run a language model, generate novel answers, or proxy to OpenAI or Anthropic. It replays what you stored; for real completions, call a real model provider`,
  },
];

export const siteUsageParagraphs: string[] = [
  'How to call it: `POST /api/chat` with a JSON body whose `type` is `"lorem"`, `"markdown"` or `"chat"`. The response is an AI SDK UI message stream (server-sent events), so `useChat` from `@ai-sdk/react` consumes it directly. Lorem and markdown requests need no account. Chat requests name a public collection by its id; collections are created in the dashboard after signing up. Errors are `application/problem+json`. The full contract is in `/openapi.json` and on `/docs`.',
  "Reading it as an agent: send `Accept: text/markdown` to any page URL — or append `.md` to it — and the same page comes back as Markdown instead of HTML. `/llms.txt` carries this overview in one request, and `/sitemap.xml` lists every indexable URL.",
];

/** Machine-readable surfaces, with what each one returns. */
export const agentEndpoints: ProseListItem[] = [
  {
    href: "/openapi.json",
    label: "/openapi.json",
    text: "OpenAPI 3.1 description of the public HTTP API",
  },
  {
    href: "/docs",
    label: "/docs",
    text: "API reference: request types, streaming format, errors, the eve endpoint and the npm transport",
  },
  {
    label: "POST /api/chat",
    text: "streams a mock response — lorem ipsum, a markdown string, or the best match from a public collection",
  },
  {
    label: "/api/eve/<collectionId>",
    text: "eve-protocol host for a collection, for clients built on the eve agent framework",
  },
  { href: "/sitemap.xml", label: "/sitemap.xml", text: "every indexable URL on the site" },
  { href: "/llms.txt", label: "/llms.txt", text: "this overview, for agents" },
  {
    label: "Markdown for any page",
    text: "send `Accept: text/markdown` to any page URL, or append `.md` to it, and the same content comes back as Markdown",
  },
];
