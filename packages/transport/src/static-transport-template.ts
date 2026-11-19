import type { UIMessage } from "ai";

const INDENT = "  ";

const formatYield = (part: UIMessage["parts"][number], indent: string) => {
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

export const buildStaticTransportTemplate = <UI_MESSAGE extends UIMessage = UIMessage>(
  messages: UI_MESSAGE[],
) => {
  const allParts: UI_MESSAGE["parts"][number][] = [];

  for (const message of messages) {
    const parts = Array.isArray(message.parts) ? message.parts : [];

    const reconstructedParts: UI_MESSAGE["parts"][number][] = [];

    for (const part of parts) {
      const isToolPart = part.type.startsWith("tool-") || part.type === "dynamic-tool";

      if (isToolPart) {
        const toolPart = part as {
          type: `tool-${string}` | "dynamic-tool";
          toolCallId: string;
          toolName?: string;
          state?: string;
          input?: unknown;
          output?: unknown;
          errorText?: string;
        };

        if (
          (toolPart.state === "output-available" || toolPart.state === "output-error") &&
          toolPart.input !== undefined
        ) {
          const inputPart = (
            toolPart.type === "dynamic-tool" && toolPart.toolName
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
                }
          ) as UI_MESSAGE["parts"][number];

          reconstructedParts.push(inputPart);
        }
      }

      reconstructedParts.push(part);
    }

    allParts.push(...reconstructedParts);
  }

  const indent = INDENT.repeat(2);

  const formattedParts = allParts.flatMap((part, index) => {
    const formatted = formatYield(part, indent);

    return index < allParts.length - 1 ? [...formatted, ""] : formatted;
  });

  const partsSection = formattedParts.join("\n");

  return `import { StaticChatTransport } from "@loremllm/transport";

export const transport = new StaticChatTransport({
  chunkDelayMs: [50, 100],
  async *mockResponse() {
${partsSection}
  },
});
`;
};
