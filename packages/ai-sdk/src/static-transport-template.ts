import type { UIMessage } from "ai";

import { parseToolPart } from "./shared.ts";

const INDENT = "  ";

interface ToolInputPart {
  input: unknown;
  state: "input-available";
  toolCallId: string;
  toolName?: string;
  type: string;
}

type TemplatePart = UIMessage["parts"][number] | ToolInputPart;

const formatYield = (part: TemplatePart, indent: string) => {
  const json = JSON.stringify(part, null, 2);

  if (!json) {
    return [`${indent}yield {};`];
  }

  const lines = json.split("\n");
  const formatted: string[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    if (lineIndex === 0) {
      formatted.push(`${indent}yield ${line}`);
    } else if (lineIndex === lines.length - 1) {
      formatted.push(`${indent}${line};`);
    } else {
      formatted.push(`${indent}${line}`);
    }
  }

  return formatted;
};

export const buildStaticTransportTemplate = (messages: readonly UIMessage[]) => {
  const allParts: TemplatePart[] = [];

  for (const message of messages) {
    const parts = Array.isArray(message.parts) ? message.parts : [];

    for (const part of parts) {
      const isToolPart = part.type.startsWith("tool-") || part.type === "dynamic-tool";

      if (isToolPart) {
        const toolPart = parseToolPart(part);

        if (
          (toolPart.state === "output-available" || toolPart.state === "output-error") &&
          toolPart.input !== undefined
        ) {
          allParts.push(
            toolPart.type === "dynamic-tool" &&
              toolPart.toolName !== undefined &&
              toolPart.toolName !== ""
              ? {
                  input: toolPart.input,
                  state: "input-available",
                  toolCallId: toolPart.toolCallId,
                  toolName: toolPart.toolName,
                  type: toolPart.type,
                }
              : {
                  input: toolPart.input,
                  state: "input-available",
                  toolCallId: toolPart.toolCallId,
                  type: toolPart.type,
                },
          );
        }
      }

      allParts.push(part);
    }
  }

  const indent = INDENT.repeat(2);

  const formattedParts = allParts.flatMap((part, index) => {
    const formatted = formatYield(part, indent);

    return index < allParts.length - 1 ? [...formatted, ""] : formatted;
  });

  const partsSection = formattedParts.join("\n");

  return `import { StaticChatTransport } from "@loremllm/ai-sdk";

export const transport = new StaticChatTransport({
  chunkDelayMs: [50, 100],
  async *mockResponse() {
${partsSection}
  },
});
`;
};
