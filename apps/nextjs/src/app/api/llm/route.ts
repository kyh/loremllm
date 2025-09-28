import { simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { z } from "zod";

import type { LanguageModelV2StreamPart } from "@ai-sdk/provider";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z
    .union([
      z.string(),
      z.array(
        z.object({
          type: z.string(),
          text: z.string().optional(),
          data: z.unknown().optional(),
        }),
      ),
      z.record(z.string(), z.unknown()),
    ])
    .optional(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1),
});

type IncomingMessage = z.infer<typeof messageSchema>;

type LoremCategory = "person" | "company" | "generic";

const PERSON_RESPONSES: ((subject: string) => string)[] = [
  (subject) => `## Vitae Snapshot: ${subject}

**Role:** Protagonista Lorem Ipsum

- Curated origin story in *Lorem City* with vitae condimentum sem.
- Built a reputation for vel facilisis leadership across tempus ligula initiatives.
- Advocates for markdown-driven storytelling with fusce habitant morbi tristique.

> "${subject} semper tincidunt lorem, curabitur aliquet magna in urna pulvinar euismod."`,
  (subject) => `### ${subject} — Markdown Bio

1. **Background:** Natoque penatibus et magnis dis parturient montes nascetur ridiculus mus.
2. **Focus Areas:** Pellentesque habitant morbi tristique senectus et netus.
3. **Signature Move:** Vivamus pharetra dui sit amet risus malesuada, ac posuere nibh porta.

**Fun Fact:** ${subject} collects speculative footnotes about imaginary conferences.`,
  (subject) => `# Portrait of ${subject}

> In hac habitasse platea dictumst, ${subject} orchestrates lorem ipsum symphonies.

| Trait | Detail |
| --- | --- |
| Vision | Morbi tincidunt augue interdum velit euismod |
| Motto | "Markdown omnia vincit" |
| Favorite Snack | Cras fermentum odio eu feugiat pretium |

Curabitur aliquet quam id dui posuere blandit. Pellentesque in ipsum id orci porta dapibus.`,
];

const COMPANY_RESPONSES: ((subject: string) => string)[] = [
  (subject) => `## ${subject} Labs

- **Mission:** Deliver ultricies mi eget mauris pharetra et ultrices posuere.
- **Flagship Product:** A dolor bibendum fringilla codenamed \`Project Ipsum\`.
- **Operating Principles:**
  - Markdown-first proposals
  - Quarterly lorem sprints
  - Customer love expressed via bullet lists

> ${subject} believes every roadmap deserves elegantly formatted filler text.`,
  (subject) => `# Company Brief — ${subject}

| Pillar | Description |
| --- | --- |
| Foundation | Vestibulum ante ipsum primis in faucibus orci luctus |
| Culture | Nulla porttitor accumsan tincidunt |
| Strategy | Etiam porta sem malesuada magna mollis |

**Latest Update:** Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh.`,
  (subject) => `### ${subject} Overview

${subject} crafts imaginative lorem ipsum platforms for enterprises seeking playful prototypes.

1. Incorporated during a caffeinated hackathon.
2. Scales via markdown playbooks and pseudo analytics.
3. Sponsors the annual *Ipsum Expo* with vel fringilla est ullamcorper eget nulla facilisi etiam.

**Roadmap:** Aliquam a augue suscipit, luctus neque in, fermentum lorem.`,
];

const GENERIC_RESPONSES: ((subject: string) => string)[] = [
  (subject) => `## Thought Bubble

You asked about: _${subject}_.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam id dolor id nibh ultricies vehicula ut id elit. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.

- Ut fermentum massa justo sit amet risus.
- Sed posuere consectetur est at lobortis.
- Aenean lacinia bibendum nulla sed consectetur.

> Markdown keeps the musings tidy, even when the ideas are pure filler.`,
  (subject) => `# General Notes

**Prompt:** ${subject}

Pellentesque ornare sem lacinia quam venenatis vestibulum. Cras mattis consectetur purus sit amet fermentum. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.

| Column | Placeholder |
| --- | --- |
| Alpha | Etiam porta sem malesuada |
| Beta | Maecenas faucibus mollis interdum |

Curabitur blandit tempus porttitor.`,
  (subject) => `### Quick Lorem Digest

- **Topic:** ${subject}
- **Status:** Thoroughly ipsumed
- **Next Steps:** Continue exploring markdown driven creativity

Suspendisse potenti. Aenean lacinia bibendum nulla sed consectetur. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.

> Filler today, inspiration tomorrow.`,
];

const chunkText = (text: string) => {
  const maxChunkLength = 60;
  const words = text.split(/(\s+)/);
  const chunks: string[] = [];
  let buffer = "";

  for (const word of words) {
    if ((buffer + word).length > maxChunkLength) {
      if (buffer.length > 0) {
        chunks.push(buffer);
        buffer = "";
      }
    }

    buffer += word;
  }

  if (buffer.length > 0) {
    chunks.push(buffer);
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
};

const flattenContentToText = (content: IncomingMessage["content"]) => {
  if (content === undefined) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (typeof part === "object" && part !== null) {
          if (typeof part.text === "string") {
            return part.text;
          }
          if (typeof part.data === "string") {
            return part.data;
          }
          return JSON.stringify(part.data ?? "");
        }
        return "";
      })
      .join(" ");
  }

  if (typeof content === "object" && content !== null) {
    const maybeText = (content as { text?: unknown }).text;
    if (typeof maybeText === "string") {
      return maybeText;
    }

    return JSON.stringify(content);
  }

  return String(content);
};

const deriveSubject = (prompt: string) => {
  const cleaned = prompt
    .replace(
      /^(tell me about|who is|who was|what is|describe|give me|explain)\s+/i,
      "",
    )
    .trim();

  if (!cleaned.length) {
    return "Lorem Ipsum";
  }

  const normalized = cleaned.replace(/\s+/g, " ");
  return normalized.length > 60 ? `${normalized.slice(0, 57)}…` : normalized;
};

const categorizePrompt = (prompt: string): LoremCategory => {
  const lower = prompt.toLowerCase();

  if (/(who|person|biography|profile|individual|speaker|author)/.test(lower)) {
    return "person";
  }

  if (
    /(company|startup|business|organization|corporation|firm|enterprise|team)/.test(
      lower,
    )
  ) {
    return "company";
  }

  return "generic";
};

const pickResponse = (category: LoremCategory, subject: string) => {
  const catalog =
    category === "person"
      ? PERSON_RESPONSES
      : category === "company"
        ? COMPANY_RESPONSES
        : GENERIC_RESPONSES;

  const fallback = (target: string) => `### Lorem Ipsum Response

Prompt: ${target}

Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec sed odio dui.`;

  const template =
    catalog[Math.floor(Math.random() * catalog.length)] ?? fallback;
  return template(subject);
};

export const maxDuration = 30;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    json = undefined;
  }

  const parseResult = requestSchema.safeParse(json);

  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request payload",
        details: parseResult.error.flatten(),
      }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const { messages } = parseResult.data;
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const prompt = lastUserMessage
    ? flattenContentToText(lastUserMessage.content).trim()
    : "";

  const subject = deriveSubject(prompt || "Generic Query");
  const category = categorizePrompt(prompt || "");
  const loremResponse = pickResponse(category, subject);

  const deltaChunks = chunkText(loremResponse);

  const streamChunks: LanguageModelV2StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "text-1" },
    ...deltaChunks.map<LanguageModelV2StreamPart>((delta) => ({
      type: "text-delta",
      id: "text-1",
      delta,
    })),
    { type: "text-end", id: "text-1" },
    {
      type: "finish",
      finishReason: "stop",
      usage: {
        inputTokens: prompt.length
          ? Math.max(1, Math.ceil(prompt.length / 4))
          : 0,
        outputTokens: Math.max(1, Math.ceil(loremResponse.length / 4)),
        totalTokens: Math.max(
          1,
          Math.ceil((prompt.length + loremResponse.length) / 4),
        ),
        reasoningTokens: undefined,
        cachedInputTokens: undefined,
      },
      providerMetadata: {
        lorem: { category, subject },
      },
    },
  ];

  const model = new MockLanguageModelV2({
    doStream: async () => ({
      stream: simulateReadableStream({ chunks: streamChunks }),
    }),
  });

  const result = streamText({
    model,
    prompt: prompt || "Generate a markdown lorem ipsum response.",
  });

  return result.toUIMessageStreamResponse();
}
