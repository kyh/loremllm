import { siteConfig } from "@/lib/site-config";

/**
 * The prose pages, authored once and rendered twice: as JSX by
 * `(marketing)/<page>/page.tsx` and as Markdown by the content-negotiated
 * `/api/markdown` handler. One source stops the two representations drifting.
 */

export interface ProseListItem {
  label: string;
  /** When present the label renders as a link. */
  href?: string;
  /** Trailing note, rendered after an em dash. */
  text?: string;
}

/**
 * Whether an href has to be a plain `<a>` rather than a `next/link`: anything
 * off-site, and the on-site route handlers (`/llms.txt`, `/openapi.json`, …)
 * the client router would otherwise fetch an RSC payload for. A trailing file
 * extension is exactly what separates this site's route handlers from its pages.
 */
export const rendersOutsideRouter = (href: string): boolean => {
  if (!href.startsWith("/")) {
    return true;
  }
  const lastSegment = href.split(/[?#]/u)[0]?.split("/").pop() ?? "";
  return lastSegment.includes(".");
};

export type ProseBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: ProseListItem[] }
  | { kind: "code"; language: string; text: string };

export interface ProsePage {
  /** Route path, also the canonical URL suffix and the sitemap entry. */
  path: string;
  /** Rendered as the page's single `<h1>` and as the Markdown `#` heading. */
  heading: string;
  /** `<title>` and `og:title` (the layout appends the site name). */
  title: string;
  /** `<meta name="description">`, the llms.txt note, and the Markdown summary. */
  description: string;
  /** `<priority>` in sitemap.xml. Omitted for pages the sitemap leaves out. */
  sitemapPriority?: number;
  blocks: ProseBlock[];
}

export const docsPage: ProsePage = {
  blocks: [
    {
      kind: "paragraph",
      text: `${siteConfig.name} has one public HTTP endpoint, \`POST ${siteConfig.url}/api/chat\`, plus an eve-protocol host per collection and an npm package that needs no server at all. The machine-readable contract is \`/openapi.json\`.`,
    },
    { kind: "heading", text: "POST /api/chat" },
    {
      kind: "paragraph",
      text: 'Send a JSON body with an explicit `type` of `"lorem"`, `"markdown"` or `"chat"`. The response is an AI SDK UI message stream (`text/event-stream`), so `useChat` from `@ai-sdk/react` reads it without any adapter. CORS is open, so a browser app on any origin can call it. Lorem and markdown requests need no account and no key.',
    },
    {
      kind: "code",
      language: "sh",
      text: `# generated lorem ipsum
curl -N -X POST ${siteConfig.url}/api/chat \\
  -H 'content-type: application/json' \\
  -d '{"type":"lorem","units":"sentences","count":3}'

# replay a markdown string as a stream
curl -N -X POST ${siteConfig.url}/api/chat \\
  -H 'content-type: application/json' \\
  -d '{"type":"markdown","markdown":"# Hello\\n\\nStreamed word by word."}'

# best semantic match from a public collection
curl -N -X POST ${siteConfig.url}/api/chat \\
  -H 'content-type: application/json' \\
  -d '{"type":"chat","collectionId":"<publicId>","messages":[{"role":"user","parts":[{"type":"text","text":"Hello"}]}]}'`,
    },
    { kind: "heading", text: "Request types" },
    {
      items: [
        {
          label: "lorem",
          text: "optional `units` (`words`, `sentences`, `paragraphs`), `count`, sentence and paragraph bounds, `suffix`, and a custom `words` vocabulary",
        },
        {
          label: "markdown",
          text: "required `markdown` string, streamed back as-is and split into word-sized chunks",
        },
        {
          label: "chat",
          text: "required `collectionId` (a collection's public id) and the AI SDK `messages` array; the last user message is embedded and matched against the collection. The finish event carries the matched interaction's `interactionId`, `title` and `similarity` as message metadata",
        },
      ],
      kind: "list",
    },
    { kind: "heading", text: "Errors" },
    {
      kind: "paragraph",
      text: "Failures are `application/problem+json` (RFC 9457) with `type`, `title`, `status` and `detail`. `400` is an invalid body, `403` a private collection, `404` an unknown collection or no interaction above the collection's similarity threshold, `500` anything unexpected.",
    },
    {
      kind: "code",
      language: "json",
      text: '{\n  "type": "about:blank",\n  "title": "Bad Request",\n  "status": 400,\n  "detail": "Unknown request type \\"foo\\". Expected \\"chat\\", \\"markdown\\", or \\"lorem\\"."\n}',
    },
    { kind: "heading", text: "Collections" },
    {
      kind: "paragraph",
      text: "A collection is a set of input/output pairs you record in the dashboard. Each input is embedded when saved; a chat request embeds the incoming question and replies with the closest output. A collection can set a minimum similarity, below which the API answers 404 instead of replying with a weak match. Only collections marked public can be queried without signing in. Creating collections requires a free account.",
    },
    { kind: "heading", text: "eve endpoint" },
    {
      kind: "paragraph",
      text: `\`${siteConfig.url}/api/eve/<collectionId>\` is a host for the eve agent protocol. Point an eve client at it and every turn is answered with the collection's best match, e.g. \`POST /api/eve/<collectionId>/eve/v1/session\` with \`{"message":"Hello"}\`.`,
    },
    { kind: "heading", text: "@loremllm/transport" },
    {
      kind: "paragraph",
      text: "For mocks that never leave the browser, install the transport and pass it to `useChat`. Its `mockResponse` async generator yields the parts the assistant message should contain; the transport chunks and streams them with configurable delays.",
    },
    {
      kind: "code",
      language: "ts",
      text: `import { StaticChatTransport } from "@loremllm/transport";
import { useChat } from "@ai-sdk/react";

const transport = new StaticChatTransport({
  chunkDelayMs: 25,
  async *mockResponse() {
    yield { type: "text", text: "Hello! How can I help you today?" };
  },
});

const { messages, sendMessage } = useChat({ transport });`,
    },
    { kind: "heading", text: "Links" },
    {
      items: [
        { href: "/openapi.json", label: "OpenAPI 3.1", text: "the /api/chat contract" },
        { href: siteConfig.npmPackage, label: "@loremllm/transport on npm" },
        {
          href: `${siteConfig.repository}/blob/main/packages/transport/README.md`,
          label: "Transport README",
          text: "every option, with examples",
        },
        { href: siteConfig.repository, label: "Source code", text: "the whole project, on GitHub" },
      ],
      kind: "list",
    },
  ],
  description: `${siteConfig.name} API reference: POST /api/chat request types, streaming format, errors, the eve endpoint and the @loremllm/transport npm package.`,
  heading: `${siteConfig.name} developer docs`,
  path: "/docs",
  sitemapPriority: 0.9,
  title: "Docs",
};

export const aboutPage: ProsePage = {
  blocks: [
    {
      kind: "paragraph",
      text: `${siteConfig.name} started as the world's most overengineered lorem ipsum generator. Building chat interfaces meant constantly waiting on, and paying for, a real model just to see how a streamed reply looks in the UI. ${siteConfig.name} replaces that model with something predictable.`,
    },
    {
      kind: "paragraph",
      text: "The `@loremllm/transport` package plugs into the Vercel AI SDK's `useChat` and streams whatever message parts you describe — text, reasoning, tool calls — with realistic chunk timing and no network. The hosted platform does the same over HTTP: record input/output pairs in a collection, and the API answers each incoming question with the closest stored output, matched by embedding similarity.",
    },
    {
      kind: "paragraph",
      text: "It is useful for prototyping an AI product before the backend is ready, for deterministic end-to-end tests, for demos where you need to control exactly what appears on screen, and for teaching without an API bill.",
    },
    {
      kind: "paragraph",
      text: `${siteConfig.name} is built and maintained by ${siteConfig.author.name} and is open source on GitHub. The stack is Next.js, React, the Vercel AI SDK, oRPC and better-auth, with Turso (libSQL) for storage and vector search.`,
    },
    { kind: "heading", text: "Where to go next" },
    {
      items: [
        {
          href: "/docs",
          label: "Developer docs",
          text: "the API and the transport, with examples",
        },
        {
          href: "/auth/register",
          label: "Create an account",
          text: "to build your own collections",
        },
        { href: siteConfig.repository, label: "Source code", text: "on GitHub" },
        { href: "/contact", label: "Contact", text: "email and GitHub issues" },
      ],
      kind: "list",
    },
  ],
  description: `What ${siteConfig.name} is, why it exists, who builds it, and how it works.`,
  heading: `About ${siteConfig.name}`,
  path: "/about",
  sitemapPriority: 0.6,
  title: "About",
};

export const contactPage: ProsePage = {
  blocks: [
    {
      kind: "paragraph",
      text: `${siteConfig.name} is built and maintained by ${siteConfig.author.name}. There is no support desk and no contact form — email and GitHub are the two channels, and both reach the same person.`,
    },
    {
      kind: "paragraph",
      text: "Email is best for anything private: account questions, a request to delete your account and its data, security reports, or partnership and press enquiries. Expect a reply within a few business days.",
    },
    {
      kind: "paragraph",
      text: "For anything about the code — a bug in the transport, an API response that looks wrong, a missing feature, or a question about how matching works — open a GitHub issue instead, so the next person with the same question can find the answer.",
    },
    { kind: "heading", text: "Channels" },
    {
      items: [
        {
          href: `mailto:${siteConfig.email}`,
          label: siteConfig.email,
          text: "account, privacy and security requests",
        },
        {
          href: `${siteConfig.repository}/issues`,
          label: "GitHub issues",
          text: "bugs, API questions, feature requests",
        },
        {
          href: "https://x.com/kaiyuhsu",
          label: `${siteConfig.twitter} on X`,
          text: "updates as they ship",
        },
      ],
      kind: "list",
    },
  ],
  description: `How to reach ${siteConfig.name} — email and GitHub issues.`,
  heading: `Contact ${siteConfig.name}`,
  path: "/contact",
  sitemapPriority: 0.5,
  title: "Contact",
};

export const privacyPage: ProsePage = {
  blocks: [
    {
      kind: "paragraph",
      text: `${siteConfig.name} runs no analytics, no advertising and no third-party trackers. Nothing collected here is sold, rented or shared with data brokers. This page describes everything the service does store.`,
    },
    { kind: "heading", text: "Without an account" },
    {
      items: [
        {
          label: "Server logs",
          text: "the site is hosted on Vercel, whose edge network keeps short-lived request logs including IP address and user agent",
        },
        {
          label: "API requests",
          text: "lorem and markdown requests are answered and discarded. A chat request's question is sent to an embedding model to find the closest match and is not stored. The eve endpoint stores the conversation it is carrying so the session can continue",
        },
        {
          label: "Theme preference",
          text: "your light/dark choice is kept in your browser's local storage and never leaves the device",
        },
      ],
      kind: "list",
    },
    { kind: "heading", text: "With an account" },
    {
      kind: "paragraph",
      text: "The database stores your name, email address and a hashed password — or, if you sign in with GitHub, your GitHub name, email and avatar URL. Each session records the IP address and user agent it was created from, and a session cookie keeps you signed in. Authentication requests are rate limited per IP address. Passwords are never stored in plain text.",
    },
    {
      kind: "paragraph",
      text: "Collections and interactions you create are stored with your account. Interaction inputs are converted to embeddings so they can be matched; the stored text and vectors stay in the database. Anything in a collection you mark public can be read by anyone who has its id.",
    },
    {
      kind: "paragraph",
      text: `Email ${siteConfig.email} to have your account, its sessions and every collection attached to it deleted.`,
    },
    { kind: "heading", text: "Processors" },
    {
      items: [
        {
          href: "https://vercel.com/legal/privacy-policy",
          label: "Vercel",
          text: "hosting, and the AI Gateway that routes embedding requests",
        },
        {
          href: "https://openai.com/policies/privacy-policy",
          label: "OpenAI",
          text: "the text-embedding-3-small model that embeds interaction inputs and chat questions",
        },
        {
          href: "https://turso.tech/privacy",
          label: "Turso",
          text: "the database behind accounts, collections and vectors",
        },
        {
          href: "https://resend.com/legal/privacy-policy",
          label: "Resend",
          text: "delivers password-reset emails to your address",
        },
        {
          href: "https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement",
          label: "GitHub",
          text: "sign-in, only if you choose it",
        },
      ],
      kind: "list",
    },
    {
      kind: "paragraph",
      text: `Questions about any of this go to ${siteConfig.email}.`,
    },
  ],
  description: `What ${siteConfig.name} collects, what it stores, and who processes it.`,
  heading: "Privacy",
  path: "/privacy",
  sitemapPriority: 0.4,
  title: "Privacy",
};

/** Prose pages, in the order they should appear in a sitemap or llms.txt. */
export const prosePages: ProsePage[] = [docsPage, aboutPage, contactPage, privacyPage];

/**
 * Routes that render HTML but carry no prose worth a full Markdown page. They
 * still need *a* Markdown representation: a URL that answers 200 to a browser
 * and 404 to an agent would be a lie about what exists.
 */
export const utilityPages: ProsePage[] = [
  {
    blocks: [
      {
        kind: "paragraph",
        text: "An interactive sign-in form (email and password, or GitHub). An account is only needed to create collections; the lorem and markdown API and the npm transport work without one.",
      },
    ],
    description: `Sign in to ${siteConfig.name}.`,
    heading: "Log in",
    path: "/auth/login",
    title: "Login",
  },
  {
    blocks: [
      {
        kind: "paragraph",
        text: "An interactive sign-up form. Accounts are free and are needed only to create and manage collections.",
      },
    ],
    description: `Create a ${siteConfig.name} account.`,
    heading: "Create an account",
    path: "/auth/register",
    title: "Register",
  },
  {
    blocks: [{ kind: "paragraph", text: "An interactive form for requesting a password reset." }],
    description: `Request a ${siteConfig.name} password reset.`,
    heading: "Reset your password",
    path: "/auth/password-reset",
    title: "Password reset",
  },
  {
    blocks: [
      {
        kind: "paragraph",
        text: "An interactive form for setting a new password from a reset link.",
      },
    ],
    description: `Set a new ${siteConfig.name} password from a reset link.`,
    heading: "Choose a new password",
    path: "/auth/password-update",
    title: "Password update",
  },
  {
    blocks: [
      {
        kind: "paragraph",
        text: "The signed-in dashboard where collections and their interactions are created, edited and tested. It redirects to the login page without a session.",
      },
    ],
    description: `Manage ${siteConfig.name} collections.`,
    heading: "Dashboard",
    path: "/dashboard",
    title: "Dashboard",
  },
];

export const findPageByPath = (pathname: string): ProsePage | null =>
  [...prosePages, ...utilityPages].find((page) => page.path === pathname) ?? null;
