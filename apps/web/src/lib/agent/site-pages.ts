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

/**
 * A page is a flat run of blocks. Copy in a paragraph, a bullet, a table cell
 * or a list item's `text` may carry the inline marks in `inline-marks.ts`
 * (`code`, **strong**, [links](href)); nothing else in it is markup.
 */
export type ProseBlock =
  | { kind: "paragraph"; text: string }
  /** A top-level section: `<h2>` with an `id` from `headingId`, `##` in Markdown. */
  | { kind: "heading"; text: string }
  /** A section within one: `<h3>`, `###` in Markdown. */
  | { kind: "subheading"; text: string }
  | { kind: "list"; items: ProseListItem[] }
  /** Bullets of plain copy, where a list item's label/text split does not fit. */
  | { kind: "bullets"; items: string[] }
  /** Every row holds one cell per column. */
  | { kind: "table"; columns: string[]; rows: string[][] }
  | { kind: "code"; language: string; text: string };

/**
 * The anchor a top-level heading answers to, by GitHub's slug rule (lowercase,
 * punctuation dropped, each space a hyphen), so a `#…` link resolves on the
 * HTML page and wherever the Markdown twin is rendered.
 */
export const headingId = (text: string): string =>
  text
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{M}\p{N} _-]/gu, "")
    .replaceAll(" ", "-");

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

// The legal pages follow General Legal's templates (the GDPR-enhanced privacy
// policy and the website terms of use, JAMS arbitration), with each clause
// resolved to what this product actually does. A product fact in them is a
// claim about the code: change the code, change the copy.

const paragraph = (text: string): ProseBlock => ({ kind: "paragraph", text });
const heading = (text: string): ProseBlock => ({ kind: "heading", text });
const subheading = (text: string): ProseBlock => ({ kind: "subheading", text });
const bullets = (...items: string[]): ProseBlock => ({ items, kind: "bullets" });
const table = (columns: string[], rows: string[][]): ProseBlock => ({
  columns,
  kind: "table",
  rows,
});

/** Links to each top-level section of `blocks`, in order: a legal page's Index. */
const sectionIndex = (blocks: ProseBlock[]): ProseBlock => ({
  items: blocks.flatMap((block) =>
    block.kind === "heading" ? [{ href: `#${headingId(block.text)}`, label: block.text }] : [],
  ),
  kind: "list",
});

const legalDate = "October 3, 2026";
const operator = siteConfig.author.name;
const product = siteConfig.name;
const productCaps = product.toUpperCase();
const siteHost = new URL(siteConfig.url).host;
const emailLink = `[${siteConfig.email}](mailto:${siteConfig.email})`;

/** General Legal's credit, verbatim, as the last paragraph of each legal page. */
const generalLegalCredit = paragraph(
  'This template was prepared and made publicly available by General Legal, PC ("General Legal"). It is provided for general reference purposes only and does not constitute, and should not be construed as, legal advice, or an endorsement or review of any particular transaction in which it is used. Use of this template does not create an attorney-client relationship with General Legal. General Legal has not reviewed, and takes no position on, any modifications made to this document or the deal terms it is used to document.',
);

const disclosurePurposes =
  "Service delivery and operations; Compliance and protection; Data sharing in the context of corporate events; To create aggregated, de-identified and/or anonymized data";
const disclosureRecipients =
  "Service providers; Professional advisors; Authorities and others; Business transferees";

const privacySections: ProseBlock[] = [
  heading("Personal information we collect"),
  paragraph(
    "**Information you provide to us.** Personal information you may provide to us through the Service or otherwise includes:",
  ),
  bullets(
    '**Contact data**, such as your name and email address. When you sign up with an email address and a password, the name on your account is the part of your email address before the "@".',
    "**Profile data**, such as the password that you set to establish an online account on the Service, which we store only as a hash, never in plain text.",
    "**Communications data** based on our exchanges with you, including when you contact us by email, through GitHub issues, social media, or otherwise.",
    "**User-generated content and input data**, such as the collections you create (their names, descriptions, settings and public ids), the interactions you save in them (their titles, descriptions, inputs and outputs), the requests you send to the Service's API (lorem settings, markdown text and chat questions) and the messages exchanged in an eve session, as well as associated metadata, such as when a collection or interaction was created or last edited.",
    "**Other data** not specifically listed here, which we will use as described in this Privacy Policy or as otherwise disclosed at the time of collection.",
  ),
  paragraph(
    "**Third-party sources.** We may combine personal information we receive from you with personal information falling within one of the categories identified above that we obtain from other sources, such as:",
  ),
  bullets(
    "**Third-party services, such as GitHub, that you use to log into, or otherwise link to, your Service account.** This data may include your username, profile picture and other information associated with your account on that third-party service that is made available to us based on your account settings on that service. If you sign in with GitHub, we receive your GitHub name (or, if you have not set one, your username), your email address, the URL of your profile picture and your GitHub account ID, and we store the access token GitHub issues for the sign-in, which can read your GitHub profile and email addresses.",
    "**Service providers** that provide services on our behalf or help us operate the Service or our business.",
  ),
  paragraph(
    "**Automatic data collection.** We and our service providers may automatically log information about you, your computer or mobile device, and your interaction over time with the Service, our communications and other online services, such as:",
  ),
  bullets(
    "**Device data**, such as your IP address and the user agent your browser sends, which describes your browser type and version and your device's operating system.",
  ),
  paragraph(
    "We collect device data in three places: Vercel, which hosts the Service, keeps short-lived logs of the requests made to it, including the IP address and user agent of each; each session you sign in with records the IP address and user agent it was created from; and requests to our sign-in and other authentication endpoints are rate limited per IP address.",
  ),
  paragraph(
    "For more information concerning our automatic collection of data, please see the [Tracking & Other Technologies](#tracking--other-technologies) section below.",
  ),

  heading("Tracking & Other Technologies"),
  paragraph(
    "**Cookies and other technologies.** Some of our automatic data collection is facilitated by cookies and other technologies. The Service uses only the following, all of them first-party technologies served by us:",
  ),
  bullets(
    "**Essential.** These cookies are necessary to allow the technical operation of the Service. One keeps you signed in to the dashboard; it expires seven days after it is set and is cleared when you sign out. Another is set only while you sign in with GitHub, to tie GitHub's reply to the sign-in you started, and expires after five minutes. You can block or delete them in your browser settings, but you will then be unable to sign in; the documentation and the public API keep working without them.",
    "**Functionality / performance.** These enhance the performance and functionality of the Service. We use browser web storage (your browser's local storage), not a cookie, to remember whether you chose the light or the dark theme. The choice never leaves your device, and clearing your browser's site data resets it.",
  ),
  paragraph(
    "We do not use analytics, advertising or social media cookies, or any other third-party trackers.",
  ),
  paragraph(
    '**Chat and other artificial intelligence ("AI") technologies**, such as those provided by OpenAI, whose text-embedding-3-small model we reach through Vercel\'s AI Gateway, that turn text into embeddings to operate the semantic matching features that you can use to save interactions in a collection and to query a collection through the Service. OpenAI, Vercel and other third parties may access and use the text we send them for embedding, namely the title, description and input of each interaction you save and each question sent to a collection, to facilitate the provision of the Service.',
  ),
  paragraph(
    "For information concerning your choices with respect to the use of tracking technologies, see the [Your choices](#your-choices) section below.",
  ),

  heading("How we use your personal information"),
  paragraph(
    "We may use your personal information for the following purposes or as otherwise described at the time of collection:",
  ),
  paragraph("**Service delivery and operations.** We may use your personal information to:"),
  bullets(
    "provide the Service;",
    "enable security features of the Service, such as signed-in sessions and the rate limits on authentication requests;",
    "establish and maintain your user profile on the Service;",
    "communicate with you about the Service, including by sending Service-related announcements, updates, security alerts, and support and administrative messages, such as password-reset emails; and",
    "provide support for the Service, and respond to your requests, questions and feedback.",
  ),
  paragraph("**Service personalization**, which may include using your personal information to:"),
  bullets(
    "remember your selections and preferences as you navigate webpages, such as your choice of theme.",
  ),
  paragraph("**Compliance and protection.** We may use your personal information to:"),
  bullets(
    "comply with applicable laws, lawful requests, and legal process, such as to respond to subpoenas, investigations or requests from government authorities;",
    "protect our, your or others' rights, privacy, safety or property (including by making and defending legal claims);",
    "audit our internal processes for compliance with legal and contractual requirements or our internal policies;",
    "enforce the terms and conditions that govern the Service, including our [Terms of Use](/terms); and",
    "prevent, identify, investigate and deter fraudulent, harmful, unauthorized, unethical or illegal activity, including cyberattacks and identity theft.",
  ),
  paragraph(
    "**Data sharing in the context of corporate events.** We may share certain personal information in the context of actual or prospective corporate events – for more information, see [How we share your personal information](#how-we-share-your-personal-information), below.",
  ),
  paragraph(
    "**To create aggregated, de-identified and/or anonymized data.** We may create aggregated, de-identified and/or anonymized data from your personal information and other individuals whose personal information we collect. We make personal information into de-identified and/or anonymized data by removing information that makes the data identifiable to you and we will not attempt to reidentify any such data. We may use this aggregated, de-identified and/or anonymized data and share it with third parties for our lawful business purposes, including analyzing and improving the Service and promoting our business.",
  ),
  paragraph(
    "**Further uses.** In some cases, we may use your personal information for further uses, in which case we will ask for your consent to use your personal information for those further purposes if they are not compatible with the initial purpose for which information was collected.",
  ),

  heading("Retention"),
  paragraph(
    "We generally retain personal information to fulfill the purposes for which we collected it, including for the purposes of satisfying any legal, accounting, or reporting requirements, establishing or defending legal claims, or for fraud prevention purposes. To determine the appropriate retention period for personal information, we may consider factors such as the amount, nature, and sensitivity of the personal information, the potential risk of harm from unauthorized use or disclosure of your personal information, the purposes for which we process your personal information and whether we can achieve those purposes through other means, and the applicable legal requirements.",
  ),
  paragraph(
    "When we no longer require the personal information we have collected about you, we may either delete it, anonymize it, or isolate it from further processing.",
  ),
  paragraph("Specifically:"),
  bullets(
    "Lorem and markdown requests to the API are answered and discarded.",
    "A question sent to a collection through `/api/chat` is embedded to find the closest match and is not stored in our database.",
    "The eve endpoint stores the conversation each session carries, the messages sent and the replies streamed back, so the session can continue. A session is kept until the collection it belongs to is deleted.",
    "Your account and the collections and interactions you create, including the text of each interaction and the embedding vector made from it, stay in our database until you delete them or your account is deleted. If you sign in with GitHub, the access token it issued is kept with your account the same way.",
    "Session records, with the IP address and user agent each was created from, are deleted when you sign out or when your account is deleted.",
    "Rate-limit counters, keyed by IP address and the path requested, are deleted automatically by later authentication requests once they are more than a minute old.",
    "Vercel keeps its request logs for the short period its retention settings allow. The same logs hold the errors our server records, and when embedding a question or an interaction fails, the error can include the text being embedded.",
    "Password-reset links expire one hour after they are sent.",
    "Your theme choice stays in your browser until you clear it.",
  ),

  heading("How we share your personal information"),
  paragraph(
    "We may share your personal information with the following parties (or as otherwise described in this Privacy Policy, in other applicable notices, or at the time of collection). We do not sell or rent your personal information, or share it with data brokers or advertisers.",
  ),
  paragraph(
    "**Service providers.** Third parties that provide services on our behalf or help us operate the Service or our business (such as hosting, information technology, AI providers, and email delivery). These include:",
  ),
  {
    items: [
      {
        href: "https://vercel.com/legal/privacy-policy",
        label: "Vercel",
        text: "hosts the Service, keeps short-lived request logs that include IP addresses and user agents, and runs the AI Gateway that routes embedding requests",
      },
      {
        href: "https://openai.com/policies/privacy-policy",
        label: "OpenAI",
        text: "its text-embedding-3-small model embeds the text of interactions and the questions sent to collections",
      },
      {
        href: "https://turso.tech/privacy",
        label: "Turso",
        text: "the database behind accounts, sessions, collections, interactions and their vectors",
      },
      {
        href: "https://resend.com/legal/privacy-policy",
        label: "Resend",
        text: "delivers password-reset emails to your address",
      },
    ],
    kind: "list",
  },
  paragraph(
    "**Third parties designated by you.** We may share your personal information with third parties where you have instructed us or provided your consent to do so.",
  ),
  paragraph(
    "**Linked third-party services.** If you log into the Service with, or otherwise link your Service account to, a social media or other third-party service, we may share your personal information with that third-party service. The third party's use of the shared information will be governed by its privacy policy and the settings associated with your account with the third-party service. The Service offers sign-in with [GitHub](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement), used only if you choose it.",
  ),
  paragraph(
    "**Professional advisors.** Professional advisors, such as lawyers, auditors, bankers and insurers, in the course of the professional services that they render to us.",
  ),
  paragraph(
    "**Authorities and others.** Law enforcement, government authorities, and private parties, as we believe in good faith to be necessary or appropriate for the Compliance and protection purposes described above.",
  ),
  paragraph(
    `**Business transferees.** We may disclose personal information in the context of actual or prospective business transactions (e.g., investments in ${product}, financing of ${product}, or the sale, transfer or merger of all or part of ${product} or its assets). For example, we may need to share certain personal information with prospective counterparties and their advisers. We may also disclose your personal information to an acquirer, successor, or assignee of ${product} as part of any merger, acquisition, sale of assets, or similar transaction, and/or in the event of an insolvency, bankruptcy, or receivership in which personal information is transferred to one or more third parties as one of our business assets.`,
  ),
  paragraph(
    "**Other users and the public.** Collections you make public, and the interactions in them, are visible to the public: anything in a public collection can be read by anyone who has its id, including through the Service's API from any website. For example, the public may have access to your information if you include it in an interaction in a public collection. This information can be seen, collected and used by others, including being cached, copied, screen captured or stored elsewhere by others (e.g., search engines), and we are not responsible for any such use of this information.",
  ),

  heading("Your choices"),
  paragraph(
    "In this section, we describe the rights and choices available to all users. Users who are located in certain U.S. states and Europe can find additional information about their rights below.",
  ),
  paragraph(
    "**Access or update your information.** If you have registered for an account with us through the Service, you may review and update certain account information by logging into the account, where you can review, edit and delete your collections and interactions. You can change your password through the password reset page, and you can ask us to update your name or email address by contacting us.",
  ),
  paragraph(
    "**Cookies and other technologies.** Most browsers let you remove or reject cookies. To do this, follow the instructions in your browser settings. Many browsers accept cookies by default until you change your settings. Please note that if you set your browser to disable cookies, the Service may not work properly: you will not be able to sign in, although the documentation and the public API keep working. Your browser may also provide functionality to clear your browser web storage, which resets your theme choice.",
  ),
  paragraph(
    '**Do Not Track.** Some Internet browsers may be configured to send "Do Not Track" signals to the online services that you visit. We currently do not respond to "Do Not Track" signals, because the Service does not track you across other websites.',
  ),
  paragraph(
    "**Privacy settings.** We make available certain privacy settings on the Service, including options to control whether each of your collections is public. A collection is private when you create it, and you can make it public, or private again, from its settings in the dashboard.",
  ),
  paragraph(
    "**Declining to provide information.** We need to collect personal information to provide certain services. If you do not provide the information we identify as required or mandatory, we may not be able to provide those services.",
  ),
  paragraph(
    "**Linked third-party platforms.** If you choose to connect to the Service through your social media account or other third-party platform, you may be able to use your settings in your account with that platform to limit the information we receive from it. If you revoke our ability to access information from a third-party platform, that choice will not apply to information that we have already received from that third party.",
  ),
  paragraph(
    `**Delete your content or close your account.** You can choose to delete certain content through your account: deleting an interaction or a collection in the dashboard removes it, and deleting a collection also removes its interactions and any eve sessions stored for it. If you wish to request to close your account, please email ${emailLink}, and we will delete your account, its sessions and every collection attached to it.`,
  ),

  heading("Other sites and services"),
  paragraph(
    "The Service may contain links to websites, mobile applications, and other online services operated by third parties. In addition, our content may be integrated into web pages or other online services that are not associated with us. These links and integrations are not an endorsement of, or representation that we are affiliated with, any third party. We do not control websites, mobile applications or online services operated by third parties, and we are not responsible for their actions. We encourage you to read the privacy policies of the other websites, mobile applications and online services you use.",
  ),

  heading("Security"),
  paragraph(
    "We employ technical, organizational and physical safeguards designed to protect the personal information we collect. However, security risk is inherent in all internet and information technologies and we cannot guarantee the security of your personal information.",
  ),

  heading("International data transfer"),
  paragraph(
    "We are based in the United States and may use service providers that operate in other countries. Your personal information may be transferred to the United States or other locations where privacy laws may not be as protective as those in your state, province, or country.",
  ),
  paragraph(
    "Users in Europe should read the important information provided [below](#notice-to-european-users) about transfer of personal information outside of Europe.",
  ),

  heading("Children"),
  paragraph(
    "The Service is not intended for use by anyone under 18 years of age. If you are a parent or guardian of a child from whom you believe we have collected personal information in a manner prohibited by law, please contact us. If we learn that we have collected personal information through the Service from a child without the consent of the child's parent or guardian as required by law, we will comply with applicable legal requirements to delete the information.",
  ),

  heading("Changes to this Privacy Policy"),
  paragraph(
    "We reserve the right to modify this Privacy Policy at any time. If we make material changes to this Privacy Policy, we will notify you by updating the date of this Privacy Policy and posting it on the Service or other appropriate means. Any modifications to this Privacy Policy will be effective upon our posting the modified version (or as otherwise indicated at the time of posting). In all cases, your use of the Service after the effective date of any modified Privacy Policy indicates your acknowledging that the modified Privacy Policy applies to your interactions with the Service and our business.",
  ),

  heading("How to contact us"),
  paragraph(
    "If you have questions about our practices or if you would like to exercise any privacy related right that may be available to you, please contact us via one of the methods listed below.",
  ),
  bullets(`**Email**: ${emailLink}`),
  paragraph(
    `Questions about the code that involve no personal information can also go to [GitHub issues](${siteConfig.repository}/issues). Issues are public, so please do not use them for privacy requests.`,
  ),

  heading("State privacy rights notice"),
  paragraph(
    'Except as otherwise provided, this section applies to residents of U.S. states to the extent they have privacy laws applicable to us that grant their residents the rights described below (collectively the "**State Privacy Laws**").',
  ),
  paragraph(
    "This section describes how we collect, use, and share Personal Information of residents of these states and the rights these users may have with respect to their Personal Information. Please note that not all rights listed below may be afforded to all users and that if you are not a resident of one of these states listed above, you may not be able to exercise these rights. In addition, **we may not be able to process your request if you do not provide us with sufficient detail to allow us to confirm your identity or understand and respond to it. To confirm your identity, we will ask you to send your request from, or confirm it from, the email address associated with your account. If your request does not concern an account, we will ask you for the details we need to find the information it concerns.**",
  ),
  paragraph(
    'For purposes of this section, the term "**Personal Information**" has the meaning given to "personal data", "personal information" or other similar terms and "**Sensitive Personal Information**" has the meaning given to "sensitive personal information," "sensitive data", or other similar terms in the State Privacy Laws, except that in neither case does such term include information exempted from the scope of the State Privacy Laws.',
  ),
  paragraph(
    "**Your privacy rights.** The State Privacy Laws may provide residents with some or all of the rights listed below. However, these rights are not absolute and some State Privacy Laws do not provide these rights to their residents. Therefore, we may decline your request in certain cases as permitted by law.",
  ),
  paragraph(
    "**Information.** You can request the following information about how we have collected and used your Personal Information:",
  ),
  bullets(
    "The categories of Personal Information that we have collected.",
    "The categories of sources from which we collected Personal Information.",
    "The business or commercial purpose for collecting and/or selling Personal Information.",
    "The categories of third parties with which we share Personal Information.",
    "The categories of Personal Information that we sold or disclosed for a business purpose.",
    "The categories of third parties to whom the Personal Information was sold or disclosed for a business purpose.",
  ),
  paragraph(
    "**Access.** You can request a copy of the Personal Information that we have collected about you.",
  ),
  paragraph("**Appeal.** You can appeal our denial of any request validly submitted."),
  paragraph(
    "**Correction.** You can ask us to correct inaccurate Personal Information that we have collected about you.",
  ),
  paragraph(
    "**Deletion.** You can ask us to delete the Personal Information that we have collected from you.",
  ),
  paragraph("**Opt-out.**"),
  paragraph(
    "**Opt-out of certain processing for targeted advertising purposes.** We do not process your personal information for targeted advertising purposes.",
  ),
  paragraph(
    "**Opt-out of or appeal profiling/automated decision making.** We do not use your Personal Information to engage in profiling or to perform automated decision-making that results in significant financial impacts, significant impacts on housing, education, employment, health care, or criminal justice, or similarly significant impacts.",
  ),
  paragraph(
    "**Opt-out of other sales of personal data.** We do not sell your Personal Information within the meaning of State Privacy Laws.",
  ),
  paragraph(
    "**Consumers under 16.** We do not have actual knowledge that we collect, sell or share the personal information of consumers under 16 years of age.",
  ),
  paragraph(
    "**Sensitive Personal Information.** While we process certain categories of Sensitive Personal Information as described in this Privacy Policy, such as the login credentials for your account, we do not process Sensitive Personal Information for the purpose of inferring characteristics about consumers under the CCPA.",
  ),
  paragraph(
    "**Nondiscrimination.** You are entitled to exercise the rights described above free from discrimination as prohibited by the State Privacy Laws.",
  ),
  paragraph(
    '**Exercising your right to opt-out of the "sale" or "sharing" of your Personal Information.** We do not sell your Personal Information or "share" it for cross-context behavioral advertising, as the State Privacy Laws define those terms, so there is nothing to opt out of. If that ever changes, we will update this Privacy Policy first, offer a way to opt out, and honor Global Privacy Control ("GPC") signals as valid opt-out requests, as required by applicable law.',
  ),
  paragraph(
    `**Exercising other state privacy rights.** You may submit requests to exercise any of the other state privacy rights listed above via email to ${emailLink}.`,
  ),
  paragraph(
    "**Verification of Identity; Authorized agents.** We may need to verify your identity in order to process your information/know, access, appeal, correction, or deletion requests and reserve the right to confirm your residency. To verify your identity, we may require government identification, a declaration under penalty of perjury, or other information, where permitted by law.",
  ),
  paragraph(
    "Under some State Privacy Laws, you may enable an authorized agent to make a request on your behalf. However, we may need to verify your authorized agent's identity and authority to act on your behalf. We may require a copy of a valid power of attorney given to your authorized agent pursuant to applicable law. If you have not provided your agent with such a power of attorney, we may ask you to take additional steps permitted by law to verify that your request is authorized, such as by providing your agent with written and signed permission to exercise your State Privacy Laws rights on your behalf, the information we request to verify your identity, and confirmation that you have given the authorized agent permission to submit the request.",
  ),
  paragraph(
    "**Information practices.** The following describes our practices currently and during the past 12 months:",
  ),
  paragraph(
    "**Sources and purposes.** We collect all categories of personal information from the sources and use them for the business/commercial purposes described above in the Privacy Policy.",
  ),
  paragraph(
    "**Retention.** The criteria for deciding how long to retain personal information is generally based on whether such period is sufficient to fulfill the purposes for which we collected it as described in this notice, including complying with our legal obligations.",
  ),
  paragraph(
    "**Deidentification.** We do not attempt to reidentify deidentified information derived from personal information, except for the purpose of testing whether our deidentification processes comply with applicable law.",
  ),
  paragraph(
    "**Personal information that we collect, use and disclose.** We have summarized the Personal Information we collect, the purposes for which we collect it and the third parties to whom we may disclose it by reference below to both the categories defined in the [Personal information we collect](#personal-information-we-collect) section of this Privacy Policy above and the categories of Personal Information specified in the CCPA (Cal. Civ. Code §1798.140). This chart describes our practices currently and during the 12 months preceding the effective date of this Privacy Policy. Information you voluntarily provide to us, such as in free-form webforms, may contain other categories of personal information not described below.",
  ),
  table(
    [
      'Personal Information ("PI") we collect',
      "CCPA statutory category",
      "Purposes",
      'Categories of third parties to whom we "disclose" PI for a business purpose',
      'Categories of third parties to whom we "sell" or "share" PI',
    ],
    [
      [
        "Contact data",
        "Identifiers; California Customer Records",
        disclosurePurposes,
        disclosureRecipients,
        "None",
      ],
      [
        "Profile data, including your GitHub account ID, profile picture URL and access token if you sign in with GitHub",
        "Identifiers; California Customer Records; Sensitive personal information (account log-in credentials)",
        disclosurePurposes,
        disclosureRecipients,
        "None",
      ],
      [
        "Communications data",
        "Identifiers; California Customer Records",
        disclosurePurposes,
        disclosureRecipients,
        "None",
      ],
      [
        "User-generated content and input data",
        "Internet or other electronic network activity information; Audio, electronic, visual or similar information; any other category you choose to include",
        disclosurePurposes,
        "Service providers; Other users and the public (content in public collections); Professional advisors; Authorities and others; Business transferees",
        "None",
      ],
      [
        "Device data",
        "Identifiers; Internet or other electronic network activity information",
        disclosurePurposes,
        disclosureRecipients,
        "None",
      ],
    ],
  ),
  paragraph("**Additional information for California residents.**"),
  paragraph(
    `**Shine the light law.** Under California's Shine the Light law (California Civil Code Section 1798.83), California residents may ask companies with whom they have formed a business relationship primarily for personal, family or household purposes to provide the names of third parties to which they have disclosed certain personal information (as defined under the Shine the Light law) during the preceding calendar year for their own direct marketing purposes, and the categories of personal information disclosed. We do not disclose personal information to third parties for their own direct marketing purposes. You may send us requests for this information to ${emailLink}. In your request, you must include the statement "Shine the Light Request," and provide your first and last name and mailing address and certify that you are a California resident. We reserve the right to require additional information to confirm your identity and California residency. Please note that we will not accept requests via telephone, mail, or facsimile, and we are not responsible for notices that are not labeled or sent properly, or that do not have complete information.`,
  ),
  paragraph(
    `**Additional information for Nevada residents.** Nevada residents have the right to opt-out of the sale of certain personal information for monetary consideration. While we do not currently engage in such sales, if you are a Nevada resident and would like to make a request to opt out of any potential future sales, please email ${emailLink}.`,
  ),
  paragraph(
    "**Contact Us.** If you have questions or concerns about our privacy policies or information practices, please contact us using the contact details set forth in the [How to contact us](#how-to-contact-us) section above.",
  ),

  heading("Notice to European users"),
  subheading("General"),
  paragraph(
    '**Where this Notice to European users applies.** The information provided in this "Notice to European users" section applies only to individuals in the United Kingdom and the European Economic Area (i.e., "Europe" as defined at the top of this Privacy Policy).',
  ),
  paragraph(
    '**Personal information.** References to "personal information" in this Privacy Policy should be understood to include a reference to "personal data" (as defined in the GDPR) – i.e., information about individuals from which they are either directly identified or can be identified.',
  ),
  paragraph(
    `**Controller.** ${operator}, who provides ${product}, is the controller in respect of the processing of your personal information covered by this Privacy Policy for purposes of European data protection legislation (i.e., the EU GDPR and the so-called 'UK GDPR' (as and where applicable, the "**GDPR**")). See the '[How to contact us](#how-to-contact-us)' section above for our contact details.`,
  ),
  subheading("Our legal bases for processing"),
  paragraph(
    'In respect of each of the purposes for which we use your personal information, the GDPR requires us to ensure that we have a "legal basis" for that use.',
  ),
  paragraph(
    "Our legal bases for processing your personal information described in this Privacy Policy are listed below.",
  ),
  bullets(
    'Where we need to perform a contract, we are about to enter into or have entered into with you ("**Contractual Necessity**").',
    'Where it is necessary for our legitimate interests and your interests and fundamental rights do not override those interests ("**Legitimate Interests**"). More detail about the specific legitimate interests pursued in respect of each Purpose we use your personal information for is set out in the table below.',
    'Where we need to comply with a legal or regulatory obligation ("**Compliance with Law**").',
    'Where we have your specific consent to carry out the processing for the Purpose in question ("**Consent**").',
  ),
  paragraph(
    "We have set out below, in a table format, the legal bases we rely on in respect of the relevant Purposes for which we use your personal information – for more information on these Purposes and the data types involved, see '[How we use your personal information](#how-we-use-your-personal-information)'.",
  ),
  table(
    ["Purpose", "Categories of personal information involved", "Legal basis"],
    [
      [
        "Service delivery and operations",
        "Contact data; Profile data; Communications data; User-generated content and input data; data from GitHub, if you sign in with it; Device data",
        "Contractual Necessity.",
      ],
      [
        "Security",
        "Contact data; Profile data; Device data",
        "Compliance with Law. Legitimate Interests. We have a legitimate interest in ensuring the ongoing security and proper operation of our Service and associated IT services, systems, and networks.",
      ],
      [
        "Service personalization",
        "Other data: your theme choice, kept in your browser",
        "Legitimate Interests. We have a legitimate interest in providing you with a good service, which is personalised to you and that remembers your selections and preferences.",
      ],
      [
        "Compliance and protection",
        "Contact data; Profile data; Communications data; User-generated content and input data; Device data",
        "Compliance with Law. Legitimate Interests. Where Compliance with Law is not applicable, we and any relevant third parties have a legitimate interest in participating in, supporting, and following legal process and requests, including through co-operation with authorities. We and any relevant third parties may also have a legitimate interest of ensuring the protection, maintenance, and enforcement of our and their rights, property, and/or safety.",
      ],
      [
        "Data sharing in the context of corporate events",
        "Any and all data types relevant in the circumstances",
        "Legitimate Interests. We and any relevant third parties have a legitimate interest in providing information to relevant third parties who are involved in an actual or prospective corporate event (including to enable them to investigate – and, where relevant, to continue to operate – all or relevant part(s) of our operations). However, we would always look to take steps to minimize the amount and sensitivity of any personal information shared in these contexts where possible and appropriate.",
      ],
      [
        "To create aggregated, de-identified and/or anonymized data",
        "Any and all data types relevant in the circumstances",
        "Legitimate Interests. We have legitimate interest, and believe it is also in your interests, that we are able to take steps to ensure that our Services operate as intended.",
      ],
      [
        "Further uses",
        "Any and all data types relevant in the circumstances",
        "The original legal basis relied upon, if the relevant further use is compatible with the initial purpose for which the Personal Information was collected. Consent, if the relevant further use is not compatible with the initial purpose for which the personal information was collected.",
      ],
    ],
  ),
  subheading("Retention"),
  paragraph(
    "We retain personal information for as long as necessary to fulfil the purposes for which we collected it, including for the purposes of satisfying any legal, accounting, or reporting requirements, establishing or defending legal claims, or for Compliance and protection purposes.",
  ),
  paragraph(
    "To determine the appropriate retention period for personal information, we consider the amount, nature, and sensitivity of the personal information, the potential risk of harm from unauthorized use or disclosure of your personal information, the purposes for which we process your personal information and whether we can achieve those purposes through other means, and the applicable legal requirements.",
  ),
  paragraph(
    "When we no longer require the personal information we have collected about you, we will either delete or anonymize it or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible. If we anonymize your personal information (so that it can no longer be associated with you), we may use this information indefinitely without further notice to you.",
  ),
  subheading("Other info"),
  paragraph(
    "**No sensitive personal information.** The Service does not ask for sensitive personal information (e.g., social security numbers, information related to racial or ethnic origin, political opinions, religion or other beliefs, health, biometrics or genetic characteristics, criminal background or trade union membership). If you choose to include it in the collections and interactions you create, the questions you send or the messages in an eve session, you consent to our processing it in accordance with this Privacy Policy solely to provide the Service to you. If you do not consent, do not include it.",
  ),
  paragraph(
    "**No Automated Decision-Making and Profiling.** As part of the Service, we do not engage in automated decision-making and/or profiling, which produces legal or similarly significant effects.",
  ),
  subheading("Your rights"),
  paragraph(
    "**General.** European data protection laws give you certain rights regarding your personal information. If you are located in Europe, you may ask us to take the following actions in relation to your personal information that we hold:",
  ),
  bullets(
    "**Access.** Provide you with information about our processing of your personal information and give you access to your personal information.",
    "**Correct.** Update or correct inaccuracies in your personal information.",
    "**Delete.** Delete your personal information where there is no good reason for us continuing to process it – you also have the right to ask us to delete or remove your personal information where you have exercised your right to object to processing (see below).",
    "**Transfer.** Transfer a machine-readable copy of your personal information to you or a third party of your choice.",
    "**Restrict.** Restrict the processing of your personal information, for example if you want us to establish its accuracy or the reason for processing it.",
    "**Object.** Object to our processing of your personal information where we are relying on Legitimate Interests – you also have the right to object where we are processing your personal information for direct marketing purposes.",
    "**Withdraw Consent.** When we use your personal information based on your consent, you have the right to withdraw that consent at any time.",
  ),
  paragraph(
    `**Exercising These Rights.** You may submit these requests by email to ${emailLink}. We may request specific information from you to help us confirm your identity and process your request. Whether or not we are required to fulfill any request you make will depend on a number of factors (e.g., why and how we are processing your personal information), if we reject any request you may make (whether in whole or in part) we will let you know our grounds for doing so at the time, subject to any legal restrictions.`,
  ),
  paragraph(
    "**Your Right to Lodge a Complaint with your Supervisory Authority.** In addition to your rights outlined above, if you are not satisfied with our response to a request you make, or how we process your personal information, you can make a complaint to the data protection regulator in your habitual place of residence.",
  ),
  paragraph(
    "For users in the European Economic Area – the contact information for the data protection regulator in your place of residence can be found here: [https://www.edpb.europa.eu/about-edpb/our-members_en](https://www.edpb.europa.eu/about-edpb/our-members_en)",
  ),
  paragraph(
    "For users in the UK – the contact information for the UK data protection regulator is below:",
  ),
  paragraph(
    "The Information Commissioner's Office, Water Lane, Wycliffe House, Wilmslow – Cheshire SK9 5AF. Tel. +44 303 123 1113. Website: [https://ico.org.uk/make-a-complaint/](https://ico.org.uk/make-a-complaint/)",
  ),
  subheading("Data Processing outside Europe"),
  paragraph(
    "We are based in the U.S. and many of our service providers, advisers or other recipients of data are also based in the U.S. This means that, if you use the Service, your personal information will necessarily be accessed and processed in the U.S. It may also be provided to recipients in other countries outside Europe.",
  ),
  paragraph(
    "It is important to note that the U.S. is not the subject of a general 'adequacy decision' under the GDPR – the EU-U.S. Data Privacy Framework and its UK Extension cover only organizations certified under them, and we are not certified. Basically, this means that the U.S. legal regime is not considered by relevant European bodies to provide an adequate level of protection for personal information transferred to us, which is equivalent to that provided by relevant European laws.",
  ),
  paragraph(
    "Where we share your personal information with third parties who are based outside Europe, we try to ensure a similar degree of protection is afforded to it by making sure one of the following mechanisms is implemented:",
  ),
  paragraph(
    "**Transfers to territories with an adequacy decision.** We may transfer your personal information to countries or territories whose laws have been deemed to provide an adequate level of protection for personal information by the European Commission or UK Government (as and where applicable) (from time to time).",
  ),
  paragraph(
    "**Transfers to territories without an adequacy decision.** We may transfer your personal information to countries or territories whose laws have not been deemed to provide such an adequate level of protection (e.g., the U.S., see above). However, in these cases:",
  ),
  bullets(
    "we may use specific appropriate safeguards, which are designed to give personal information effectively the same protection it has in Europe – for example, standard-form contracts approved by relevant authorities for this purpose; or",
    "in limited circumstances, we may rely on an exception, or 'derogation', which permits us to transfer your personal information to such country despite the absence of an 'adequacy decision' or 'appropriate safeguards' – for example, reliance on your explicit consent to that transfer.",
  ),
  paragraph(
    `You may contact us if you want further information on the specific mechanism used by us when transferring your personal information out of Europe. You may have the right to receive a copy of the appropriate safeguards under which your personal information is transferred by contacting us at ${emailLink}.`,
  ),
];

export const privacyPage: ProsePage = {
  blocks: [
    paragraph(`Effective as of ${legalDate}.`),
    paragraph(
      `To view previous versions of this Privacy Policy, see its [history on GitHub](${siteConfig.repository}/commits/main/apps/web/src/lib/agent/site-pages.ts).`,
    ),
    paragraph(
      "**California Notice at Collection/State Privacy Rights Notice**: See the [State privacy rights notice](#state-privacy-rights-notice) section below for important information about your rights under applicable state privacy laws.",
    ),
    paragraph(
      `${operator} ("**${product}**," "**we**," "**us**" or "**our**") provides ${product}, a set of tools for mocking the responses of large language models (LLMs). This Privacy Policy describes how ${product} processes personal information that we collect through our digital or online properties or services that link to this Privacy Policy (including, as applicable, our website at ${siteHost}, its API and its hosted eve-protocol endpoints) and the other activities described in this Privacy Policy (collectively, the "**Service**").`,
    ),
    paragraph(
      '**Notice to European users**: Please see the [Notice to European users](#notice-to-european-users) section below for additional information for individuals located in the European Economic Area or United Kingdom (which we refer to as "**Europe**", and "**European**" should be understood accordingly).',
    ),
    paragraph(
      `You can download a printable copy of this Privacy Policy as plain text at [${siteConfig.url}/privacy.md](/privacy.md).`,
    ),
    paragraph("**Index**"),
    sectionIndex(privacySections),
    ...privacySections,
    generalLegalCredit,
  ],
  description: `How ${product} collects, uses and shares personal information, the choices you have about it, and the rights you may have under U.S. state and European privacy laws.`,
  heading: "Privacy Policy",
  path: "/privacy",
  sitemapPriority: 0.4,
  title: "Privacy Policy",
};

const termsSections: ProseBlock[] = [
  heading("1. Accounts"),
  paragraph(
    `1.1 **Creating an Account.** Some features of the Site may require you to register for an account. When you register, you agree to provide accurate and complete information and to keep that information current. You can delete your account at any time by emailing ${emailLink}, and you can delete your collections and interactions yourself from the dashboard. We may suspend or terminate your account as described in Section 8.`,
  ),
  paragraph(
    "1.2 **Account Security.** You are responsible for keeping your login credentials confidential and for all activity that occurs under your account. If you believe your account has been accessed without your authorization, please notify us immediately. We are not liable for any losses resulting from your failure to keep your credentials secure.",
  ),

  heading("2. Access to the Site"),
  paragraph(
    "2.1 **License.** Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Site for your own personal or internal business purposes.",
  ),
  paragraph(
    "2.2 **Restrictions.** You may not: (i) license, sell, rent, lease, transfer, assign, distribute, or commercially exploit the Site or any content on it; (ii) modify, create derivative works from, disassemble, reverse-compile, or reverse-engineer any part of the Site; (iii) access the Site in order to build a similar or competing product or service; or (iv) copy, reproduce, distribute, republish, download, display, post, or transmit any part of the Site except as expressly permitted by these Terms. All copyright and proprietary notices on the Site must be kept intact on any copies you are permitted to make.",
  ),
  paragraph(
    "2.3 **Changes to the Site.** We may modify, suspend, or discontinue the Site (or any part of it) at any time, with or without notice. We are not liable to you or any third party for any such modification, suspension, or discontinuation.",
  ),
  paragraph(
    "2.4 **No Support Obligation.** We have no obligation to provide you with support or maintenance for the Site.",
  ),
  paragraph(
    `2.5 **Ownership.** All intellectual property rights in the Site and its content – including copyrights, patents, trademarks, and trade secrets – belong to ${product} or its suppliers, except Your Content (Section 2.7). These Terms do not transfer any ownership rights to you, except for the limited access rights in Section 2.1. All rights not expressly granted are reserved.`,
  ),
  paragraph(
    "2.6 **Feedback.** If you share feedback or suggestions about the Site with us, you grant us a perpetual, irrevocable, worldwide, non-exclusive, fully-paid, royalty-free license to use that feedback freely, in any manner and for any purpose, without attribution. Please do not submit any feedback that you consider proprietary or confidential.",
  ),
  paragraph(
    `2.7 **Your Content.** You keep ownership of the collections and interactions you create on the Site and of anything else you submit to it, including the requests you send to its API ("**Your Content**"). You grant ${product} a worldwide, non-exclusive, royalty-free license to host, store, copy, process, transmit and display Your Content, including by sending its text to our embedding provider so that it can be matched, solely to operate and provide the Site to you and to serve each collection you make public to anyone who requests it. This license lasts for as long as Your Content is on the Site. Collections are private until you make them public, and anyone who has a public collection's id can read what it contains. You are responsible for Your Content, and you represent and warrant that you have all rights necessary to submit it and to grant this license, and that neither Your Content nor our use of it as these Terms permit will infringe or violate anyone's rights or any law.`,
  ),
  paragraph(
    "2.8 **Acceptable Use.** You may not: (i) use the Site to store, send or serve anything that is illegal, or that you do not have the right to use or share; (ii) send requests at a volume or in a manner that places an unreasonable load on the Site or the services it relies on, or attempt to get around any rate limit or other limit on the Site; or (iii) access, or attempt to access, accounts, private collections or other data that are not yours, or interfere with the security or operation of the Site.",
  ),
  paragraph(
    "2.9 **Public API.** The Site's API, including `POST /api/chat` and the eve-protocol endpoints under `/api/eve`, is documented at [/docs](/docs) and in [/openapi.json](/openapi.json), and its lorem and markdown requests need no account. As an exception to Section 2.2, you may call the API from the software, websites, tests and demos you build, including commercial ones, as long as you follow Section 2.8. Chat and eve requests are answered only from public collections, except that you can test your own private collections while you are signed in. We may limit, throttle or block requests, and we may change the API or stop offering it at any time, as described in Section 2.3.",
  ),
  paragraph(
    `2.10 **Open-Source Software.** The source code of ${product}, including the \`@loremllm/transport\` package, is published on [GitHub](${siteConfig.repository}) under the MIT License. Source code that we publish under an open-source license, such as the MIT License, is governed by that license, and nothing in these Terms limits your rights under it. These Terms govern the hosted Site.`,
  ),

  heading("3. Privacy"),
  paragraph(
    `Your use of the Site is also governed by our Privacy Policy, which is available at [${siteHost}/privacy](/privacy) and is incorporated into these Terms by reference. The Privacy Policy describes the types of personal data and other information we collect from you or your device, how we use that information, and the circumstances under which we may share it with third parties.`,
  ),
  paragraph(
    `3.1 **Processing of Personal Data.** By using the Site, you acknowledge that you have read and understand our Privacy Policy and that ${product} will process your personal data and other information in accordance with the Privacy Policy. If there is a conflict between these Terms and the Privacy Policy with respect to the collection, use, or processing of your personal data, the Privacy Policy will control.`,
  ),
  paragraph(
    '3.2 **Cookies and Tracking Technologies.** The Site may use cookies, web beacons, pixels, and similar tracking technologies ("**Tracking Technologies**") to collect information about your use of the Site. For details on what Tracking Technologies the Site uses, what information they collect, and how you can manage your preferences, please refer to the [Tracking & Other Technologies section of our Privacy Policy](/privacy#tracking--other-technologies).',
  ),

  heading("4. Indemnification"),
  paragraph(
    `You agree to defend, indemnify, and hold harmless ${product} and its officers, employees, and agents from any claims and reasonable costs or attorneys' fees arising out of (i) your use of the Site, (ii) your violation of these Terms, or (iii) your violation of any applicable law or regulation. We may assume control of the defense of any such claim at your expense, and you agree to cooperate with our defense. You agree not to settle any such claim without our prior written consent. We will make reasonable efforts to notify you promptly of any claim we become aware of.`,
  ),

  heading("5. Third-Party Services & Other Users"),
  paragraph(
    '5.1 **Third-Party Services.** The Site may include links to or integrations with third-party websites or services, such as sign-in with GitHub (collectively, "**Third-Party Services**"). We do not control, endorse, or take responsibility for any Third-Party Services. You use all Third-Party Services at your own risk, and you acknowledge and agree that the applicable third party\'s own terms and privacy practices will apply to such use.',
  ),
  paragraph(
    "5.2 **Other Users.** Your interactions with other users of the Site are solely between you and those users. We are not responsible for any loss or harm resulting from those interactions, and we reserve the right, but have no obligation, to get involved in disputes between users.",
  ),
  paragraph(
    `5.3 **Release.** To the fullest extent permitted by law, you release ${product} and its officers, employees, agents, successors, and assigns from all claims, demands, and damages of any kind arising out of or related to the Site, other users, or Third-Party Services. If you are a California resident, you waive California Civil Code Section 1542, which provides: "A general release does not extend to claims which the creditor or releasing party does not know or suspect to exist in his or her favor at the time of executing the release, which if known by him or her must have materially affected his or her settlement with the debtor or released party."`,
  ),

  heading("6. Disclaimers"),
  paragraph(
    `THE SITE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE FULLEST EXTENT PERMITTED BY LAW, ${productCaps} AND ITS SUPPLIERS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR HARMFUL CODE. WHERE APPLICABLE LAW REQUIRES WARRANTIES, THEY ARE LIMITED TO 90 DAYS FROM YOUR FIRST USE.`,
  ),
  paragraph(
    "THE SITE'S RESPONSES ARE OUTPUTS STORED IN A COLLECTION AND CHOSEN BY TEXT SIMILARITY, MARKDOWN YOU SUPPLY, OR GENERATED LOREM IPSUM. NONE IS WRITTEN BY A LANGUAGE MODEL, AND WE DO NOT WARRANT THAT ANY RESPONSE IS ACCURATE, MATCHES THE REQUEST IT ANSWERS, OR IS FIT FOR ANY PURPOSE. WE DO NOT GUARANTEE THAT YOUR CONTENT WILL BE PRESERVED, SO KEEP YOUR OWN COPIES OF ANYTHING YOU STORE ON THE SITE.",
  ),

  heading("7. Limitation of Liability"),
  paragraph(
    `TO THE MAXIMUM EXTENT PERMITTED BY LAW: (A) ${productCaps} AND ITS SUPPLIERS WILL NOT BE LIABLE FOR ANY LOST PROFITS, LOST DATA, COSTS OF SUBSTITUTE PRODUCTS, OR ANY INDIRECT, CONSEQUENTIAL, INCIDENTAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES ARISING FROM OR RELATED TO THESE TERMS OR YOUR USE OF (OR INABILITY TO USE) THE SITE; AND (B) OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING UNDER THESE TERMS IS CAPPED AT THE GREATER OF (i) $50 USD AND (ii) THE AMOUNT PAID TO ${productCaps} BY YOU UNDER THESE TERMS IN THE SIX MONTHS PRIOR TO THE INCIDENT GIVING RISE TO THE CLAIM. THE EXISTENCE OF MULTIPLE CLAIMS DOES NOT INCREASE THIS CAP.`,
  ),

  heading("8. Term and Termination"),
  paragraph(
    "These Terms remain in effect while you use the Site. We may suspend or terminate your access (including suspending access to or deleting your account) at any time and for any reason, including if we believe you have violated these Terms. We are not liable to you for any such termination. Upon termination, Sections 2.2 through 2.7 and Sections 3 through 11 will survive.",
  ),

  heading("9. State-Specific Legal Notices"),
  paragraph(
    "The provisions in this Section 9 apply only to users to the extent such users are subject to the laws of the applicable states identified below. If a provision in this section conflicts with another provision of these Terms, the state-specific provision controls for users subject to that state's laws.",
  ),
  paragraph(
    `9.1 **California.** If you are a California resident, you may report complaints to the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs, at 1625 N. Market Blvd. Suite N112, Sacramento, CA 95834, or by phone at (800) 952-5210. Under California Civil Code Section 1789.3, California users of the Site are entitled to the following specific consumer rights notice: The provider of the Site is ${operator}. To file a complaint regarding the Site, or to receive further information regarding use of the Site, contact us at ${emailLink}. You may also contact the Complaint Assistance Unit at the address and phone number above. If you are a California resident, you may have additional rights under the California Consumer Privacy Act (as amended by the California Privacy Rights Act), including the right to know what personal information we collect, the right to delete your personal information, the right to correct inaccurate personal information, and the right to opt out of the sale or sharing of your personal information. For details on how to exercise these rights, please see our Privacy Policy at [${siteHost}/privacy](/privacy).`,
  ),
  paragraph(
    "9.2 **Colorado.** If you are a Colorado resident, you may have additional rights under the Colorado Privacy Act (CPA), including the right to opt out of the processing of your personal data for purposes of targeted advertising, the sale of personal data, and certain profiling. For details, please see our Privacy Policy.",
  ),
  paragraph(
    "9.3 **Connecticut.** If you are a Connecticut resident, you may have additional rights under the Connecticut Data Privacy Act (CTDPA), including rights of access, correction, deletion, and data portability, as well as the right to opt out of the sale of personal data, targeted advertising, and profiling. For details, please see our Privacy Policy.",
  ),
  paragraph(
    "9.4 **Virginia.** If you are a Virginia resident, you may have additional rights under the Virginia Consumer Data Protection Act (VCDPA), including the right to access, correct, delete, and obtain a copy of your personal data, and the right to opt out of the processing of your personal data for targeted advertising, sale, or profiling. For details, please see our Privacy Policy.",
  ),
  paragraph(
    `9.5 **Nevada.** If you are a Nevada resident, you have the right under Nevada Revised Statutes Chapter 603A to direct us not to sell certain information we have collected or will collect about you. To exercise this right, please contact us at ${emailLink}.`,
  ),
  paragraph(
    "9.6 **Other States.** If you are a resident of another U.S. state with a comprehensive consumer privacy law, such as Texas, Oregon, Montana, Utah, Iowa, Indiana or Tennessee, you may have similar rights under that law. For details, please see our Privacy Policy.",
  ),

  heading("10. General"),
  paragraph(
    "10.1 **Changes to Terms.** We may update these Terms from time to time. If we make material changes, we may notify you by email (at the address on file) or by a prominent notice on the Site. Your continued use of the Site after notice of changes means you accept the updated Terms.",
  ),
  paragraph(
    `10.2 **Governing Law.** These Terms and any dispute arising out of or related to these Terms or the Site will be governed by and construed in accordance with the laws of the State of California, without regard to its conflict-of-law principles. For any claim or dispute not subject to the arbitration provisions in Section 11, you and ${product} irrevocably consent to the exclusive jurisdiction and venue of the state and federal courts located in San Francisco County, California. Notwithstanding the foregoing: (a) either party may bring an action in any court of competent jurisdiction for injunctive or other equitable relief to protect its intellectual property rights (including patents, copyrights, trademarks, and trade secrets); and (b) either party may bring an individual action in small claims court for claims within that court's jurisdictional limits.`,
  ),
  paragraph(
    "10.3 **Export.** You agree not to export, re-export, or transfer any technical data or products acquired from the Site in violation of U.S. export control laws or applicable regulations in other countries.",
  ),
  paragraph(
    "10.4 **Electronic Communications.** By using the Site, you consent to receiving communications from us electronically (by email or notices posted on the Site). These electronic communications satisfy any legal requirement for written notice.",
  ),
  paragraph(
    `10.5 **Accessibility.** ${product} is committed to making the Site accessible to all users, including individuals with disabilities. We endeavor to conform to the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA, as published by the World Wide Web Consortium (W3C). If you experience any difficulty accessing or navigating the Site, or if you have suggestions for improving accessibility, please contact us at ${emailLink}. We will make reasonable efforts to address accessibility concerns promptly.`,
  ),
  paragraph(
    `10.6 **Entire Agreement.** These Terms (together with the Privacy Policy and any other policies or guidelines referenced herein) are the entire agreement between you and ${product} regarding your use of the Site. If any provision of these Terms is found to be invalid or unenforceable, it will be modified to the minimum extent necessary to be valid, and the remaining provisions will continue in effect. Our failure to enforce any provision is not a waiver of that provision. The word "including" means "including without limitation." You may not assign these Terms without our prior written consent; we may assign them freely. These Terms bind any permitted assignees.`,
  ),
  paragraph(
    `10.7 **Copyright/Trademark.** Copyright © 2026 ${operator}. All rights reserved. All trademarks, logos, and service marks displayed on the Site are owned by ${product} or third parties. You may not use any of them without prior written consent from the owner. Open-source code is licensed as described in Section 2.10.`,
  ),
  paragraph(`10.8 **Contact Information:** ${emailLink}`),

  heading("11. Dispute Resolution"),
  paragraph(
    "**Please read this section carefully. It affects your legal rights, including your right to sue in court and your right to a jury trial.**",
  ),
  paragraph(
    `11.1 **Applicability.** Except as described below, you and ${product} agree to resolve all disputes arising out of or relating to the Site, its services, or these Terms through binding individual arbitration – not in court. Exceptions include: (i) claims that qualify for small claims court, brought on an individual basis; and (ii) requests for equitable relief related to intellectual property (such as trademarks, trade secrets, or copyrights). This arbitration agreement applies to all claims, including those that arose before you agreed to these Terms.`,
  ),
  paragraph(
    `11.2 **Try to Resolve First.** Before starting arbitration, the parties agree to try to resolve the dispute informally. The party raising the dispute must send written notice (an "Informal Notice") to the other party. Within 45 days of receiving that Informal Notice, the parties will meet by phone or video in good faith to try to work things out. Our notice address is ${emailLink}. If the informal dispute resolution process doesn't resolve the dispute within 60 days, either party may start arbitration.`,
  ),
  paragraph(
    "11.3 **Arbitration Rules.** Arbitrations will be administered by JAMS (www.jamsadr.com). Claims under $250,000 (excluding fees and interest) will use JAMS' Streamlined Arbitration Rules; larger claims will use JAMS' Comprehensive Arbitration Rules. Unless the parties agree otherwise, arbitration will be conducted in the county where you live. All arbitration materials and documents are confidential.",
  ),
  paragraph(
    "11.4 **Arbitration Request.** The arbitration request must include: (i) your contact information and account username (if applicable); (ii) a description of the claims and supporting facts; (iii) the relief you're seeking and a good-faith damages estimate; (iv) confirmation that you completed the informal resolution process; and (v) proof of any required filing fee payment.",
  ),
  paragraph(
    "11.5 **Authority of Arbitrator.** The arbitrator has authority to resolve all arbitrable disputes, including questions about the scope and enforceability of this arbitration agreement – except that courts (not arbitrators) will decide: (i) challenges to the class action waiver below; (ii) disputes about arbitration fees; (iii) whether a condition precedent to arbitration has been satisfied; and (iv) which version of this agreement applies. The arbitrator may award the same relief as a court, but on an individual basis only. The arbitrator's award is final and binding, and judgment may be entered in any court with jurisdiction.",
  ),
  paragraph(
    `11.6 **Waiver of Jury Trial.** BY AGREEING TO ARBITRATION, YOU AND ${productCaps} WAIVE THE RIGHT TO A TRIAL BY JUDGE OR JURY FOR ALL COVERED CLAIMS.`,
  ),
  paragraph(
    `11.7 **Waiver of Class Actions.** ALL DISPUTES MUST BE BROUGHT ON AN INDIVIDUAL BASIS. NEITHER YOU NOR ${productCaps} MAY BRING CLAIMS AS A PLAINTIFF OR CLASS MEMBER IN ANY CLASS, REPRESENTATIVE, OR COLLECTIVE PROCEEDING. The arbitrator may only award relief on an individual basis. If a court finds this class action waiver unenforceable as to a specific claim, that claim may be litigated in state or federal court in San Francisco County, California; all other claims remain subject to arbitration.`,
  ),
  paragraph(
    "11.8 **Attorneys' Fees.** Each party bears its own attorneys' fees unless the arbitrator finds a claim was frivolous or brought for an improper purpose.",
  ),
  paragraph(
    `11.9 **Batch Arbitration.** If 100 or more substantially similar arbitration demands are filed against ${product} within a 30-day period by the same law firm or coordinated group, JAMS will batch them into groups of 100 and appoint one arbitrator per batch, with one set of fees per batch.`,
  ),
  paragraph(
    `11.10 **Opt-Out.** You may opt out of this arbitration agreement within 30 days of first accepting these Terms by sending written notice to ${emailLink}. Your notice must include your name, the email address you use with the Site, and a clear statement that you wish to opt out. Opting out does not affect any other part of these Terms.`,
  ),
  paragraph(
    "11.11 **Severability.** If any part of this arbitration agreement is found invalid, it will be modified to the minimum extent necessary to make it enforceable; the rest of the agreement remains in effect.",
  ),
];

export const termsPage: ProsePage = {
  blocks: [
    paragraph(`**Version 1.0 Last revised:** ${legalDate}`),
    paragraph(
      `The website located at ${siteHost}, together with the API and eve-protocol endpoints it serves (collectively, the "**Site**"), is owned and operated by ${operator} ("**${product}**," "**us**," "**our**," or "**we**"). Certain features of the Site may be subject to additional guidelines or rules posted on the Site, which are incorporated by reference into these Terms.`,
    ),
    paragraph(
      'These Terms of Use ("**Terms**") govern your use of the Site. By accessing or using the Site, or by clicking "I agree" (or a similar button or checkbox) when that option is presented to you, you agree to these Terms on behalf of yourself or the entity you represent, and you confirm that you have the authority to do so. You must be at least 18 years old to use the Site. If you do not agree to these Terms, please do not use the Site.',
    ),
    paragraph(
      "**IMPORTANT – PLEASE READ SECTION 11 CAREFULLY.** It contains an agreement to resolve disputes through binding individual arbitration instead of in court, and includes a waiver of class action rights and jury trial rights. You have 30 days to opt out of the arbitration agreement, as further described in Section 11.",
    ),
    ...termsSections,
    generalLegalCredit,
  ],
  description: `The terms that govern your use of ${product} and its API: accounts, your content, acceptable use, open-source code, disclaimers and binding arbitration.`,
  heading: "Terms of Use",
  path: "/terms",
  sitemapPriority: 0.4,
  title: "Terms of Use",
};

/** Prose pages, in the order they should appear in a sitemap or llms.txt. */
export const prosePages: ProsePage[] = [docsPage, aboutPage, contactPage, privacyPage, termsPage];

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
